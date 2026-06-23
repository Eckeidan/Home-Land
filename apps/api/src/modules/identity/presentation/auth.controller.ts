import { randomUUID } from "node:crypto";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
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
import { SessionRepository } from "../../../infrastructure/session/session.repository.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { LoginUserService } from "../application/login-user.service.js";
import { RegisterUserService } from "../application/register-user.service.js";
import { VerifyEmailService } from "../application/verify-email.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { LoginUserDto, RegisterUserDto, VerifyEmailDto } from "./auth.dto.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(RegisterUserService) private readonly registerUser: RegisterUserService,
    @Inject(LoginUserService) private readonly loginUser: LoginUserService,
    @Inject(VerifyEmailService) private readonly verifyEmail: VerifyEmailService,
    @Inject(SessionRepository) private readonly sessions: SessionRepository,
  ) {}

  @Post("registrations")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() body: RegisterUserDto,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    return this.registerUser.execute({
      ...body,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  @Post("sessions")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() body: LoginUserDto,
    @Res({ passthrough: true }) response: Response,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    const session = await this.loginUser.execute({
      ...body,
      correlationId: this.correlationId(requestedCorrelationId),
    });
    const isProduction = process.env.NODE_ENV === "production";
    response.cookie(isProduction ? "__Host-thl_session" : "thl_session", session.value, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: session.absoluteExpiresAt,
    });
    response.cookie(isProduction ? "__Host-thl_csrf" : "thl_csrf", session.csrfValue, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      expires: session.absoluteExpiresAt,
    });
    return {
      status: "SIGNED_IN",
      organizations: session.organizations,
      nextPath: session.organizations[0]?.id
        ? `/app/${session.organizations[0].id}`
        : "/onboarding/organization",
    };
  }

  @Post("email-verifications")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(
    @Body() body: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    const session = await this.verifyEmail.execute({
      token: body.token,
      correlationId: this.correlationId(requestedCorrelationId),
    });
    const isProduction = process.env.NODE_ENV === "production";

    response.cookie(isProduction ? "__Host-thl_session" : "thl_session", session.value, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      expires: session.absoluteExpiresAt,
    });
    response.cookie(isProduction ? "__Host-thl_csrf" : "thl_csrf", session.csrfValue, {
      httpOnly: false,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      expires: session.absoluteExpiresAt,
    });

    return {
      status: "VERIFIED",
      nextPath: "/onboarding/organization",
      csrfToken: session.csrfValue,
    };
  }

  @Post("sessions/current/logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, CsrfGuard)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    await this.sessions.revoke(request.identity.sessionId);
    const production = process.env.NODE_ENV === "production";
    response.clearCookie(production ? "__Host-thl_session" : "thl_session", { path: "/" });
    response.clearCookie(production ? "__Host-thl_csrf" : "thl_csrf", { path: "/" });
    return { status: "SIGNED_OUT", nextPath: "/" };
  }

  private correlationId(requested?: string): string {
    if (requested && requested.length >= 8 && requested.length <= 128) {
      return requested;
    }
    return randomUUID();
  }
}
