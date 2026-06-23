import { describe, expect, it, vi } from "vitest";
import type { PortfolioRepository } from "../infrastructure/portfolio.repository.js";
import { CreateBuildingService } from "./create-building.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  propertyId: "8175268e-5cbb-46d0-93a5-f26f883d01f9",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  name: "  North   Tower ",
  idempotencyKey: "building-create-0001",
  correlationId: "building-correlation",
};

const response = {
  id: "building",
  organizationId: command.organizationId,
  propertyId: command.propertyId,
  name: "North Tower",
  version: 1,
};

function setup(result: object) {
  const repository = { createBuilding: vi.fn().mockResolvedValue(result) };
  return {
    service: new CreateBuildingService(repository as unknown as PortfolioRepository),
    repository,
  };
}

describe("CreateBuildingService", () => {
  it("normalizes and hashes a repeat-safe building command", async () => {
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.createBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ name: "North Tower", keyHash: expect.any(Uint8Array) }),
    );
  });

  it.each([
    ["not_found", "PROPERTY_NOT_FOUND"],
    ["forbidden", "BUILDING_CREATE_FORBIDDEN"],
    ["workspace_inactive", "WORKSPACE_NOT_ACTIVE"],
    ["building_conflict", "BUILDING_NAME_UNAVAILABLE"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["concurrent_request", "BUILDING_CREATE_CONCURRENT"],
  ])("maps %s to %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });
});
