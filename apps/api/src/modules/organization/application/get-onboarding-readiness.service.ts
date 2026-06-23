import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { OnboardingReadiness } from "../domain/organization.types.js";
import { OnboardingRepository } from "../infrastructure/onboarding.repository.js";

@Injectable()
export class GetOnboardingReadinessService {
  constructor(@Inject(OnboardingRepository) private readonly repository: OnboardingRepository) {}

  async execute(organizationId: string, actorUserId: string): Promise<OnboardingReadiness> {
    const result = await this.repository.getReadiness(
      organizationId,
      actorUserId,
      process.env.CURRENT_TERMS_VERSION ?? "2026-06-20",
    );
    if (result.kind === "not_found") {
      throw new NotFoundException(
        this.problem(404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
      );
    }
    if (result.kind === "forbidden") {
      throw new ForbiddenException(
        this.problem(
          403,
          "ONBOARDING_REVIEW_FORBIDDEN",
          "Onboarding review is reserved for the owner",
        ),
      );
    }
    return result.readiness;
  }

  private problem(status: number, code: string, title: string) {
    return { type: "/problems/onboarding", title, status, code };
  }
}
