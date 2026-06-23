import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { OnboardingRepository } from "./onboarding.repository.js";

const organizationId = "1d69d7cb-e506-4d66-8e20-b21a47896c35";
const actorUserId = "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe";

function transaction(
  overrides: { membership?: object | null; terms?: object | null; state?: string } = {},
) {
  const state = overrides.state ?? "READY_FOR_REVIEW";
  return {
    membership: {
      findFirst: vi
        .fn()
        .mockResolvedValue(
          overrides.membership === undefined ? { role: "OWNER" } : overrides.membership,
        ),
    },
    idempotencyRecord: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    onboardingProgress: {
      findUnique: vi.fn().mockResolvedValue({
        state,
        version: 7n,
        activatedAt: state === "ACTIVE" ? new Date("2026-06-22T18:00:00.000Z") : null,
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    organization: {
      findUnique: vi.fn().mockResolvedValue({
        status: "ONBOARDING",
        slug: "north-park",
        timeZone: "America/Chicago",
        locale: "en-US",
        onboardingProgress: { version: 7n },
        properties: [{ id: "property", units: [{ id: "unit" }] }],
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        status: "ACTIVE",
        emailVerifiedAt: new Date("2026-06-20T10:00:00.000Z"),
      }),
    },
    mfaFactor: { findFirst: vi.fn().mockResolvedValue({ id: "factor" }) },
    termsAcceptance: {
      findUnique: vi
        .fn()
        .mockResolvedValue(overrides.terms === undefined ? { id: "terms" } : overrides.terms),
    },
    auditEvent: { create: vi.fn() },
    outboxMessage: { create: vi.fn() },
  };
}

function repositoryWith(tx: ReturnType<typeof transaction>) {
  const database = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    idempotencyRecord: tx.idempotencyRecord,
  };
  return new OnboardingRepository(database as unknown as DatabaseClient);
}

const input = {
  organizationId,
  actorUserId,
  expectedVersion: 7,
  keyHash: new Uint8Array([1]),
  requestHash: new Uint8Array([2]),
  correlationId: "activation-correlation",
  currentTermsVersion: "2026-06-20",
};

describe("OnboardingRepository activation", () => {
  it("commits organization, progress, audit, outbox and idempotency together", async () => {
    const tx = transaction();
    await expect(repositoryWith(tx).activate(input)).resolves.toMatchObject({ kind: "activated" });
    expect(tx.organization.updateMany).toHaveBeenCalledOnce();
    expect(tx.onboardingProgress.updateMany).toHaveBeenCalledOnce();
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
    expect(tx.outboxMessage.create).toHaveBeenCalledOnce();
    expect(tx.idempotencyRecord.create).toHaveBeenCalledOnce();
  });

  it("rejects missing authoritative terms without writes", async () => {
    const tx = transaction({ terms: null });
    const result = await repositoryWith(tx).activate(input);
    expect(result).toMatchObject({ kind: "requirements_incomplete" });
    expect(tx.organization.updateMany).not.toHaveBeenCalled();
  });

  it("hides cross-tenant organizations", async () => {
    const tx = transaction({ membership: null });
    await expect(repositoryWith(tx).activate(input)).resolves.toEqual({ kind: "not_found" });
    expect(tx.organization.findUnique).not.toHaveBeenCalled();
  });

  it("returns an already active workspace for a different valid retry key", async () => {
    const tx = transaction({ state: "ACTIVE" });
    await expect(repositoryWith(tx).activate(input)).resolves.toMatchObject({
      kind: "replayed",
      response: { status: "ACTIVE", activatedAt: "2026-06-22T18:00:00.000Z" },
    });
    expect(tx.organization.updateMany).not.toHaveBeenCalled();
    expect(tx.auditEvent.create).not.toHaveBeenCalled();
  });
});
