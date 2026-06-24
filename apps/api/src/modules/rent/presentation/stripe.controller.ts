import { randomUUID } from "node:crypto";
import {
  Body,
  ConflictException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { OrganizationMembershipGuard } from "../../../infrastructure/session/organization-membership.guard.js";
import { RequireRoles, RolesGuard } from "../../../infrastructure/session/roles.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { StripeService } from "../application/stripe.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { CreateStripePaymentIntentDto } from "./rent.dto.js";

@Controller("organizations/:organizationId/rent/stripe")
export class StripeIntentController {
  constructor(@Inject(StripeService) private readonly service: StripeService) {}
  @Post("payment-intents")
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles("OWNER", "ACCOUNTANT")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  create(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateStripePaymentIntentDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    if (!key || key.length < 16 || key.length > 128)
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "A valid Idempotency-Key header is required",
        status: 409,
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
    return this.service.createIntent({
      organizationId,
      actorUserId: request.identity.userId,
      allocations: body.allocations,
      idempotencyKey: key,
      correlationId: correlation && correlation.length >= 8 ? correlation : randomUUID(),
    });
  }
}

@Controller("stripe")
export class StripeWebhookController {
  constructor(@Inject(StripeService) private readonly service: StripeService) {}
  @Post("webhooks")
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() request: AuthenticatedRequest & { rawBody?: Buffer },
    @Headers("stripe-signature") signature?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.rawBody)
      throw new ConflictException({
        type: "/problems/stripe",
        title: "Raw webhook body is required",
        status: 400,
        code: "STRIPE_RAW_BODY_REQUIRED",
      });
    return this.service.webhook(
      request.rawBody,
      signature,
      correlation && correlation.length >= 8 ? correlation : randomUUID(),
    );
  }
}
