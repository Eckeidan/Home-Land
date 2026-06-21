import { createHash } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { SessionRepository } from "./session.repository.js";
import type { AuthenticatedRequest } from "./session.types.js";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(SessionRepository) private readonly sessions: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookieName = process.env.NODE_ENV === "production" ? "__Host-thl_session" : "thl_session";
    const credential = request.cookies?.[cookieName];

    if (typeof credential !== "string" || credential.length < 32) {
      throw this.unauthorized();
    }

    const identity = await this.sessions.findActiveIdentity(this.hash(credential));
    if (!identity) throw this.unauthorized();

    request.identity = identity;
    return true;
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private unauthorized(): UnauthorizedException {
    return new UnauthorizedException({
      type: "/problems/authentication",
      title: "Authentication required",
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
    });
  }
}
