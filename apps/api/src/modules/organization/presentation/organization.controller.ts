import { randomUUID } from "node:crypto";
import {
  Body,
  ConflictException,
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
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { CreateOrganizationService } from "../application/create-organization.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { CreateOrganizationDto } from "./organization.dto.js";

@Controller("organizations")
export class OrganizationController {
  constructor(
    @Inject(CreateOrganizationService)
    private readonly createOrganization: CreateOrganizationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, CsrfGuard)
  create(
    @Body() body: CreateOrganizationDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") idempotencyKey?: string,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "A valid Idempotency-Key header is required",
        status: 409,
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
    }
    return this.createOrganization.execute({
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  private correlationId(requested?: string): string {
    return requested && requested.length >= 8 && requested.length <= 128 ? requested : randomUUID();
  }
}
