import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type {
  CreatePortfolioFoundationCommand,
  PortfolioFoundationCreated,
} from "../domain/portfolio.types.js";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

const usStateCodes = new Set([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
]);

@Injectable()
export class CreatePortfolioFoundationService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(command: CreatePortfolioFoundationCommand): Promise<PortfolioFoundationCreated> {
    const normalized = {
      propertyName: this.space(command.propertyName),
      propertyType: command.propertyType,
      addressLine1: this.space(command.address.line1),
      ...(command.address.line2?.trim() ? { addressLine2: this.space(command.address.line2) } : {}),
      city: this.space(command.address.city),
      stateCode: command.address.stateCode.toUpperCase(),
      postalCode: command.address.postalCode.trim(),
      timeZone: this.timeZone(command.timeZone, command),
      unitCode: this.space(command.unitCode),
    };
    if (!usStateCodes.has(normalized.stateCode)) {
      throw new UnprocessableEntityException(
        this.problem(command, 422, "STATE_CODE_INVALID", "State code is not supported"),
      );
    }
    const requestHash = this.hash(JSON.stringify(normalized));
    const addressHash = this.hash(
      [
        normalized.addressLine1.toLowerCase(),
        normalized.addressLine2?.toLowerCase() ?? "",
        normalized.city.toLowerCase(),
        normalized.stateCode,
        normalized.postalCode,
        "US",
      ].join("|"),
    );
    const result = await this.repository.createFoundation({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      ...normalized,
      normalizedAddressHash: addressHash,
      keyHash: this.hash(command.idempotencyKey),
      requestHash,
      correlationId: command.correlationId,
    });
    switch (result.kind) {
      case "created":
      case "replayed":
        return result.response;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
        );
      case "forbidden":
        throw new ForbiddenException(
          this.problem(
            command,
            403,
            "PORTFOLIO_CREATE_FORBIDDEN",
            "Portfolio creation is not permitted",
          ),
        );
      case "state_invalid":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "ONBOARDING_TRANSITION_INVALID",
            "Portfolio foundation cannot be created from the current state",
          ),
        );
      case "idempotency_conflict":
        throw new ConflictException(
          this.problem(command, 409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"),
        );
      case "concurrent_request":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "PORTFOLIO_CONCURRENT_REQUEST",
            "Another portfolio request is already being processed",
          ),
        );
    }
  }

  private timeZone(value: string, command: CreatePortfolioFoundationCommand): string {
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
    } catch {
      throw new UnprocessableEntityException(
        this.problem(
          command,
          422,
          "TIME_ZONE_INVALID",
          "Time zone must be a valid IANA identifier",
        ),
      );
    }
  }

  private space(value: string): string {
    return value.trim().replace(/\s+/g, " ");
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(
    command: CreatePortfolioFoundationCommand,
    status: number,
    code: string,
    title: string,
  ) {
    return {
      type: "/problems/portfolio",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
