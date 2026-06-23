import { Global, Module } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard.js";
import { OrganizationMembershipGuard } from "./organization-membership.guard.js";
import { SessionGuard } from "./session.guard.js";
import { SessionRepository } from "./session.repository.js";

@Global()
@Module({
  providers: [SessionRepository, SessionGuard, CsrfGuard, OrganizationMembershipGuard],
  exports: [SessionRepository, SessionGuard, CsrfGuard, OrganizationMembershipGuard],
})
export class SessionModule {}
