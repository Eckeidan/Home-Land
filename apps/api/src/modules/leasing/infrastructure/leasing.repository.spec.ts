import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { LeasingRepository } from "./leasing.repository.js";

describe("LeasingRepository isolation", () => {
  it("returns no snapshot without membership", async () => {
    const database = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      tenantProfile: { findMany: vi.fn() },
    };
    const repository = new LeasingRepository(database as unknown as DatabaseClient);
    await expect(repository.snapshot("other-org", "user")).resolves.toBeNull();
    expect(database.tenantProfile.findMany).not.toHaveBeenCalled();
  });
  it("creates no tenant for a cross-tenant actor", async () => {
    const tx = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      tenantProfile: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new LeasingRepository(database as unknown as DatabaseClient);
    await expect(
      repository.createTenant({
        organizationId: "org",
        actorUserId: "user",
        firstName: "A",
        lastName: "B",
        email: "a@b.com",
        sendInvitation: false,
        keyHash: new Uint8Array([1]),
        requestHash: new Uint8Array([2]),
        correlationId: "c",
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(tx.tenantProfile.create).not.toHaveBeenCalled();
  });
});
