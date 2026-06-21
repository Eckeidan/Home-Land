import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import type { ConfirmMfaEnrollmentCommand } from "../domain/mfa.types.js";
import { MfaRepository } from "../infrastructure/mfa.repository.js";
import { MfaSecretCipherService } from "../infrastructure/mfa-secret-cipher.service.js";
import { RecoveryCodeService } from "../infrastructure/recovery-code.service.js";
import { SecureTokenService } from "../infrastructure/secure-token.service.js";
import { TotpService } from "../infrastructure/totp.service.js";

export interface MfaConfirmation {
  status: "ENABLED";
  recoveryCodes: string[];
  sessionValue: string;
  csrfValue: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}

@Injectable()
export class ConfirmMfaEnrollmentService {
  constructor(
    @Inject(MfaRepository) private readonly repository: MfaRepository,
    @Inject(MfaSecretCipherService) private readonly cipher: MfaSecretCipherService,
    @Inject(TotpService) private readonly totp: TotpService,
    @Inject(RecoveryCodeService) private readonly recoveryCodes: RecoveryCodeService,
    @Inject(SecureTokenService) private readonly tokens: SecureTokenService,
  ) {}

  async execute(command: ConfirmMfaEnrollmentCommand): Promise<MfaConfirmation> {
    const enrollment = await this.repository.findPendingEnrollment(
      command.enrollmentId,
      command.userId,
    );
    if (!enrollment) throw this.invalid(command);
    const context = `${command.userId}:${enrollment.organizationId}:${command.enrollmentId}`;
    let secret: string;
    try {
      secret = this.cipher.decrypt(enrollment, context);
    } catch {
      throw this.invalid(command);
    }
    if (!this.totp.verify(secret, command.code)) {
      await this.repository.recordInvalidAttempt(
        command.enrollmentId,
        command.userId,
        command.correlationId,
      );
      throw this.invalid(command);
    }

    const rawRecoveryCodes = this.recoveryCodes.generate();
    const recoveryCodeHashes = await Promise.all(
      rawRecoveryCodes.map((code) => this.recoveryCodes.hash(code)),
    );
    const sessionValue = this.tokens.generate();
    const csrfValue = this.tokens.generate();
    const idleExpiresAt = new Date(
      Math.min(Date.now() + 60 * 60_000, command.absoluteExpiresAt.getTime()),
    );
    const result = await this.repository.confirmEnrollment({
      enrollmentId: command.enrollmentId,
      userId: command.userId,
      sessionId: command.sessionId,
      recoveryCodeHashes,
      newSessionHash: this.tokens.hash(sessionValue),
      newCsrfHash: this.tokens.hash(csrfValue),
      primaryAuthenticatedAt: command.primaryAuthenticatedAt,
      idleExpiresAt,
      absoluteExpiresAt: command.absoluteExpiresAt,
      correlationId: command.correlationId,
    });
    if (result === "invalid") throw this.invalid(command);
    if (result === "transition_invalid") {
      throw new ConflictException({
        ...this.problem(
          command,
          409,
          "ONBOARDING_TRANSITION_INVALID",
          "MFA cannot be confirmed from the current state",
        ),
      });
    }
    return {
      status: "ENABLED",
      recoveryCodes: rawRecoveryCodes,
      sessionValue,
      csrfValue,
      idleExpiresAt,
      absoluteExpiresAt: command.absoluteExpiresAt,
    };
  }

  private invalid(command: ConfirmMfaEnrollmentCommand): BadRequestException {
    return new BadRequestException(
      this.problem(command, 400, "MFA_CHALLENGE_INVALID", "MFA challenge or code is invalid"),
    );
  }

  private problem(
    command: ConfirmMfaEnrollmentCommand,
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
