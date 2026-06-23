import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import type {
  CreateMaintenanceRequestCommand,
  MaintenanceTransitionCommand,
} from "../domain/maintenance.types.js";
import { MaintenanceRepository } from "../infrastructure/maintenance.repository.js";

@Injectable()
export class MaintenanceService {
  constructor(@Inject(MaintenanceRepository) private readonly repository: MaintenanceRepository) {}

  async snapshot(organizationId: string, actorUserId: string) {
    const snapshot = await this.repository.snapshot(organizationId, actorUserId);
    if (!snapshot)
      throw new NotFoundException(
        this.problem(404, "ORGANIZATION_NOT_FOUND", "Organization was not found"),
      );
    if ("forbidden" in snapshot)
      throw new ForbiddenException(
        this.problem(403, "MAINTENANCE_READ_FORBIDDEN", "Maintenance read is not permitted"),
      );
    return snapshot;
  }

  async create(command: CreateMaintenanceRequestCommand) {
    const normalized = {
      propertyId: command.propertyId,
      ...(command.unitId ? { unitId: command.unitId } : {}),
      ...(command.tenantProfileId ? { tenantProfileId: command.tenantProfileId } : {}),
      title: this.space(command.title),
      description: this.space(command.description),
      priority: command.priority,
    };
    const result = await this.repository.create({
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      ...normalized,
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
    });
    if (result.kind === "created" || result.kind === "replayed") return result.response;
    throw this.map(result, command.correlationId);
  }

  async transition(command: MaintenanceTransitionCommand) {
    const scheduledFor = command.scheduledFor ? new Date(command.scheduledFor) : undefined;
    if (
      scheduledFor &&
      (!Number.isFinite(scheduledFor.valueOf()) || scheduledFor < new Date(Date.now() - 5 * 60_000))
    )
      throw new BadRequestException(
        this.problem(
          400,
          "SCHEDULE_INVALID",
          "Schedule must be a valid future instant",
          command.correlationId,
        ),
      );
    const normalized = {
      action: command.action,
      expectedVersion: command.expectedVersion,
      ...(command.assignedVendorName
        ? { assignedVendorName: this.space(command.assignedVendorName) }
        : {}),
      ...(command.assignedVendorEmail
        ? { assignedVendorEmail: command.assignedVendorEmail.trim().toLowerCase() }
        : {}),
      ...(scheduledFor ? { scheduledFor: scheduledFor.toISOString() } : {}),
    };
    const input = {
      organizationId: command.organizationId,
      actorUserId: command.actorUserId,
      requestId: command.requestId,
      action: command.action,
      expectedVersion: command.expectedVersion,
      ...(normalized.assignedVendorName
        ? { assignedVendorName: normalized.assignedVendorName }
        : {}),
      ...(normalized.assignedVendorEmail
        ? { assignedVendorEmail: normalized.assignedVendorEmail }
        : {}),
      keyHash: this.hash(command.idempotencyKey),
      requestHash: this.hash(JSON.stringify(normalized)),
      ...(scheduledFor ? { scheduledFor } : {}),
    };
    const result = await this.repository.transition(input);
    if (result.kind === "transitioned" || result.kind === "replayed") return result.response;
    throw this.map(result, command.correlationId);
  }

  private map(result: { kind: string; currentVersion?: number }, correlationId: string) {
    if (result.kind === "version_mismatch")
      return new PreconditionFailedException({
        ...this.problem(
          412,
          "VERSION_MISMATCH",
          "Maintenance request version does not match",
          correlationId,
        ),
        currentVersion: result.currentVersion,
      });
    const values: Record<string, [number, string, string]> = {
      not_found: [404, "MAINTENANCE_NOT_FOUND", "Maintenance resource was not found"],
      forbidden: [403, "MAINTENANCE_FORBIDDEN", "Maintenance operation is not permitted"],
      workspace_inactive: [409, "WORKSPACE_NOT_ACTIVE", "Workspace must be active"],
      resource_invalid: [
        409,
        "MAINTENANCE_RESOURCE_INVALID",
        "Property, unit, or tenant is invalid",
      ],
      state_invalid: [409, "MAINTENANCE_STATE_INVALID", "Maintenance transition is invalid"],
      idempotency_conflict: [409, "IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used"],
      concurrent: [409, "MAINTENANCE_CONCURRENT", "Another maintenance request is being processed"],
    };
    const [status, code, title] = values[result.kind] ?? [
      409,
      "MAINTENANCE_CONFLICT",
      "Maintenance request conflicted",
    ];
    const body = this.problem(status, code, title, correlationId);
    if (status === 404) return new NotFoundException(body);
    if (status === 403) return new ForbiddenException(body);
    return new ConflictException(body);
  }

  private hash(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(value).digest());
  }
  private space(value: string) {
    return value.trim().replace(/\s+/g, " ");
  }
  private problem(status: number, code: string, title: string, correlationId?: string) {
    return { type: "/problems/maintenance", title, status, code, correlationId };
  }
}
