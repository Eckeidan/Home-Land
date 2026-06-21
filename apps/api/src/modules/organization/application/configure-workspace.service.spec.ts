import { describe, expect, it, vi } from "vitest";
import type { OrganizationRepository } from "../infrastructure/organization.repository.js";
import { ConfigureWorkspaceService } from "./configure-workspace.service.js";

const command = {
  organizationId: "cc3afcdc-4f7c-4e5c-84a7-102f241bb8f7",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  slug: "home-land-ny",
  timeZone: "US/Eastern",
  locale: "en-US" as const,
  expectedVersion: 1,
  correlationId: "workspace-correlation",
};

const response = {
  id: command.organizationId,
  displayName: "Home Land",
  slug: command.slug,
  status: "ONBOARDING" as const,
  version: 2,
};

function setup(result: object) {
  const repository = { configureWorkspace: vi.fn().mockResolvedValue(result) };
  return {
    service: new ConfigureWorkspaceService(repository as unknown as OrganizationRepository),
    repository,
  };
}

describe("ConfigureWorkspaceService", () => {
  it("canonicalizes the IANA time zone and returns the configured workspace", async () => {
    const { service, repository } = setup({ kind: "configured", response });

    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.configureWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "home-land-ny", timeZone: "America/New_York" }),
    );
  });

  it("rejects reserved workspace slugs before persistence", async () => {
    const { service, repository } = setup({ kind: "configured", response });
    await expect(service.execute({ ...command, slug: "admin" })).rejects.toMatchObject({
      response: { code: "WORKSPACE_SLUG_RESERVED" },
    });
    expect(repository.configureWorkspace).not.toHaveBeenCalled();
  });

  it("rejects invalid IANA time zones", async () => {
    const { service } = setup({ kind: "configured", response });
    await expect(service.execute({ ...command, timeZone: "New York" })).rejects.toMatchObject({
      response: { code: "TIME_ZONE_INVALID" },
    });
  });

  it.each([
    ["not_found", "ORGANIZATION_NOT_FOUND"],
    ["slug_unavailable", "WORKSPACE_SLUG_UNAVAILABLE"],
    ["transition_invalid", "ONBOARDING_TRANSITION_INVALID"],
    ["version_mismatch", "VERSION_MISMATCH"],
  ])("maps repository result %s to stable error %s", async (kind, code) => {
    const { service } = setup({ kind, currentState: "ACTIVE", currentVersion: 2 });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });
});
