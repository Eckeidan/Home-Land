import { describe, expect, it, vi } from "vitest";
import type { LeasingRepository } from "../infrastructure/leasing.repository.js";
import type { TenantInvitationMailerService } from "../infrastructure/tenant-invitation-mailer.service.js";
import { LeasingService } from "./leasing.service.js";

const base = {
  organizationId: "org",
  actorUserId: "user",
  idempotencyKey: "leasing-request-0001",
  correlationId: "correlation",
};
function setup(method: string, result: object) {
  const repository = { [method]: vi.fn().mockResolvedValue(result) };
  const mailer = { send: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new LeasingService(
      repository as unknown as LeasingRepository,
      mailer as unknown as TenantInvitationMailerService,
    ),
    repository,
    mailer,
  };
}
describe("LeasingService", () => {
  it("normalizes a tenant and sends a one-time invitation only after creation", async () => {
    const response = {
      id: "tenant",
      firstName: "Chris",
      lastName: "Monga",
      email: "tenant@example.com",
      status: "INVITED",
    };
    const { service, repository, mailer } = setup("createTenant", {
      kind: "created",
      response,
      organizationName: "Home Land",
    });
    await expect(
      service.createTenant({
        ...base,
        firstName: " Chris ",
        lastName: " Monga ",
        email: "TENANT@EXAMPLE.COM",
        sendInvitation: true,
      }),
    ).resolves.toEqual(response);
    expect(repository.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "tenant@example.com",
        tokenHash: expect.any(Uint8Array),
        keyHash: expect.any(Uint8Array),
      }),
    );
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({ email: "tenant@example.com", organizationName: "Home Land" }),
    );
  });
  it("rejects invalid lease dates before persistence", async () => {
    const { service, repository } = setup("createLease", { kind: "created" });
    await expect(
      service.createLease({
        ...base,
        propertyId: "p",
        unitId: "u",
        tenantProfileId: "t",
        startDate: "2027-02-01",
        endDate: "2027-01-01",
        monthlyRentMinor: 100000,
        securityDepositMinor: 0,
        rentDueDay: 1,
      }),
    ).rejects.toMatchObject({ response: { code: "LEASE_DATES_INVALID" } });
    expect(repository.createLease).not.toHaveBeenCalled();
  });
  it.each([
    ["forbidden", "LEASING_WRITE_FORBIDDEN"],
    ["workspace_inactive", "WORKSPACE_NOT_ACTIVE"],
    ["duplicate", "TENANT_EMAIL_EXISTS"],
    ["unit_unavailable", "UNIT_NOT_AVAILABLE"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["concurrent", "LEASING_CONCURRENT_REQUEST"],
  ])("maps %s to %s", async (kind, code) => {
    const { service } = setup("createTenant", { kind });
    await expect(
      service.createTenant({
        ...base,
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        sendInvitation: false,
      }),
    ).rejects.toMatchObject({ response: { code } });
  });
  it("rejects replayed or expired invitation tokens", async () => {
    const { service } = setup("acceptInvitation", { kind: "invalid" });
    await expect(service.acceptInvitation("token", "correlation")).rejects.toMatchObject({
      response: { code: "TENANT_INVITATION_INVALID" },
    });
  });
  it("validates a lease with hashed idempotency and expected version", async () => {
    const response = { id: "lease", status: "READY_FOR_ACTIVATION", version: 2 };
    const { service, repository } = setup("validateLease", { kind: "transitioned", response });
    await expect(
      service.validateLease({ ...base, leaseId: "lease", expectedVersion: 1 }),
    ).resolves.toEqual(response);
    expect(repository.validateLease).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 1,
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });
  it.each([
    ["requirements_incomplete", "LEASE_REQUIREMENTS_INCOMPLETE"],
    ["state_invalid", "LEASE_TRANSITION_INVALID"],
    ["unit_unavailable", "UNIT_NOT_AVAILABLE"],
  ])("blocks activation condition %s", async (kind, code) => {
    const { service } = setup("activateLease", { kind });
    await expect(
      service.activateLease({ ...base, leaseId: "lease", expectedVersion: 2 }),
    ).rejects.toMatchObject({ response: { code } });
  });
  it("returns a stable precondition failure", async () => {
    const { service } = setup("activateLease", { kind: "version_mismatch", currentVersion: 3 });
    await expect(
      service.activateLease({ ...base, leaseId: "lease", expectedVersion: 2 }),
    ).rejects.toMatchObject({ response: { code: "VERSION_MISMATCH", currentVersion: 3 } });
  });
  it("marks an active lease for renewal", async () => {
    const response = {
      id: "lease",
      status: "ACTIVE",
      renewalMarkedAt: "2026-06-22T23:00:00.000Z",
      version: 4,
    };
    const { service, repository } = setup("markLeaseRenewal", { kind: "transitioned", response });
    await expect(
      service.markLeaseRenewal({ ...base, leaseId: "lease", expectedVersion: 3 }),
    ).resolves.toEqual(response);
    expect(repository.markLeaseRenewal).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 3, keyHash: expect.any(Uint8Array) }),
    );
  });
  it("terminates an active lease through an explicit command", async () => {
    const response = { id: "lease", status: "TERMINATED", version: 4 };
    const { service } = setup("terminateLease", { kind: "transitioned", response });
    await expect(
      service.terminateLease({ ...base, leaseId: "lease", expectedVersion: 3 }),
    ).resolves.toEqual(response);
  });
  it("rejects lifecycle commands outside ACTIVE", async () => {
    const { service } = setup("terminateLease", { kind: "state_invalid" });
    await expect(
      service.terminateLease({ ...base, leaseId: "lease", expectedVersion: 3 }),
    ).rejects.toMatchObject({ response: { code: "LEASE_TRANSITION_INVALID" } });
  });
});
