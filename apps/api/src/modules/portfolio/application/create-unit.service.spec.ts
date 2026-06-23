import { describe, expect, it, vi } from "vitest";
import type { PortfolioRepository } from "../infrastructure/portfolio.repository.js";
import { CreateUnitService } from "./create-unit.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  propertyId: "8175268e-5cbb-46d0-93a5-f26f883d01f9",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  unitCode: "  Unit   202 ",
  bedrooms: 2,
  bathrooms: 1.5,
  idempotencyKey: "unit-creation-0001",
  correlationId: "unit-correlation",
};

const response = {
  id: "5522f302-51cf-47de-a9f7-7cd08d7802bb",
  organizationId: command.organizationId,
  propertyId: command.propertyId,
  unitCode: "Unit 202",
  status: "AVAILABLE" as const,
  bedrooms: 2,
  bathrooms: "1.5",
  version: 1,
};

function setup(result: object) {
  const repository = { createUnit: vi.fn().mockResolvedValue(result) };
  return {
    service: new CreateUnitService(repository as unknown as PortfolioRepository),
    repository,
  };
}

describe("CreateUnitService", () => {
  it("normalizes and hashes the idempotent command", async () => {
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.createUnit).toHaveBeenCalledWith(
      expect.objectContaining({
        unitCode: "Unit 202",
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });

  it("returns a stored replay", async () => {
    const { service } = setup({ kind: "replayed", response });
    await expect(service.execute(command)).resolves.toEqual(response);
  });

  it.each([
    ["not_found", "PROPERTY_NOT_FOUND"],
    ["forbidden", "UNIT_CREATE_FORBIDDEN"],
    ["workspace_inactive", "WORKSPACE_NOT_ACTIVE"],
    ["unit_conflict", "UNIT_CODE_UNAVAILABLE"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["concurrent_request", "UNIT_CREATE_CONCURRENT"],
  ])("maps %s to stable error %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });
});
