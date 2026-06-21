import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { SessionCredential, VerificationCommand } from "../domain/identity.types.js";
import { IdentityRepository } from "../infrastructure/identity.repository.js";
import { SecureTokenService } from "../infrastructure/secure-token.service.js";

@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(SecureTokenService) private readonly tokens: SecureTokenService,
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
  ) {}

  async execute(command: VerificationCommand): Promise<SessionCredential> {
    const sessionValue = this.tokens.generate();
    const now = Date.now();
    const idleMinutes = Number.parseInt(process.env.SESSION_IDLE_TTL_MINUTES ?? "60", 10);
    const absoluteHours = Number.parseInt(process.env.SESSION_ABSOLUTE_TTL_HOURS ?? "24", 10);
    const idleExpiresAt = new Date(now + idleMinutes * 60 * 1000);
    const absoluteExpiresAt = new Date(now + absoluteHours * 60 * 60 * 1000);

    const verified = await this.repository.verifyEmailAndCreateSession({
      tokenHash: this.tokens.hash(command.token),
      sessionHash: this.tokens.hash(sessionValue),
      idleExpiresAt,
      absoluteExpiresAt,
      correlationId: command.correlationId,
    });

    if (!verified) {
      throw new BadRequestException({
        type: "/problems/email-verification",
        title: "Verification link is invalid or expired",
        status: 400,
        code: "AUTH_VERIFICATION_TOKEN_INVALID",
        correlationId: command.correlationId,
      });
    }

    return { value: sessionValue, idleExpiresAt, absoluteExpiresAt };
  }
}
