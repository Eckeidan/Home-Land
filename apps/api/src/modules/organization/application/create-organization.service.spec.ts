import { describe, expect, it, vi } from "vitest";
import type { OrganizationRepository } from "../infrastructure/organization.repository.js";
import { CreateOrganizationService } from "./create-organization.service.js";

const command = {
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  legalName: "  Home   Land LLC ",
  displayName: " Home Land ",
  organizationType: "PROPERTY_MANAGEMENT_COMPANY" as const,
  primaryStateCode: "ny",
  approximateUnitRange: "ONE_HUNDRED_TO_FIVE_HUNDRED" as const,
  idempotencyKey: "organization-request-0001",
  correlationId: "organization-correlation",
};

const response = {
  organization: {
    id: "cc3afcdc-4f7c-4e5c-84a7-102f241bb8f7",
    displayName: "Home Land",
    slug: null,
    status: "ONBOARDING" as const,
    version: 1,
  },
  membershipRole: "OWNER" as const,
  onboarding: {
    organizationId: "cc3afcdc-4f7c-4e5c-84a7-102f241bb8f7",
    state: "ORGANIZATION_CREATED" as const,
    nextAction: "CONFIGURE_WORKSPACE" as const,
    version: 1,
  },
};

function setup(kind: "created" | "replayed" | "conflict") {
  const repository = {
    createOrganizationWithOwner: vi
      .fn()
      .mockResolvedValue(kind === "conflict" ? { kind } : { kind, response }),
  };
  return {
    service: new CreateOrganizationService(repository as unknown as OrganizationRepository),
    repository,
  };
}

describe("CreateOrganizationService", () => {
  it("normalizes input and returns the atomically created owner workspace", async () => {
    const { service, repository } = setup("created");

    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.createOrganizationWithOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        legalName: "Home Land LLC",
        displayName: "Home Land",
        primaryStateCode: "NY",
      }),
    );
  });

  it("returns the stored response for an exact idempotent replay", async () => {
    const { service } = setup("replayed");
    await expect(service.execute(command)).resolves.toEqual(response);
  });

  it("rejects reuse of an idempotency key with a different request", async () => {
    const { service } = setup("conflict");
    await expect(service.execute(command)).rejects.toMatchObject({
      response: { code: "IDEMPOTENCY_KEY_REUSED" },
    });
  });
});
