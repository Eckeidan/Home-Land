import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { RentRepository } from "./rent.repository.js";

const input = {
  organizationId: "org",
  actorUserId: "accountant",
  leaseId: "lease",
  period: "2027-03",
  periodStart: new Date("2027-03-01"),
  periodEnd: new Date("2027-03-31"),
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "correlation",
};
function tx(member: object | null = { role: "ACCOUNTANT", organization: { status: "ACTIVE" } }) {
  return {
    membership: { findFirst: vi.fn().mockResolvedValue(member) },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    lease: {
      findFirst: vi.fn().mockResolvedValue({
        status: "ACTIVE",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        monthlyRentMinor: 125000,
        rentDueDay: 5,
        tenantProfile: { firstName: "A", lastName: "B" },
        unit: { unitCode: "101" },
      }),
    },
    rentObligation: { create: vi.fn().mockResolvedValue({ id: "obligation", version: 1n }) },
    ledgerTransaction: { create: vi.fn().mockResolvedValue({ id: "transaction" }) },
    ledgerEntry: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
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
describe("RentRepository immutable ledger", () => {
  it("commits one obligation and a balanced double-entry transaction", async () => {
    const transaction = tx();
    await expect(repository(transaction).create(input)).resolves.toMatchObject({
      kind: "created",
      response: { amountMinor: 125000, ledgerBalanced: true },
    });
    expect(transaction.ledgerEntry.createMany).toHaveBeenCalledWith({
      data: [
        {
          organizationId: "org",
          transactionId: "transaction",
          accountCode: "RENT_RECEIVABLE",
          direction: "DEBIT",
          amountMinor: 125000,
        },
        {
          organizationId: "org",
          transactionId: "transaction",
          accountCode: "RENT_REVENUE",
          direction: "CREDIT",
          amountMinor: 125000,
        },
      ],
    });
    expect(transaction.auditEvent.create).toHaveBeenCalledOnce();
    expect(transaction.idempotencyRecord.create).toHaveBeenCalledOnce();
  });
  it("writes nothing without organization membership", async () => {
    const transaction = tx(null);
    await expect(repository(transaction).create(input)).resolves.toEqual({ kind: "not_found" });
    expect(transaction.rentObligation.create).not.toHaveBeenCalled();
    expect(transaction.ledgerEntry.createMany).not.toHaveBeenCalled();
  });
  it("refuses periods not fully covered by the active lease", async () => {
    const transaction = tx();
    transaction.lease.findFirst.mockResolvedValue({
      status: "ACTIVE",
      startDate: new Date("2027-03-15"),
      endDate: new Date("2027-12-31"),
      monthlyRentMinor: 125000,
      rentDueDay: 5,
      tenantProfile: { firstName: "A", lastName: "B" },
      unit: { unitCode: "101" },
    });
    await expect(repository(transaction).create(input)).resolves.toEqual({
      kind: "period_not_covered",
    });
    expect(transaction.rentObligation.create).not.toHaveBeenCalled();
  });
});
