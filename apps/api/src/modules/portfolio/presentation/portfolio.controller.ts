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
import { SessionGuard } from "../../../infrastructure/session/session.guard.js";
import type { AuthenticatedRequest } from "../../../infrastructure/session/session.types.js";
import { CreatePortfolioFoundationService } from "../application/create-portfolio-foundation.service.js";
import { GetPortfolioService } from "../application/get-portfolio.service.js";
// biome-ignore lint/style/useImportType: NestJS validation requires DTO runtime metadata.
import { CreatePortfolioFoundationDto } from "./portfolio.dto.js";

@Controller("organizations/:organizationId/portfolio")
export class PortfolioController {
  constructor(
    @Inject(CreatePortfolioFoundationService)
    private readonly createFoundation: CreatePortfolioFoundationService,
    @Inject(GetPortfolioService) private readonly getPortfolio: GetPortfolioService,
  ) {}

  @Get()
  @UseGuards(SessionGuard)
  get(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.identity) throw new UnauthorizedException();
    return this.getPortfolio.execute(organizationId, request.identity.userId);
  }

  @Post("foundation")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SessionGuard, CsrfGuard)
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
