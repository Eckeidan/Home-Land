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
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { AcceptInvitationService } from "../application/accept-invitation.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { AcceptInvitationDto } from "./organization.dto.js";

@Controller("organization-invitations")
export class InvitationAcceptanceController {
  constructor(
    @Inject(AcceptInvitationService) private readonly acceptInvitation: AcceptInvitationService,
  ) {}

  @Post("acceptances")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(
    @Body() body: AcceptInvitationDto,
    @Req() request: AuthenticatedRequest,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.acceptInvitation.execute({
      userId: request.identity.userId,
      email: request.identity.email,
      token: body.token,
      correlationId:
        requestedCorrelationId &&
        requestedCorrelationId.length >= 8 &&
        requestedCorrelationId.length <= 128
          ? requestedCorrelationId
          : randomUUID(),
    });
  }
}
