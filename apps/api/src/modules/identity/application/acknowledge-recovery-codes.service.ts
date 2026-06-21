import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { AcknowledgeRecoveryCodesCommand } from "../domain/mfa.types.js";
import { MfaRepository } from "../infrastructure/mfa.repository.js";

@Injectable()
export class AcknowledgeRecoveryCodesService {
  constructor(@Inject(MfaRepository) private readonly repository: MfaRepository) {}

  async execute(command: AcknowledgeRecoveryCodesCommand) {
    const result = await this.repository.acknowledgeRecoveryCodes(
      command.enrollmentId,
      command.userId,
      command.correlationId,
    );
    if (result === "invalid") {
      throw new BadRequestException(
        this.problem(command, 400, "MFA_CHALLENGE_INVALID", "MFA enrollment is invalid"),
      );
    }
    if (result === "transition_invalid") {
      throw new ConflictException(
        this.problem(
          command,
          409,
          "ONBOARDING_TRANSITION_INVALID",
          "Recovery codes cannot be acknowledged from the current state",
        ),
      );
    }
    return { status: "ACKNOWLEDGED", nextPath: "/onboarding/team" } as const;
  }

  private problem(
    command: AcknowledgeRecoveryCodesCommand,
    status: number,
    code: string,
    title: string,
  ) {
    return {
      type: "/problems/mfa-enrollment",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
