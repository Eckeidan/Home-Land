import { createHash, timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { AuthenticatedRequest } from "./session.types.js";

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = process.env.NODE_ENV === "production" ? "__Host-thl_csrf" : "thl_csrf";
    const cookieToken = request.cookies?.[cookieName];
    const headerToken = request.header("x-csrf-token");
    const storedHash = request.identity?.csrfTokenHash;

    if (
      typeof cookieToken !== "string" ||
      typeof headerToken !== "string" ||
      !storedHash ||
      !this.equal(cookieToken, headerToken) ||
      !this.equalBytes(this.hash(headerToken), storedHash)
    ) {
      throw new ForbiddenException({
        type: "/problems/csrf",
        title: "Request authenticity could not be verified",
        status: 403,
        code: "CSRF_TOKEN_INVALID",
      });
    }

    return true;
  }

  private equal(left: string, right: string): boolean {
    return this.equalBytes(Buffer.from(left), Buffer.from(right));
  }

  private equalBytes(left: Uint8Array, right: Uint8Array): boolean {
    return left.byteLength === right.byteLength && timingSafeEqual(left, right);
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }
}
