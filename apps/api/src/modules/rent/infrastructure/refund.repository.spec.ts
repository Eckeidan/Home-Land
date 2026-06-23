import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { RentRepository } from "./rent.repository.js";

const input = {
  organizationId: "org",
  actorUserId: "accountant",
  paymentId: "payment",
  reason: "Duplicate",
  refundedAt: new Date("2026-06-22T20:00:00Z"),
  allocations: [{ paymentAllocationId: "allocation", amountMinor: 50000 }],
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "correlation",
};
function tx() {
  const obligation = {
    id: "obligation",
    amountMinor: 125000,
    version: 2n,
    allocations: [{ id: "allocation", amountMinor: 125000, refundAllocations: [] }],
  };
  return {
    membership: {
      findFirst: vi
        .fn()
        .mockResolvedValue({ role: "ACCOUNTANT", organization: { status: "ACTIVE" } }),
    },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    payment: {
      findFirst: vi.fn().mockResolvedValue({
        id: "payment",
        allocations: [
          {
            id: "allocation",
            amountMinor: 125000,
            refundAllocations: [],
            rentObligation: obligation,
          },
        ],
      }),
    },
    refund: { create: vi.fn().mockResolvedValue({ id: "refund" }) },
    refundAllocation: { createMany: vi.fn() },
    rentObligation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    ledgerTransaction: { create: vi.fn().mockResolvedValue({ id: "ledger" }) },
    ledgerEntry: { createMany: vi.fn() },
    reconciliationItem: {
      create: vi.fn().mockResolvedValue({ id: "queue" }),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
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
describe("Refund reversing transaction", () => {
  it("posts inverse entries and reopens the obligation partially", async () => {
    const transaction = tx();
    await expect(repository(transaction).recordRefund(input)).resolves.toMatchObject({
      kind: "created",
      response: { amountMinor: 50000, ledgerBalanced: true, reconciliationItemId: "queue" },
    });
    expect(transaction.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "RENT_RECEIVABLE",
          direction: "DEBIT",
          amountMinor: 50000,
        },
        {
          organizationId: "org",
          transactionId: "ledger",
          accountCode: "CASH",
          direction: "CREDIT",
          amountMinor: 50000,
        },
      ],
    });
    expect(transaction.rentObligation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PARTIALLY_PAID" }) }),
    );
    expect(transaction.reconciliationItem.create).toHaveBeenCalledOnce();
  });
  it("rejects refund above the original allocation", async () => {
    const transaction = tx();
    transaction.payment.findFirst.mockResolvedValue({
      id: "payment",
      allocations: [
        {
          id: "allocation",
          amountMinor: 50000,
          refundAllocations: [{ amountMinor: 10000 }],
          rentObligation: { id: "obligation", amountMinor: 125000, version: 2n, allocations: [] },
        },
      ],
    });
    await expect(repository(transaction).recordRefund(input)).resolves.toEqual({
      kind: "allocation_invalid",
    });
    expect(transaction.refund.create).not.toHaveBeenCalled();
  });
  it("resolves a queue item with optimistic concurrency", async () => {
    const transaction = tx();
    transaction.reconciliationItem.findFirst.mockResolvedValue({ status: "OPEN", version: 1n });
    transaction.reconciliationItem.updateMany.mockResolvedValue({ count: 1 });
    await expect(
      repository(transaction).resolveReconciliation({
        organizationId: "org",
        actorUserId: "accountant",
        itemId: "item",
        expectedVersion: 1,
        correlationId: "correlation",
      }),
    ).resolves.toEqual({
      kind: "resolved",
      response: { id: "item", status: "RESOLVED", version: 2 },
    });
    expect(transaction.reconciliationItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "RESOLVED", resolvedById: "accountant" }),
      }),
    );
  });
});
