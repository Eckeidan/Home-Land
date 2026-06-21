export interface RegistrationCommand {
  fullName: string;
  email: string;
  password: string;
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
}

export interface SessionCredential {
  value: string;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
}
