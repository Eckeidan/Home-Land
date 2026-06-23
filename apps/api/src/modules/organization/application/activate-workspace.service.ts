import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import type { ActivateWorkspaceCommand, WorkspaceActivated } from "../domain/organization.types.js";
import { OnboardingRepository } from "../infrastructure/onboarding.repository.js";

@Injectable()
export class ActivateWorkspaceService {
  constructor(@Inject(OnboardingRepository) private readonly repository: OnboardingRepository) {}

  async execute(command: ActivateWorkspaceCommand): Promise<WorkspaceActivated> {
    const requestHash = this.hash(JSON.stringify({ expectedVersion: command.expectedVersion }));
    const result = await this.repository.activate({
      ...command,
      keyHash: this.hash(command.idempotencyKey),
      requestHash,
      currentTermsVersion: process.env.CURRENT_TERMS_VERSION ?? "2026-06-20",
    });
    switch (result.kind) {
      case "activated":
      case "replayed":
        return result.response;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
        );
      case "forbidden":
        throw new ForbiddenException(
          this.problem(
            command,
            403,
            "WORKSPACE_ACTIVATION_FORBIDDEN",
            "Workspace activation is reserved for the owner",
          ),
        );
      case "state_invalid":
        throw new ConflictException({
          ...this.problem(
            command,
            409,
            "ONBOARDING_TRANSITION_INVALID",
            "Workspace cannot be activated from its current state",
          ),
          currentState: result.currentState,
        });
      case "requirements_incomplete":
        throw new ConflictException({
          ...this.problem(
            command,
            409,
            "ONBOARDING_REQUIREMENTS_INCOMPLETE",
            "Workspace readiness requirements are incomplete",
          ),
          readiness: result.readiness,
        });
      case "version_mismatch":
        throw new PreconditionFailedException({
          ...this.problem(command, 412, "VERSION_MISMATCH", "Onboarding version does not match"),
          currentVersion: result.currentVersion,
        });
      case "idempotency_conflict":
        throw new ConflictException(
          this.problem(command, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"),
        );
      case "concurrent_request":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "WORKSPACE_ACTIVATION_CONCURRENT",
            "Another activation request is already being processed",
          ),
        );
    }
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(command: ActivateWorkspaceCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/onboarding",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
