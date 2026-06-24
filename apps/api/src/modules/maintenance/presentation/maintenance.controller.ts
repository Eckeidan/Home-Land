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
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { OrganizationMembershipGuard } from "../../../infrastructure/session/organization-membership.guard.js";
import { RequireRoles, RolesGuard } from "../../../infrastructure/session/roles.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { MaintenanceService } from "../application/maintenance.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { CreateMaintenanceRequestDto, MaintenanceTransitionDto } from "./maintenance.dto.js";

@Controller("organizations/:organizationId/maintenance")
export class MaintenanceController {
  constructor(@Inject(MaintenanceService) private readonly service: MaintenanceService) {}

  @Get()
  @UseGuards(SessionGuard, OrganizationMembershipGuard)
  snapshot(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.service.snapshot(organizationId, request.identity.userId);
  }

  @Post("requests")
  @HttpCode(HttpStatus.CREATED)
  @RequireRoles("OWNER", "PROPERTY_MANAGER", "MAINTENANCE_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  create(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateMaintenanceRequestDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    this.key(key);
    return this.service.create({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key as string,
      correlationId: this.correlation(correlation),
    });
  }

  @Post("requests/:requestId/:action")
  @HttpCode(HttpStatus.OK)
  @RequireRoles("OWNER", "PROPERTY_MANAGER", "MAINTENANCE_MANAGER")
  @UseGuards(SessionGuard, OrganizationMembershipGuard, RolesGuard, CsrfGuard)
  transition(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("requestId", new ParseUUIDPipe({ version: "4" })) requestId: string,
    @Param("action") action: "triage" | "assign" | "complete" | "verify" | "close",
    @Body() body: MaintenanceTransitionDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") key?: string,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!["triage", "assign", "complete", "verify", "close"].includes(action))
      throw new ConflictException({
        type: "/problems/maintenance",
        title: "Unsupported action",
        status: 409,
        code: "MAINTENANCE_ACTION_INVALID",
      });
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
    return this.service.transition({
      organizationId,
      actorUserId: request.identity.userId,
      requestId,
      action,
      expectedVersion: Number(version),
      ...body,
      idempotencyKey: key as string,
      correlationId: this.correlation(correlation),
    });
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
