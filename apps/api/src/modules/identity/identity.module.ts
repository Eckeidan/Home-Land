import { Module } from "@nestjs/common";
import { RegisterUserService } from "./application/register-user.service.js";
import { VerifyEmailService } from "./application/verify-email.service.js";
import { IdentityRepository } from "./infrastructure/identity.repository.js";
import { PasswordHasherService } from "./infrastructure/password-hasher.service.js";
import { SecureTokenService } from "./infrastructure/secure-token.service.js";
import { VerificationMailerService } from "./infrastructure/verification-mailer.service.js";
import { AuthController } from "./presentation/auth.controller.js";

@Module({
  controllers: [AuthController],
  providers: [
    RegisterUserService,
    VerifyEmailService,
    IdentityRepository,
    PasswordHasherService,
    SecureTokenService,
    VerificationMailerService,
  ],
})
export class IdentityModule {}
