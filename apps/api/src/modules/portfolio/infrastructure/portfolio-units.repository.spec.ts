import type { DatabaseClient } from "@home-land/database";
import { describe, expect, it, vi } from "vitest";
import { PortfolioRepository } from "./portfolio.repository.js";

describe("PortfolioRepository unit isolation", () => {
  it("does not query a property without an organization membership", async () => {
    const database = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      property: { findFirst: vi.fn() },
    };
    const repository = new PortfolioRepository(database as unknown as DatabaseClient);
    await expect(
      repository.getPropertyWorkspace("organization", "property", "user"),
    ).resolves.toBeNull();
    expect(database.property.findFirst).not.toHaveBeenCalled();
  });

  it("creates no unit for a cross-tenant actor", async () => {
    const transaction = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      property: { findFirst: vi.fn() },
      unit: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const repository = new PortfolioRepository(database as unknown as DatabaseClient);
    await expect(
      repository.createUnit({
        organizationId: "organization",
        propertyId: "property",
        actorUserId: "user",
        unitCode: "202",
        keyHash: new Uint8Array([1]),
        requestHash: new Uint8Array([2]),
        correlationId: "correlation",
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(transaction.property.findFirst).not.toHaveBeenCalled();
    expect(transaction.unit.create).not.toHaveBeenCalled();
  });

  it("creates no building for a cross-tenant actor", async () => {
    const transaction = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      building: { create: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const repository = new PortfolioRepository(database as unknown as DatabaseClient);
    await expect(
      repository.createBuilding({
        organizationId: "organization",
        propertyId: "property",
        actorUserId: "user",
        name: "Tower A",
        keyHash: new Uint8Array([1]),
        requestHash: new Uint8Array([2]),
        correlationId: "correlation",
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(transaction.building.create).not.toHaveBeenCalled();
  });

  it("imports no rows for a cross-tenant actor", async () => {
    const transaction = {
      membership: { findFirst: vi.fn().mockResolvedValue(null) },
      unit: { createMany: vi.fn() },
    };
    const database = {
      $transaction: vi.fn(async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      ),
    };
    const repository = new PortfolioRepository(database as unknown as DatabaseClient);
    await expect(
      repository.importUnits({
        organizationId: "organization",
        propertyId: "property",
        actorUserId: "user",
        mode: "DRY_RUN",
        rows: [{ rowNumber: 2, unitCode: "101" }],
        requestHash: new Uint8Array([2]),
        correlationId: "correlation",
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(transaction.unit.createMany).not.toHaveBeenCalled();
  });
});
