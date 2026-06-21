import { Global, Module } from "@nestjs/common";
import { CsrfGuard } from "./csrf.guard.js";
import { SessionGuard } from "./session.guard.js";
import { SessionRepository } from "./session.repository.js";

@Global()
@Module({
  providers: [SessionRepository, SessionGuard, CsrfGuard],
  exports: [SessionRepository, SessionGuard, CsrfGuard],
})
export class SessionModule {}
