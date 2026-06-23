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
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { CsrfGuard } from "../../../infrastructure/session/csrf.guard.js";
import { OrganizationMembershipGuard } from "../../../infrastructure/session/organization-membership.guard.js";
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { CreateBuildingService } from "../application/create-building.service.js";
import { CreatePortfolioFoundationService } from "../application/create-portfolio-foundation.service.js";
import { CreateUnitService } from "../application/create-unit.service.js";
import { GetPortfolioService } from "../application/get-portfolio.service.js";
import { GetPropertyWorkspaceService } from "../application/get-property-workspace.service.js";
import { ImportUnitsService } from "../application/import-units.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import {
  CreateBuildingDto,
  CreatePortfolioFoundationDto,
  CreateUnitDto,
  ImportUnitsDto,
} from "./portfolio.dto.js";

@Controller("organizations/:organizationId/portfolio")
export class PortfolioController {
  constructor(
    @Inject(CreatePortfolioFoundationService)
    private readonly createFoundation: CreatePortfolioFoundationService,
    @Inject(GetPortfolioService) private readonly getPortfolio: GetPortfolioService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, OrganizationMembershipGuard)
  get(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.getPortfolio.execute(organizationId, request.identity.userId);
  }

  @Post("foundation")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  create(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreatePortfolioFoundationDto,
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
    return this.createFoundation.execute({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey,
      correlationId:
        requestedCorrelationId &&
        requestedCorrelationId.length >= 8 &&
        requestedCorrelationId.length <= 128
          ? requestedCorrelationId
          : randomUUID(),
    });
  }
}

@Controller("organizations/:organizationId/properties")
export class PortfolioPropertyController {
  constructor(
    @Inject(GetPropertyWorkspaceService)
    private readonly getPropertyWorkspace: GetPropertyWorkspaceService,
    @Inject(CreateUnitService) private readonly createUnit: CreateUnitService,
    @Inject(CreateBuildingService) private readonly createBuilding: CreateBuildingService,
    @Inject(ImportUnitsService) private readonly importUnits: ImportUnitsService,
  ) {}

  @Get(":propertyId")
  @UseGuards(SessionGuard, OrganizationMembershipGuard)
  property(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("propertyId", new ParseUUIDPipe({ version: "4" })) propertyId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.getPropertyWorkspace.execute(organizationId, propertyId, request.identity.userId);
  }

  @Post(":propertyId/buildings")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  building(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("propertyId", new ParseUUIDPipe({ version: "4" })) propertyId: string,
    @Body() body: CreateBuildingDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") idempotencyKey?: string,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    this.requireIdempotencyKey(idempotencyKey);
    return this.createBuilding.execute({
      organizationId,
      propertyId,
      actorUserId: request.identity.userId,
      name: body.name,
      idempotencyKey: idempotencyKey as string,
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  @Post(":propertyId/units/import")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  import(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("propertyId", new ParseUUIDPipe({ version: "4" })) propertyId: string,
    @Body() body: ImportUnitsDto,
    @Req() request: AuthenticatedRequest,
    @Headers("idempotency-key") idempotencyKey?: string,
    @Headers("x-correlation-id") requestedCorrelationId?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    if (body.mode === "COMMIT") this.requireIdempotencyKey(idempotencyKey);
    return this.importUnits.execute({
      organizationId,
      propertyId,
      actorUserId: request.identity.userId,
      ...body,
      ...(idempotencyKey ? { idempotencyKey } : {}),
      correlationId: this.correlationId(requestedCorrelationId),
    });
  }

  private requireIdempotencyKey(key?: string): asserts key is string {
    if (!key || key.length < 16 || key.length > 128) {
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "A valid Idempotency-Key header is required",
        status: 409,
        code: "IDEMPOTENCY_KEY_REQUIRED",
      });
    }
  }

  private correlationId(requested?: string): string {
    return requested && requested.length >= 8 && requested.length <= 128 ? requested : randomUUID();
  }

  @Post(":propertyId/units")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  unit(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("propertyId", new ParseUUIDPipe({ version: "4" })) propertyId: string,
    @Body() body: CreateUnitDto,
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
    return this.createUnit.execute({
      organizationId,
      propertyId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey,
      correlationId:
        requestedCorrelationId &&
        requestedCorrelationId.length >= 8 &&
        requestedCorrelationId.length <= 128
          ? requestedCorrelationId
          : randomUUID(),
    });
  }
}
