import type { Request } from "express";

export interface AuthenticatedIdentity {
  sessionId: string;
  userId: string;
  email: string;
  csrfTokenHash: Uint8Array<ArrayBuffer>;
  primaryAuthenticatedAt: Date;
  absoluteExpiresAt: Date;
}

export interface AuthenticatedRequest extends Request {
  identity?: AuthenticatedIdentity;
}
