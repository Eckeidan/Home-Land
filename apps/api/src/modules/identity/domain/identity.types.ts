export interface RegistrationCommand {
  fullName: string;
  email: string;
  acceptedTermsVersion: string;
  correlationId: string;
}

export interface VerificationCommand {
  token: string;
  correlationId: string;
}

export interface VerificationDelivery {
  email: string;
  token: string;
  temporaryPassword: string;
}

export interface SessionCredential {
  value: string;
  csrfValue: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}
