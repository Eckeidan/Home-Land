import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { LeasingRepository } from "./leasing.repository.js";

const input = {
  organizationId: "org",
  actorUserId: "owner",
  leaseId: "lease",
  expectedVersion: 2,
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "correlation",
};
function tx(membership: object | null = { role: "OWNER", organization: { status: "ACTIVE" } }) {
  return {
    membership: { findFirst: vi.fn().mockResolvedValue(membership) },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    lease: {
      findFirst: vi.fn().mockResolvedValue({
        id: "lease",
        status: "READY_FOR_ACTIVATION",
        version: 2n,
        propertyId: "property",
        unitId: "unit",
        tenantProfileId: "tenant",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        monthlyRentMinor: 100000,
        rentDueDay: 1,
        tenantProfile: { firstName: "A", lastName: "B", status: "ACTIVE" },
        unit: { unitCode: "101", status: "AVAILABLE" },
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    unit: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    auditEvent: { create: vi.fn() },
    outboxMessage: { create: vi.fn() },
  };
}
function repository(transaction: ReturnType<typeof tx>) {
  return new LeasingRepository({
    $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    idempotencyRecord: transaction.idempotencyRecord,
  } as unknown as DatabaseClient);
}
describe("Lease activation transaction", () => {
  it("activates the lease and derives occupied unit atomically", async () => {
    const transaction = tx();
    await expect(repository(transaction).activateLease(input)).resolves.toMatchObject({
      kind: "transitioned",
      response: { status: "ACTIVE", version: 3 },
    });
    expect(transaction.unit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org", status: "AVAILABLE" }),
        data: expect.objectContaining({ status: "OCCUPIED" }),
      }),
    );
    expect(transaction.lease.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "READY_FOR_ACTIVATION", version: 2n }),
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
    expect(transaction.auditEvent.create).toHaveBeenCalledOnce();
    expect(transaction.outboxMessage.create).toHaveBeenCalledOnce();
    expect(transaction.idempotencyRecord.create).toHaveBeenCalledOnce();
  });
  it("writes nothing for a cross-tenant actor", async () => {
    const transaction = tx(null);
    await expect(repository(transaction).activateLease(input)).resolves.toEqual({
      kind: "not_found",
    });
    expect(transaction.unit.updateMany).not.toHaveBeenCalled();
    expect(transaction.lease.updateMany).not.toHaveBeenCalled();
  });
  it("rolls back logically when the unit is no longer available", async () => {
    const transaction = tx();
    transaction.unit.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository(transaction).activateLease(input)).resolves.toEqual({
      kind: "unit_unavailable",
    });
    expect(transaction.lease.updateMany).not.toHaveBeenCalled();
  });
});
