import type { Request } from "express";

export interface AuthenticatedIdentity {
  userId: string;
  email: string;
  csrfTokenHash: Uint8Array<ArrayBuffer>;
}

export interface AuthenticatedRequest extends Request {
  identity?: AuthenticatedIdentity;
}
