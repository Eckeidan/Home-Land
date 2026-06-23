import { describe, expect, it, vi } from "vitest";
import type { RentRepository } from "../infrastructure/rent.repository.js";
import { RentService } from "./rent.service.js";

const command = {
  organizationId: "org",
  actorUserId: "accountant",
  leaseId: "lease",
  period: "2027-03",
  idempotencyKey: "rent-obligation-0001",
  correlationId: "correlation",
};
function setup(result: object) {
  const repository = {
    create: vi.fn().mockResolvedValue(result),
    recordPayment: vi.fn().mockResolvedValue(result),
    recordRefund: vi.fn().mockResolvedValue(result),
    resolveReconciliation: vi.fn().mockResolvedValue(result),
  };
  return { service: new RentService(repository as unknown as RentRepository), repository };
}
describe("RentService", () => {
  it("derives exact monthly boundaries and hashes idempotency", async () => {
    const response = { id: "obligation", ledgerBalanced: true };
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.create(command)).resolves.toEqual(response);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        periodStart: new Date("2027-03-01T00:00:00.000Z"),
        periodEnd: new Date("2027-03-31T00:00:00.000Z"),
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });
  it("rejects invalid periods before persistence", async () => {
    const { service, repository } = setup({ kind: "created" });
    await expect(service.create({ ...command, period: "2200-01" })).rejects.toMatchObject({
      response: { code: "RENT_PERIOD_INVALID" },
    });
    expect(repository.create).not.toHaveBeenCalled();
  });
  it.each([
    ["lease_inactive", "LEASE_NOT_ACTIVE"],
    ["period_not_covered", "LEASE_PERIOD_NOT_COVERED"],
    ["duplicate", "RENT_OBLIGATION_EXISTS"],
    ["forbidden", "RENT_WRITE_FORBIDDEN"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
  ])("maps %s to %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(service.create(command)).rejects.toMatchObject({ response: { code } });
  });
  it("normalizes and hashes a payment allocation command", async () => {
    const response = { id: "payment", ledgerBalanced: true, receipt: { receiptNumber: "RCP-1" } };
    const { service, repository } = setup({ kind: "created", response });
    await expect(
      service.recordPayment({
        organizationId: "org",
        actorUserId: "accountant",
        method: "ACH",
        receivedAt: new Date(Date.now() - 1_000).toISOString(),
        externalReference: " REF-1 ",
        allocations: [{ rentObligationId: "obligation", amountMinor: 50000 }],
        idempotencyKey: "payment-record-0001",
        correlationId: "correlation",
      }),
    ).resolves.toEqual(response);
    expect(repository.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        externalReference: "REF-1",
        receiptNumber: expect.stringMatching(/^RCP-/),
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });
  it("rejects duplicate obligation allocations before persistence", async () => {
    const { service, repository } = setup({ kind: "created" });
    await expect(
      service.recordPayment({
        organizationId: "org",
        actorUserId: "accountant",
        method: "CHECK",
        receivedAt: new Date(Date.now() - 1_000).toISOString(),
        allocations: [
          { rentObligationId: "same", amountMinor: 10 },
          { rentObligationId: "same", amountMinor: 10 },
        ],
        idempotencyKey: "payment-record-0001",
        correlationId: "correlation",
      }),
    ).rejects.toMatchObject({ response: { code: "PAYMENT_INPUT_INVALID" } });
    expect(repository.recordPayment).not.toHaveBeenCalled();
  });
  it.each([
    ["allocation_invalid", "PAYMENT_ALLOCATION_INVALID"],
    ["tenant_mismatch", "PAYMENT_TENANT_MISMATCH"],
    ["concurrent", "PAYMENT_CONCURRENT_REQUEST"],
  ])("maps payment error %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(
      service.recordPayment({
        organizationId: "org",
        actorUserId: "accountant",
        method: "CASH",
        receivedAt: new Date(Date.now() - 1_000).toISOString(),
        allocations: [{ rentObligationId: "obligation", amountMinor: 100 }],
        idempotencyKey: "payment-record-0001",
        correlationId: "correlation",
      }),
    ).rejects.toMatchObject({ response: { code } });
  });
  it("normalizes and hashes a reversing refund command", async () => {
    const response = { id: "refund", ledgerBalanced: true };
    const { service, repository } = setup({ kind: "created", response });
    await expect(
      service.recordRefund({
        organizationId: "org",
        actorUserId: "accountant",
        paymentId: "payment",
        reason: " Duplicate payment ",
        refundedAt: new Date(Date.now() - 1_000).toISOString(),
        allocations: [{ paymentAllocationId: "allocation", amountMinor: 5000 }],
        idempotencyKey: "refund-record-0001",
        correlationId: "correlation",
      }),
    ).resolves.toEqual(response);
    expect(repository.recordRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: "Duplicate payment",
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });
  it.each([
    ["allocation_invalid", "REFUND_ALLOCATION_INVALID"],
    ["forbidden", "REFUND_WRITE_FORBIDDEN"],
    ["concurrent", "REFUND_CONCURRENT_REQUEST"],
  ])("maps refund error %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(
      service.recordRefund({
        organizationId: "org",
        actorUserId: "accountant",
        paymentId: "payment",
        reason: "Correction",
        refundedAt: new Date(Date.now() - 1_000).toISOString(),
        allocations: [{ paymentAllocationId: "allocation", amountMinor: 5000 }],
        idempotencyKey: "refund-record-0001",
        correlationId: "correlation",
      }),
    ).rejects.toMatchObject({ response: { code } });
  });
});
