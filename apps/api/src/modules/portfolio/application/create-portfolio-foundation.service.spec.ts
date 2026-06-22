import { describe, expect, it, vi } from "vitest";
import type { PortfolioRepository } from "../infrastructure/portfolio.repository.js";
import { CreatePortfolioFoundationService } from "./create-portfolio-foundation.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  propertyName: "  North   Park  ",
  propertyType: "MULTIFAMILY" as const,
  address: {
    line1: " 100   Main Street ",
    city: " Austin ",
    stateCode: "tx",
    postalCode: "78701",
    countryCode: "US" as const,
  },
  timeZone: "US/Central",
  unitCode: " 101 ",
  idempotencyKey: "portfolio-foundation-0001",
  correlationId: "portfolio-correlation",
};

const response = {
  property: {
    id: "8175268e-5cbb-46d0-93a5-f26f883d01f9",
    organizationId: command.organizationId,
    name: "North Park",
    propertyType: "MULTIFAMILY" as const,
    status: "ACTIVE" as const,
    version: 1,
  },
  unit: {
    id: "5522f302-51cf-47de-a9f7-7cd08d7802bb",
    organizationId: command.organizationId,
    propertyId: "8175268e-5cbb-46d0-93a5-f26f883d01f9",
    unitCode: "101",
    status: "AVAILABLE" as const,
    version: 1,
  },
  onboarding: {
    state: "READY_FOR_REVIEW" as const,
    nextAction: "REVIEW_READINESS" as const,
    version: 4,
  },
};

function setup(result: object) {
  const repository = { createFoundation: vi.fn().mockResolvedValue(result) };
  return {
    service: new CreatePortfolioFoundationService(repository as unknown as PortfolioRepository),
    repository,
  };
}

describe("CreatePortfolioFoundationService", () => {
  it("normalizes the complete atomic command", async () => {
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.createFoundation).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyName: "North Park",
        addressLine1: "100 Main Street",
        city: "Austin",
        stateCode: "TX",
        timeZone: "America/Chicago",
        unitCode: "101",
      }),
    );
  });

  it("returns the stored result for idempotent replay", async () => {
    const { service } = setup({ kind: "replayed", response });
    await expect(service.execute(command)).resolves.toEqual(response);
  });

  it("rejects invalid IANA zones before persistence", async () => {
    const { service, repository } = setup({ kind: "created", response });
    await expect(service.execute({ ...command, timeZone: "Central" })).rejects.toMatchObject({
      response: { code: "TIME_ZONE_INVALID" },
    });
    expect(repository.createFoundation).not.toHaveBeenCalled();
  });

  it.each([
    ["not_found", "ORGANIZATION_NOT_FOUND"],
    ["forbidden", "PORTFOLIO_CREATE_FORBIDDEN"],
    ["state_invalid", "ONBOARDING_TRANSITION_INVALID"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["concurrent_request", "PORTFOLIO_CONCURRENT_REQUEST"],
  ])("maps %s to stable error %s", async (kind, code) => {
    const { service } = setup({ kind });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });
});
