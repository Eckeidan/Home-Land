import { createHash } from "node:crypto";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type {
  CreateOrganizationCommand,
  OrganizationCreated,
} from "../domain/organization.types.js";
import { OrganizationRepository } from "../infrastructure/organization.repository.js";

@Injectable()
export class CreateOrganizationService {
  constructor(
    @Inject(OrganizationRepository) private readonly repository: OrganizationRepository,
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<OrganizationCreated> {
    const normalized = {
      legalName: command.legalName.trim().replace(/\s+/g, " "),
      displayName: command.displayName.trim().replace(/\s+/g, " "),
      organizationType: command.organizationType,
      primaryStateCode: command.primaryStateCode.toUpperCase(),
      approximateUnitRange: command.approximateUnitRange,
    };
    const result = await this.repository.createOrganizationWithOwner({
      actorUserId: command.actorUserId,
      ...normalized,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      correlationId: command.correlationId,
    });

    if (result.kind === "conflict") {
      throw new ConflictException({
        type: "/problems/idempotency",
        title: "Idempotency key was already used for another request",
        status: 409,
        code: "IDEMPOTENCY_KEY_REUSED",
        correlationId: command.correlationId,
      });
    }
    return result.response;
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value, "utf8").digest());
  }
}
