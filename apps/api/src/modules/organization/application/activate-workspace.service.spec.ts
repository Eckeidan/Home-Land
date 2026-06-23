import { describe, expect, it, vi } from "vitest";
import type { OnboardingRepository } from "../infrastructure/onboarding.repository.js";
import { ActivateWorkspaceService } from "./activate-workspace.service.js";

const command = {
  organizationId: "1d69d7cb-e506-4d66-8e20-b21a47896c35",
  actorUserId: "9b4c1d7f-8b8f-40cb-bfc8-ef87ba7ad2fe",
  expectedVersion: 7,
  idempotencyKey: "workspace-activation-0001",
  correlationId: "activation-correlation",
};

const response = {
  organizationId: command.organizationId,
  status: "ACTIVE" as const,
  activatedAt: "2026-06-22T18:00:00.000Z",
  nextPath: `/app/${command.organizationId}/portfolio`,
};

function setup(result: object) {
  const repository = { activate: vi.fn().mockResolvedValue(result) };
  return {
    service: new ActivateWorkspaceService(repository as unknown as OnboardingRepository),
    repository,
  };
}

describe("ActivateWorkspaceService", () => {
  it("activates and supplies hashed idempotency evidence", async () => {
    const { service, repository } = setup({ kind: "activated", response });
    await expect(service.execute(command)).resolves.toEqual(response);
    expect(repository.activate).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedVersion: 7,
        keyHash: expect.any(Uint8Array),
        requestHash: expect.any(Uint8Array),
      }),
    );
  });

  it("returns the same representation for an idempotent replay", async () => {
    const { service } = setup({ kind: "replayed", response });
    await expect(service.execute(command)).resolves.toEqual(response);
  });

  it.each([
    ["not_found", "ORGANIZATION_NOT_FOUND"],
    ["forbidden", "WORKSPACE_ACTIVATION_FORBIDDEN"],
    ["state_invalid", "ONBOARDING_TRANSITION_INVALID"],
    ["version_mismatch", "VERSION_MISMATCH"],
    ["idempotency_conflict", "IDEMPOTENCY_KEY_REUSED"],
    ["concurrent_request", "WORKSPACE_ACTIVATION_CONCURRENT"],
  ])("maps %s to stable error %s", async (kind, code) => {
    const { service } = setup({ kind, currentState: "ACTIVE", currentVersion: 8 });
    await expect(service.execute(command)).rejects.toMatchObject({ response: { code } });
  });

  it("returns server readiness when activation requirements are incomplete", async () => {
    const readiness = { ready: false, requirements: [], evaluatedAt: "now", version: 7 };
    const { service } = setup({ kind: "requirements_incomplete", readiness });
    await expect(service.execute(command)).rejects.toMatchObject({
      response: { code: "ONBOARDING_REQUIREMENTS_INCOMPLETE", readiness },
    });
  });
});
