import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { RentRepository } from "./rent.repository.js";

const input = {
  organizationId: "org",
  actorUserId: "accountant",
  method: "ACH" as const,
  receivedAt: new Date("2026-06-22T20:00:00Z"),
  allocations: [{ rentObligationId: "obligation", amountMinor: 125000 }],
  receiptNumber: "RCP-TEST",
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "correlation",
};
function tx(member: object | null = { role: "ACCOUNTANT", organization: { status: "ACTIVE" } }) {
  return {
    membership: { findFirst: vi.fn().mockResolvedValue(member) },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    rentObligation: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "obligation",
          amountMinor: 125000,
          version: 1n,
          lease: { tenantProfileId: "tenant" },
          allocations: [],
        },
      ]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    payment: { create: vi.fn().mockResolvedValue({ id: "payment", createdAt: new Date() }) },
    paymentAllocation: { createMany: vi.fn() },
    ledgerTransaction: { create: vi.fn().mockResolvedValue({ id: "ledger" }) },
    ledgerEntry: { createMany: vi.fn() },
    receipt: {
      create: vi.fn().mockResolvedValue({
        id: "receipt",
        receiptNumber: "RCP-TEST",
        issuedAt: new Date("2026-06-22T20:00:01Z"),
      }),
    },
    reconciliationItem: { create: vi.fn().mockResolvedValue({ id: "reconciliation" }) },
    auditEvent: { create: vi.fn() },
    outboxMessage: { create: vi.fn() },
  };
}
function repository(transaction: ReturnType<typeof tx>) {
  return new RentRepository({
    $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    idempotencyRecord: transaction.idempotencyRecord,
  } as unknown as DatabaseClient);
}
describe("Payment allocation transaction", () => {
  it("posts payment, allocation, balanced ledger and receipt atomically", async () => {
    const transaction = tx();
    await expect(repository(transaction).recordPayment(input)).resolves.toMatchObject({
      kind: "created",
      response: {
        amountMinor: 125000,
        ledgerBalanced: true,
        receipt: { receiptNumber: "RCP-TEST" },
      },
    });
    expect(transaction.rentObligation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) }),
    );
    expect(transaction.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "CASH",
          direction: "DEBIT",
          amountMinor: 125000,
        },
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "RENT_RECEIVABLE",
          direction: "CREDIT",
          amountMinor: 125000,
        },
      ],
    });
    expect(transaction.receipt.create).toHaveBeenCalledOnce();
    expect(transaction.idempotencyRecord.create).toHaveBeenCalledOnce();
  });
  it("rejects over-allocation before creating payment evidence", async () => {
    const transaction = tx();
    transaction.rentObligation.findMany.mockResolvedValue([
      {
        id: "obligation",
        amountMinor: 100000,
        version: 1n,
        lease: { tenantProfileId: "tenant" },
        allocations: [{ amountMinor: 1000 }],
      },
    ]);
    await expect(repository(transaction).recordPayment(input)).resolves.toEqual({
      kind: "allocation_invalid",
    });
    expect(transaction.payment.create).not.toHaveBeenCalled();
  });
  it("writes nothing for a cross-tenant actor", async () => {
    const transaction = tx(null);
    await expect(repository(transaction).recordPayment(input)).resolves.toEqual({
      kind: "not_found",
    });
    expect(transaction.payment.create).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
});
