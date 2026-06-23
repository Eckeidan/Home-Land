import { createHash } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { BuildingCreated, CreateBuildingCommand } from "../domain/portfolio.types.js";
import { PortfolioRepository } from "../infrastructure/portfolio.repository.js";

@Injectable()
export class CreateBuildingService {
  constructor(@Inject(PortfolioRepository) private readonly repository: PortfolioRepository) {}

  async execute(command: CreateBuildingCommand): Promise<BuildingCreated> {
    const name = command.name.trim().replace(/\s+/g, " ");
    const result = await this.repository.createBuilding({
      ...command,
      name,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(name.toLowerCase()),
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
          this.problem(
            command,
            403,
            "BUILDING_CREATE_FORBIDDEN",
            "Building creation is not permitted",
          ),
        );
      case "workspace_inactive":
        throw new ConflictException(
          this.problem(command, 409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"),
        );
      case "building_conflict":
        throw new ConflictException(
          this.problem(command, 409, "BUILDING_NAME_UNAVAILABLE", "Building name already exists"),
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
            "BUILDING_CREATE_CONCURRENT",
            "Another building request is being processed",
          ),
        );
    }
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }

  private problem(command: CreateBuildingCommand, status: number, code: string, title: string) {
    return {
      type: "/problems/portfolio",
      title,
      status,
      code,
      correlationId: command.correlationId,
    };
  }
}
