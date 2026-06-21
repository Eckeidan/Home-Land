import { randomUUID } from "node:crypto";
import { Body, Controller, Headers, HttpCode, HttpStatus, Inject, Post, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { RegisterUserService } from "../application/register-user.service.js";
import { VerifyEmailService } from "../application/verify-email.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { RegisterUserDto, VerifyEmailDto } from "./auth.dto.js";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(RegisterUserService) private readonly registerUser: RegisterUserService,
    @Inject(VerifyEmailService) private readonly verifyEmail: VerifyEmailService,
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

    return { status: "VERIFIED", nextPath: "/onboarding/organization" };
  }

  private correlationId(requested?: string): string {
    if (requested && requested.length >= 8 && requested.length <= 128) {
      return requested;
    }
    return randomUUID();
  }
}
