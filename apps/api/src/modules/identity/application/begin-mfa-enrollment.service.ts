import { randomUUID } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import QRCode from "qrcode";
import type { BeginMfaEnrollmentCommand, MfaEnrollmentChallenge } from "../domain/mfa.types.js";
import { MfaRepository } from "../infrastructure/mfa.repository.js";
import { MfaSecretCipherService } from "../infrastructure/mfa-secret-cipher.service.js";
import { TotpService } from "../infrastructure/totp.service.js";

@Injectable()
export class BeginMfaEnrollmentService {
  constructor(
    @Inject(MfaRepository) private readonly repository: MfaRepository,
    @Inject(MfaSecretCipherService) private readonly cipher: MfaSecretCipherService,
    @Inject(TotpService) private readonly totp: TotpService,
  ) {}

  async execute(command: BeginMfaEnrollmentCommand): Promise<MfaEnrollmentChallenge> {
    const recentAuthenticationMinutes = Number.parseInt(
      process.env.MFA_RECENT_AUTH_MINUTES ?? "10",
      10,
    );
    if (
      Date.now() - command.primaryAuthenticatedAt.getTime() >
      recentAuthenticationMinutes * 60_000
    ) {
      throw new ForbiddenException(
        this.problem(
          command,
          403,
          "RECENT_AUTHENTICATION_REQUIRED",
          "Recent authentication is required",
        ),
      );
    }
    const enrollmentId = randomUUID();
    const secret = this.totp.generateSecret();
    const context = `${command.userId}:${command.organizationId}:${enrollmentId}`;
    const encrypted = this.cipher.encrypt(secret, context);
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const result = await this.repository.beginEnrollment({
      enrollmentId,
      userId: command.userId,
      organizationId: command.organizationId,
      expiresAt,
      correlationId: command.correlationId,
      ...encrypted,
    });
    if (result === "not_found") {
      throw new NotFoundException(
        this.problem(command, 404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
      );
    }
    if (result === "transition_invalid") {
      throw new ConflictException(
        this.problem(
          command,
          409,
          "ONBOARDING_TRANSITION_INVALID",
          "MFA enrollment cannot start from the current state",
        ),
      );
    }
    const provisioningUri = this.totp.provisioningUri(secret, command.email);
    return {
      enrollmentId,
      provisioningUri,
      qrCodeDataUrl: await QRCode.toDataURL(provisioningUri, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 240,
      }),
      manualSecret: secret,
      expiresAt,
    };
  }

  private problem(command: BeginMfaEnrollmentCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/mfa-enrollment",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
