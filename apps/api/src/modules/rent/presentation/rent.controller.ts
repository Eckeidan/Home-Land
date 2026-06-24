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
import { RentService } from "../application/rent.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { CreateRentObligationDto, RecordPaymentDto, RecordRefundDto } from "./rent.dto.js";
@Controller("organizations/:organizationId/rent")
export class RentController {
  constructor(@Inject(RentService) private readonly service: RentService) {}
  @Get() @UseGuards(SessionGuard, OrganizationMembershipGuard) snapshot(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.service.snapshot(organizationId, request.identity.userId);
  }
  @Post("obligations")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  create(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: CreateRentObligationDto,
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
    return this.service.create({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key,
      correlationId:
        correlation && correlation.length >= 8 && correlation.length <= 128
          ? correlation
          : randomUUID(),
    });
  }
  @Post("payments")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  payment(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: RecordPaymentDto,
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
    return this.service.recordPayment({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key,
      correlationId:
        correlation && correlation.length >= 8 && correlation.length <= 128
          ? correlation
          : randomUUID(),
    });
  }
  @Post("refunds")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  refund(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body() body: RecordRefundDto,
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
    return this.service.recordRefund({
      organizationId,
      actorUserId: request.identity.userId,
      ...body,
      idempotencyKey: key,
      correlationId:
        correlation && correlation.length >= 8 && correlation.length <= 128
          ? correlation
          : randomUUID(),
    });
  }
  @Post("reconciliation/:itemId/resolve")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard, OrganizationMembershipGuard, CsrfGuard)
  resolve(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("itemId", new ParseUUIDPipe({ version: "4" })) itemId: string,
    @Req() request: AuthenticatedRequest,
    @Headers("if-match") ifMatch?: string,
    @Headers("x-correlation-id") correlation?: string,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    const version = ifMatch?.match(/^"([1-9][0-9]*)"$/)?.[1];
    if (!version)
      throw new ConflictException({
        type: "/problems/version",
        title: "A quoted If-Match version is required",
        status: 409,
        code: "IF_MATCH_REQUIRED",
      });
    return this.service.resolveReconciliation({
      organizationId,
      actorUserId: request.identity.userId,
      itemId,
      expectedVersion: Number(version),
      correlationId:
        correlation && correlation.length >= 8 && correlation.length <= 128
          ? correlation
          : randomUUID(),
    });
  }
}
