import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "./session.types.js";

export const REQUIRED_ROLES_KEY = "required_roles";

export type MembershipRole = "OWNER" | "PROPERTY_MANAGER" | "ACCOUNTANT" | "MAINTENANCE_MANAGER";

export const RequireRoles = (...roles: MembershipRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.membership?.role;

    if (!role || !requiredRoles.includes(role as MembershipRole)) {
      throw new ForbiddenException({
        type: "/problems/authorization",
        title: "Your role does not allow this action",
        status: 403,
        code: "ROLE_NOT_ALLOWED",
      });
    }

    return true;
  }
}
