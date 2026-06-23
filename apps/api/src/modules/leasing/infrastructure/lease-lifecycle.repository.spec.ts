import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { LeasingRepository } from "./leasing.repository.js";

const input = {
  organizationId: "org",
  actorUserId: "owner",
  leaseId: "lease",
  expectedVersion: 3,
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "correlation",
};
function tx() {
  return {
    membership: {
      findFirst: vi.fn().mockResolvedValue({ role: "OWNER", organization: { status: "ACTIVE" } }),
    },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    lease: {
      findFirst: vi.fn().mockResolvedValue({
        id: "lease",
        status: "ACTIVE",
        version: 3n,
        propertyId: "property",
        unitId: "unit",
        tenantProfileId: "tenant",
        startDate: new Date("2027-01-01"),
        endDate: new Date("2027-12-31"),
        monthlyRentMinor: 100000,
        rentDueDay: 1,
        renewalMarkedAt: null,
        tenantProfile: { firstName: "A", lastName: "B" },
        unit: { unitCode: "101", status: "OCCUPIED" },
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
describe("Lease renewal and termination", () => {
  it("marks renewal without changing occupancy", async () => {
    const transaction = tx();
    await expect(repository(transaction).markLeaseRenewal(input)).resolves.toMatchObject({
      kind: "transitioned",
      response: { status: "ACTIVE", version: 4, renewalMarkedAt: expect.any(String) },
    });
    expect(transaction.unit.updateMany).not.toHaveBeenCalled();
    expect(transaction.lease.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ renewalMarkedAt: expect.any(Date) }),
      }),
    );
  });
  it("terminates and releases the occupied unit atomically", async () => {
    const transaction = tx();
    await expect(repository(transaction).terminateLease(input)).resolves.toMatchObject({
      kind: "transitioned",
      response: { status: "TERMINATED", version: 4 },
    });
    expect(transaction.unit.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "OCCUPIED" }),
        data: expect.objectContaining({ status: "AVAILABLE" }),
      }),
    );
    expect(transaction.lease.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "TERMINATED" }) }),
    );
  });
  it("does not terminate when occupancy evidence is inconsistent", async () => {
    const transaction = tx();
    transaction.unit.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository(transaction).terminateLease(input)).resolves.toEqual({
      kind: "unit_unavailable",
    });
    expect(transaction.lease.updateMany).not.toHaveBeenCalled();
  });
});
