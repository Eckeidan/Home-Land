import { Global, Module } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard.js";
import { OrganizationMembershipGuard } from "./organization-membership.guard.js";
import { RolesGuard } from "./roles.guard.js";
import { SessionGuard } from "./session.guard.js";
import { SessionRepository } from "./session.repository.js";

@Global()
@Module({
  providers: [SessionRepository, SessionGuard, CsrfGuard, OrganizationMembershipGuard, RolesGuard],
  exports: [SessionRepository, SessionGuard, CsrfGuard, OrganizationMembershipGuard, RolesGuard],
})
export class SessionModule {}
