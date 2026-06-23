import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { SessionRepository } from "./session.repository.js";
import type { AuthenticatedRequest } from "./session.types.js";

@Injectable()
export class OrganizationMembershipGuard implements CanActivate {
  constructor(@Inject(SessionRepository) private readonly sessions: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organizationId = request.params?.organizationId;
    const userId = request.identity?.userId;

    if (typeof organizationId !== "string" || typeof userId !== "string") {
      throw this.forbidden();
    }

    const membership = await this.sessions.findActiveMembership(userId, organizationId);

    if (!membership) {
      throw this.forbidden();
    }

    request.membership = membership;
    return true;
  }

  private forbidden(): ForbiddenException {
    return new ForbiddenException({
      type: "/problems/authorization",
      title: "You do not have access to this organization",
      status: 403,
      code: "ORGANIZATION_ACCESS_DENIED",
    });
  }
}
