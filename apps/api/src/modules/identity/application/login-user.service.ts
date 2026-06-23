import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { IdentityRepository } from "../infrastructure/identity.repository.js";
import { PasswordHasherService } from "../infrastructure/password-hasher.service.js";
import { SecureTokenService } from "../infrastructure/secure-token.service.js";

@Injectable()
export class LoginUserService {
  constructor(
    @Inject(IdentityRepository) private readonly repository: IdentityRepository,
    @Inject(PasswordHasherService) private readonly passwords: PasswordHasherService,
    @Inject(SecureTokenService) private readonly tokens: SecureTokenService,
  ) {}

  async execute(command: { email: string; password: string; correlationId: string }) {
    const email = command.email.trim().toLowerCase();
    const user = await this.repository.findActiveCredential(email);
    const valid =
      user?.status === "ACTIVE" &&
      user.emailVerifiedAt &&
      user.passwordCredential &&
      (await this.passwords.verify(user.passwordCredential.passwordHash, command.password));
    if (!valid)
      throw new UnauthorizedException({
        type: "/problems/authentication",
        title: "Invalid email or password",
        status: 401,
        code: "INVALID_CREDENTIALS",
        correlationId: command.correlationId,
      });
    const sessionValue = this.tokens.generate();
    const csrfValue = this.tokens.generate();
    const now = Date.now();
    const idleMinutes = Number.parseInt(process.env.SESSION_IDLE_TTL_MINUTES ?? "60", 10);
    const absoluteHours = Number.parseInt(process.env.SESSION_ABSOLUTE_TTL_HOURS ?? "24", 10);
    const idleExpiresAt = new Date(now + idleMinutes * 60_000);
    const absoluteExpiresAt = new Date(now + absoluteHours * 60 * 60_000);
    const session = await this.repository.createLoginSession({
      email,
      sessionHash: this.tokens.hash(sessionValue),
      csrfTokenHash: this.tokens.hash(csrfValue),
      idleExpiresAt,
      absoluteExpiresAt,
      correlationId: command.correlationId,
    });
    return {
      value: sessionValue,
      csrfValue,
      absoluteExpiresAt,
      organizations: session?.organizations ?? [],
    };
  }
}
