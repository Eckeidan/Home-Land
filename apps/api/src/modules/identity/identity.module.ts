import { Module } from "@nestjs/common";
import { AcknowledgeRecoveryCodesService } from "./application/acknowledge-recovery-codes.service.js";
import { BeginMfaEnrollmentService } from "./application/begin-mfa-enrollment.service.js";
import { ConfirmMfaEnrollmentService } from "./application/confirm-mfa-enrollment.service.js";
import { RegisterUserService } from "./application/register-user.service.js";
import { VerifyEmailService } from "./application/verify-email.service.js";
import { IdentityRepository } from "./infrastructure/identity.repository.js";
import { MfaRepository } from "./infrastructure/mfa.repository.js";
import { MfaSecretCipherService } from "./infrastructure/mfa-secret-cipher.service.js";
import { PasswordHasherService } from "./infrastructure/password-hasher.service.js";
import { RecoveryCodeService } from "./infrastructure/recovery-code.service.js";
import { SecureTokenService } from "./infrastructure/secure-token.service.js";
import { TotpService } from "./infrastructure/totp.service.js";
import { VerificationMailerService } from "./infrastructure/verification-mailer.service.js";
import { AuthController } from "./presentation/auth.controller.js";
import { MfaController } from "./presentation/mfa.controller.js";

@Module({
  controllers: [AuthController, MfaController],
  providers: [
    AcknowledgeRecoveryCodesService,
    BeginMfaEnrollmentService,
    ConfirmMfaEnrollmentService,
    RegisterUserService,
    VerifyEmailService,
    IdentityRepository,
    MfaRepository,
    MfaSecretCipherService,
    PasswordHasherService,
    SecureTokenService,
    RecoveryCodeService,
    TotpService,
    VerificationMailerService,
  ],
})
export class IdentityModule {}
