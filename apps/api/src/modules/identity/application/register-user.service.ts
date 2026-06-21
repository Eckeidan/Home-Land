import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { RegistrationCommand } from "../domain/identity.types.js";
import { IdentityRepository } from "../infrastructure/identity.repository.js";
import { PasswordHasherService } from "../infrastructure/password-hasher.service.js";
import { SecureTokenService } from "../infrastructure/secure-token.service.js";
import { VerificationMailerService } from "../infrastructure/verification-mailer.service.js";

export interface RegistrationAccepted {
  status: "ACCEPTED";
  nextAction: "CHECK_EMAIL";
}

@Injectable()
export class RegisterUserService {
  constructor(
    @Inject(PasswordHasherService) private readonly passwordHasher: PasswordHasherService,
    @Inject(SecureTokenService) private readonly tokens: SecureTokenService,
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
    @Inject(VerificationMailerService) private readonly mailer: VerificationMailerService,
  ) {}

  async execute(command: RegistrationCommand): Promise<RegistrationAccepted> {
    const currentTermsVersion = process.env.CURRENT_TERMS_VERSION ?? "2026-06-20";
    if (command.acceptedTermsVersion !== currentTermsVersion) {
      throw new BadRequestException({
        type: "/problems/validation",
        title: "Registration terms are outdated",
        status: 400,
        code: "TERMS_VERSION_OUTDATED",
        correlationId: command.correlationId,
      });
    }

    const email = command.email.trim().toLowerCase();
    const fullName = command.fullName.trim().replace(/\s+/g, " ");
    const passwordHash = await this.passwordHasher.hash(command.password);
    const token = this.tokens.generate();
    let pendingVerification = null;
    try {
      pendingVerification = await this.repository.createOrRefreshPendingRegistration({
        fullName,
        email,
        passwordHash,
        acceptedTermsVersion: command.acceptedTermsVersion,
        tokenHash: this.tokens.hash(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        correlationId: command.correlationId,
      });
    } catch (error) {
      if (!this.isUniqueConstraintConflict(error)) {
        throw error;
      }
    }

    if (pendingVerification) {
      void this.mailer
        .sendVerification({ email: pendingVerification.email, token })
        .catch(() => undefined);
    }

    return { status: "ACCEPTED", nextAction: "CHECK_EMAIL" };
  }

  private isUniqueConstraintConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
