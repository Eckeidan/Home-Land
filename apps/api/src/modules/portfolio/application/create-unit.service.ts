import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { CreateUnitCommand, UnitCreated } from "../domain/portfolio.types.js";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

@Injectable()
export class CreateUnitService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(command: CreateUnitCommand): Promise<UnitCreated> {
    const normalized = {
      unitCode: command.unitCode.trim().replace(/\s+/g, " "),
      ...(command.bedrooms !== undefined ? { bedrooms: command.bedrooms } : {}),
      ...(command.bathrooms !== undefined ? { bathrooms: command.bathrooms } : {}),
      ...(command.buildingId ? { buildingId: command.buildingId } : {}),
    };
    const result = await this.repository.createUnit({
      organizationId: command.organizationId,
      propertyId: command.propertyId,
      actorUserId: command.actorUserId,
      ...normalized,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });
    switch (result.kind) {
      case "created":
      case "replayed":
        return result.response;
      case "not_found":
        throw new NotFoundException(
          this.problem(command, 404, "PROPERTY_NOT_FOUND", "Property was not found"),
        );
      case "forbidden":
        throw new ForbiddenException(
          this.problem(command, 403, "UNIT_CREATE_FORBIDDEN", "Unit creation is not permitted"),
        );
      case "workspace_inactive":
        throw new ConflictException(
          this.problem(command, 409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"),
        );
      case "unit_conflict":
        throw new ConflictException(
          this.problem(
            command,
            409,
            "UNIT_CODE_UNAVAILABLE",
            "Unit code already exists for this property",
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
            "UNIT_CREATE_CONCURRENT",
            "Another unit request is already being processed",
          ),
        );
    }
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(command: CreateUnitCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/portfolio",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
