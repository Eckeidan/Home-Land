import { randomUUID } from "node:crypto";
import {
  Body,
  Controller,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { AcknowledgeRecoveryCodesService } from "../application/acknowledge-recovery-codes.service.js";
import { BeginMfaEnrollmentService } from "../application/begin-mfa-enrollment.service.js";
import { ConfirmMfaEnrollmentService } from "../application/confirm-mfa-enrollment.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import {
  AcknowledgeRecoveryCodesDto,
  BeginMfaEnrollmentDto,
  ConfirmMfaEnrollmentDto,
} from "./auth.dto.js";

@Controller("auth/mfa/enrollments")
@UseGuards(SessionGuard, CsrfGuard)
export class MfaController {
  constructor(
    @Inject(BeginMfaEnrollmentService) private readonly beginEnrollment: BeginMfaEnrollmentService,
    @Inject(ConfirmMfaEnrollmentService)
    private readonly confirmEnrollment: ConfirmMfaEnrollmentService,
    @Inject(AcknowledgeRecoveryCodesService)
    private readonly acknowledgeRecovery: AcknowledgeRecoveryCodesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  begin(
    @Body() body: BeginMfaEnrollmentDto,
    @Req() request: AuthenticatedRequest,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    const identity = this.identity(request);
    return this.beginEnrollment.execute({
      userId: identity.userId,
      email: identity.email,
      organizationId: body.organizationId,
      primaryAuthenticatedAt: identity.primaryAuthenticatedAt,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  @Post(":enrollmentId/confirm")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirm(
    @Param("enrollmentId", new ParseUUIDPipe({ version: "4" })) enrollmentId: string,
    @Body() body: ConfirmMfaEnrollmentDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    const identity = this.identity(request);
    const confirmation = await this.confirmEnrollment.execute({
      enrollmentId,
      userId: identity.userId,
      sessionId: identity.sessionId,
      code: body.code,
      primaryAuthenticatedAt: identity.primaryAuthenticatedAt,
      absoluteExpiresAt: identity.absoluteExpiresAt,
      correlationId: this.correlationId(requestedCorrelationId),
    });
    this.setSessionCookies(response, confirmation);
    return { status: confirmation.status, recoveryCodes: confirmation.recoveryCodes };
  }

  @Post(":enrollmentId/recovery-codes/acknowledgements")
  @HttpCode(HttpStatus.OK)
  acknowledge(
    @Param("enrollmentId", new ParseUUIDPipe({ version: "4" })) enrollmentId: string,
    @Body() _body: AcknowledgeRecoveryCodesDto,
    @Req() request: AuthenticatedRequest,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    const identity = this.identity(request);
    return this.acknowledgeRecovery.execute({
      enrollmentId,
      userId: identity.userId,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  private identity(request: AuthenticatedRequest) {
    if (!request.identity) throw new UnauthorizedException();
    return request.identity;
  }

  private setSessionCookies(
    response: Response,
    session: { sessionValue: string; csrfValue: string; absoluteExpiresAt: Date },
  ) {
    const production = process.env.NODE_ENV === "production";
    response.cookie(production ? "__Host-thl_session" : "thl_session", session.sessionValue, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      expires: session.absoluteExpiresAt,
    });
    response.cookie(production ? "__Host-thl_csrf" : "thl_csrf", session.csrfValue, {
      httpOnly: false,
      secure: production,
      sameSite: "strict",
      path: "/",
      expires: session.absoluteExpiresAt,
    });
  }

  private correlationId(requested?: string): string {
    return requested && requested.length >= 8 && requested.length <= 128 ? requested : randomUUID();
  }
}
