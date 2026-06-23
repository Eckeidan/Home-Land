import { describe, expect, it, vi } from "vitest";
import type { OnboardingRepository } from "../infrastructure/onboarding.repository.js";
import { GetOnboardingReadinessService } from "./get-onboarding-readiness.service.js";

describe("GetOnboardingReadinessService", () => {
  it("returns only repository-evaluated readiness", async () => {
    const readiness = { ready: true, requirements: [], evaluatedAt: "now", version: 7 };
    const repository = { getReadiness: vi.fn().mockResolvedValue({ kind: "ready", readiness }) };
    const service = new GetOnboardingReadinessService(
      repository as unknown as OnboardingRepository,
    );
    await expect(service.execute("organization", "owner")).resolves.toEqual(readiness);
  });

  it.each([
    ["not_found", "ORGANIZATION_NOT_FOUND"],
    ["forbidden", "ONBOARDING_REVIEW_FORBIDDEN"],
  ])("maps %s to stable error %s", async (kind, code) => {
    const repository = { getReadiness: vi.fn().mockResolvedValue({ kind }) };
    const service = new GetOnboardingReadinessService(
      repository as unknown as OnboardingRepository,
    );
    await expect(service.execute("organization", "owner")).rejects.toMatchObject({
      response: { code },
    });
  });
});
