export interface EncryptedSecret {
  ciphertext: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  authTag: Uint8Array<ArrayBuffer>;
  keyVersion: number;
}

export interface BeginMfaEnrollmentCommand {
  userId: string;
  email: string;
  organizationId: string;
  primaryAuthenticatedAt: Date;
  correlationId: string;
}

export interface MfaEnrollmentChallenge {
  enrollmentId: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
  manualSecret: string;
  expiresAt: Date;
}

export interface ConfirmMfaEnrollmentCommand {
  enrollmentId: string;
  userId: string;
  sessionId: string;
  code: string;
  primaryAuthenticatedAt: Date;
  absoluteExpiresAt: Date;
  correlationId: string;
}

export interface AcknowledgeRecoveryCodesCommand {
  enrollmentId: string;
  userId: string;
  correlationId: string;
}
