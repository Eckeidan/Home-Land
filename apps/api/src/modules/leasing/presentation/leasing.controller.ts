import { randomUUID } from "node:crypto";
import {
  Body,
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
import { Throttle } from "@nestjs/throttler";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { OrganizationMembershipGuard } from "../../../infrastructure/session/organization-membership.guard.js";
import { RequireRoles, RolesGuard } from "../../../infrastructure/session/roles.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { LeasingService } from "../application/leasing.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { AcceptTenantInvitationDto, CreateLeaseDraftDto, CreateTenantDto } from "./leasing.dto.js";

@Controller("organizations/:organizationId/leasing")
export class LeasingController {
  constructor(@Inject(LeasingService) private readonly service: LeasingService) {}
  @Get() @UseGuards(SessionGuard, OrganizationMembershipGuard) snapshot(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.service.snapshot(organizationId, request.identity.userId);
  }
  @Post("tenants")
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  tenant(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateTenantDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    this.key(key);
    return this.service.createTenant({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key as string,
      correlationId: this.correlation(correlation),
    });
  }
  @Post("leases")
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  lease(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateLeaseDraftDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    this.key(key);
    return this.service.createLease({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key as string,
      correlationId: this.correlation(correlation),
    });
  }
  @Post("leases/:leaseId/validate")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  validate(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("leaseId", new ParseUUIDPipe({ version: "4" })) leaseId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    return this.transition("validate", organizationId, leaseId, request, key, ifMatch, correlation);
  }
  @Post("leases/:leaseId/activate")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  activate(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("leaseId", new ParseUUIDPipe({ version: "4" })) leaseId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    return this.transition("activate", organizationId, leaseId, request, key, ifMatch, correlation);
  }
  @Post("leases/:leaseId/renewal-marker")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  renewal(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("leaseId", new ParseUUIDPipe({ version: "4" })) leaseId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    return this.transition(
      "renewal-marker",
      organizationId,
      leaseId,
      request,
      key,
      ifMatch,
      correlation,
    );
  }
  @Post("leases/:leaseId/terminate")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER", "PROPERTY_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  terminate(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("leaseId", new ParseUUIDPipe({ version: "4" })) leaseId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    return this.transition(
      "terminate",
      organizationId,
      leaseId,
      request,
      key,
      ifMatch,
      correlation,
    );
  }
  private transition(
    action: "validate" | "activate" | "renewal-marker" | "terminate",
    organizationId: string,
    leaseId: string,
    request: AuthenticatedRequest,
    key?: string,
    ifMatch?: string,
    correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    this.key(key);
    const version = ifMatch?.match(/^"([1-9][0-9]*)"$/)?.[1];
    if (!version)
      throw new PreconditionFailedException({
        type: "/problems/version",
        title: "A quoted If-Match version is required",
        status: 412,
        code: "IF_MATCH_REQUIRED",
      });
    const command = {
      organizationId,
      leaseId,
      actorUserId: request.identity.userId,
      expectedVersion: Number(version),
      idempotencyKey: key as string,
      correlationId: this.correlation(correlation),
    };
    if (action === "activate") return this.service.activateLease(command);
    if (action === "validate") return this.service.validateLease(command);
    if (action === "terminate") return this.service.terminateLease(command);
    return this.service.markLeaseRenewal(command);
  }
  private key(value?: string): asserts value is string {
    if (!value || value.length < 16 || value.length > 128)
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "A valid Idempotency-Key header is required",
        status: 409,
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
  }
  private correlation(value?: string) {
    return value && value.length >= 8 && value.length <= 128 ? value : randomUUID();
  }
}

@Controller("tenant-invitations")
export class TenantInvitationController {
  constructor(@Inject(LeasingService) private readonly service: LeasingService) {}
  @Post("acceptances")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(
    @Body() body: AcceptTenantInvitationDto,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    return this.service.acceptInvitation(
      body.token,
      correlation && correlation.length >= 8 ? correlation : randomUUID(),
    );
  }
}
