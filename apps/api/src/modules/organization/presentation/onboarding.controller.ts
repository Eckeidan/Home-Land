import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  PreconditionFailedException,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { ActivateWorkspaceService } from "../application/activate-workspace.service.js";
import { GetOnboardingReadinessService } from "../application/get-onboarding-readiness.service.js";

@Controller("organizations/:organizationId/onboarding")
export class OnboardingController {
  constructor(
    @Inject(GetOnboardingReadinessService)
    private readonly getReadiness: GetOnboardingReadinessService,
    @Inject(ActivateWorkspaceService)
    private readonly activateWorkspace: ActivateWorkspaceService,
  ) {}

  @Get("readiness")
  @UseGuards(SessionGuard)
  readiness(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.getReadiness.execute(organizationId, request.identity.userId);
  }

  @Post("activate")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, CsrfGuard)
  activate(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") idempotencyKey?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    const correlationId = this.correlationId(requestedCorrelationId);
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "A valid Idempotency-Key header is required",
        status: 409,
        code: "IDEMPOTENCY_KEY_REQUIRED",
        correlationId,
      });
    }
    const version = ifMatch?.match(/^"([1-9][0-9]*)"$/)?.[1];
    if (!version) {
      throw new PreconditionFailedException({
        type: "/problems/version",
        title: "A quoted If-Match version is required",
        status: 412,
        code: "IF_MATCH_REQUIRED",
        correlationId,
      });
    }
    return this.activateWorkspace.execute({
      organizationId,
      actorUserId: request.identity.userId,
      expectedVersion: Number(version),
      idempotencyKey,
      correlationId,
    });
  }

  private correlationId(requested?: string): string {
    return requested && requested.length >= 8 && requested.length <= 128 ? requested : randomUUID();
  }
}
