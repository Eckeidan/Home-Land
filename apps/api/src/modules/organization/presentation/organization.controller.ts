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
  Patch,
  Post,
  PreconditionFailedException,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { OrganizationMembershipGuard } from "../../../infrastructure/session/organization-membership.guard.js";
import { RequireRoles, RolesGuard } from "../../../infrastructure/session/roles.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { ConfigureWorkspaceService } from "../application/configure-workspace.service.js";
import { CreateInvitationService } from "../application/create-invitation.service.js";
import { CreateOrganizationService } from "../application/create-organization.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import {
  ConfigureWorkspaceDto,
  CreateInvitationDto,
  CreateOrganizationDto,
} from "./organization.dto.js";

@Controller("organizations")
export class OrganizationController {
  constructor(
    @Inject(CreateOrganizationService)
    private readonly createOrganization: CreateOrganizationService,
    @Inject(ConfigureWorkspaceService)
    private readonly configureWorkspace: ConfigureWorkspaceService,
    @Inject(CreateInvitationService)
    private readonly createInvitation: CreateInvitationService,
  ) {}

  @Post(":organizationId/invitations")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequireRoles("OWNER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
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

  @Patch(":organizationId/workspace")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  invite(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateInvitationDto,
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
    return this.createInvitation.execute({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  @Patch(":organizationId/workspace")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  configure(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: ConfigureWorkspaceDto,
    @Req() request: AuthenticatedRequest,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    const version = ifMatch?.match(/^"([1-9][0-9]*)"$/)?.[1];
    if (!version) {
      throw new PreconditionFailedException({
        type: "/problems/version",
        title: "A quoted If-Match version is required",
        status: 412,
        code: "IF_MATCH_REQUIRED",
        correlationId: this.correlationId(requestedCorrelationId),
      });
    }
    return this.configureWorkspace.execute({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      expectedVersion: Number(version),
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  private correlationId(requested?: string): string {
    return requested && requested.length >= 8 && requested.length <= 128 ? requested : randomUUID();
  }
}
