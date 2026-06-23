import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { StripeRepository } from "./stripe.repository.js";

function transaction() {
  return {
    stripeWebhookEvent: { create: vi.fn().mockResolvedValue({ id: "event" }), update: vi.fn() },
    stripePaymentIntent: {
      findUnique: vi.fn().mockResolvedValue({
        id: "intent",
        organizationId: "org",
        tenantProfileId: "tenant",
        paymentId: null,
        amountMinor: 100000,
        status: "PROCESSING",
        allocations: [
          {
            rentObligationId: "obligation",
            amountMinor: 100000,
            rentObligation: { amountMinor: 100000, version: 1n, allocations: [] },
          },
        ],
      }),
      update: vi.fn(),
    },
    payment: { create: vi.fn().mockResolvedValue({ id: "payment" }) },
    paymentAllocation: { createMany: vi.fn() },
    rentObligation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    ledgerTransaction: { create: vi.fn().mockResolvedValue({ id: "ledger" }) },
    ledgerEntry: { createMany: vi.fn() },
    receipt: { create: vi.fn() },
    reconciliationItem: { create: vi.fn() },
    auditEvent: { create: vi.fn() },
  };
}
describe("StripeRepository webhook reconciliation", () => {
  it("automatically allocates a succeeded intent and balances the ledger", async () => {
    const tx = transaction();
    const repository = new StripeRepository({
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as DatabaseClient);
    await expect(
      repository.processWebhook({
        eventId: "evt_1",
        eventType: "payment_intent.succeeded",
        stripePaymentIntentId: "pi_1",
        payloadHash: new Uint8Array([1]),
        correlationId: "correlation",
      }),
    ).resolves.toEqual({ kind: "processed", automaticallyAllocated: true });
    expect(tx.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "CASH",
          direction: "DEBIT",
          amountMinor: 100000,
        },
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "RENT_RECEIVABLE",
          direction: "CREDIT",
          amountMinor: 100000,
        },
      ],
    });
    expect(tx.reconciliationItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: "RESOLVED", resolvedAt: expect.any(Date) }),
    });
    expect(tx.stripePaymentIntent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SUCCEEDED", paymentId: "payment" }),
      }),
    );
  });
  it("treats duplicate provider event IDs as successful replay", async () => {
    const database = { $transaction: vi.fn().mockRejectedValue({ code: "P2002" }) };
    const repository = new StripeRepository(database as unknown as DatabaseClient);
    await expect(
      repository.processWebhook({
        eventId: "evt_same",
        eventType: "payment_intent.succeeded",
        stripePaymentIntentId: "pi_1",
        payloadHash: new Uint8Array([1]),
        correlationId: "correlation",
      }),
    ).resolves.toEqual({ kind: "replayed" });
  });
});
