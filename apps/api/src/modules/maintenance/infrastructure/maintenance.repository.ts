import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type { MaintenanceAction, MaintenancePriority } from "../domain/maintenance.types.js";
import { nextMaintenanceStatus } from "../domain/maintenance-state-machine.js";

interface CreateInput {
  organizationId: string;
  actorUserId: string;
  propertyId: string;
  unitId?: string;
  tenantProfileId?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
}

interface TransitionInput {
  organizationId: string;
  actorUserId: string;
  requestId: string;
  action: MaintenanceAction;
  expectedVersion: number;
  assignedVendorName?: string;
  assignedVendorEmail?: string;
  scheduledFor?: Date;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
}

export type MaintenanceResult =
  | { kind: "created" | "transitioned" | "replayed"; response: unknown }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "resource_invalid"
        | "state_invalid"
        | "version_mismatch"
        | "idempotency_conflict"
        | "concurrent";
      currentVersion?: number;
    };

@Injectable()
export class MaintenanceRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async snapshot(organizationId: string, actorUserId: string) {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: { role: true, organization: { select: { displayName: true, slug: true } } },
    });
    if (!membership) return null;
    if (!["OWNER", "PROPERTY_MANAGER", "MAINTENANCE_MANAGER"].includes(membership.role))
      return { forbidden: true };
    const [properties, tenants, requests] = await Promise.all([
      this.database.property.findMany({
        where: { organizationId, status: "ACTIVE" },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          units: { select: { id: true, unitCode: true }, orderBy: { unitCode: "asc" } },
        },
      }),
      this.database.tenantProfile.findMany({
        where: { organizationId, status: "ACTIVE" },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      this.database.maintenanceRequest.findMany({
        where: { organizationId },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          assignedVendorName: true,
          assignedVendorEmail: true,
          scheduledFor: true,
          completedAt: true,
          verifiedAt: true,
          closedAt: true,
          createdAt: true,
          version: true,
          property: { select: { name: true } },
          unit: { select: { unitCode: true } },
          tenantProfile: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    return {
      organization: membership.organization,
      properties: properties.map((property) => ({
        ...property,
        units: property.units.map((unit) => ({ id: unit.id, label: `Unit ${unit.unitCode}` })),
      })),
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        label: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
      })),
      requests: requests.map((request) => ({
        id: request.id,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: request.status,
        propertyName: request.property.name,
        unitCode: request.unit?.unitCode ?? null,
        tenantName: request.tenantProfile
          ? `${request.tenantProfile.firstName} ${request.tenantProfile.lastName}`
          : null,
        assignedVendorName: request.assignedVendorName,
        assignedVendorEmail: request.assignedVendorEmail,
        scheduledFor: request.scheduledFor?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
        verifiedAt: request.verifiedAt?.toISOString() ?? null,
        closedAt: request.closedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString(),
        version: Number(request.version),
      })),
    };
  }

  async create(input: CreateInput): Promise<MaintenanceResult> {
    const scope = `maintenance.request.create.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (!["OWNER", "PROPERTY_MANAGER", "MAINTENANCE_MANAGER"].includes(membership.role))
          return { kind: "forbidden" };
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
            return { kind: "idempotency_conflict" };
          return { kind: "replayed", response: existing.response as unknown };
        }
        const property = await tx.property.findFirst({
          where: { id: input.propertyId, organizationId: input.organizationId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!property) return { kind: "resource_invalid" };
        if (input.unitId) {
          const unit = await tx.unit.findFirst({
            where: {
              id: input.unitId,
              organizationId: input.organizationId,
              propertyId: input.propertyId,
            },
            select: { id: true },
          });
          if (!unit) return { kind: "resource_invalid" };
        }
        if (input.tenantProfileId) {
          const tenant = await tx.tenantProfile.findFirst({
            where: {
              id: input.tenantProfileId,
              organizationId: input.organizationId,
              status: "ACTIVE",
            },
            select: { id: true },
          });
          if (!tenant) return { kind: "resource_invalid" };
        }
        const createData = {
          organizationId: input.organizationId,
          propertyId: input.propertyId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          ...(input.unitId ? { unitId: input.unitId } : {}),
          ...(input.tenantProfileId ? { tenantProfileId: input.tenantProfileId } : {}),
        };
        const request = await tx.maintenanceRequest.create({
          data: createData,
          select: { id: true, status: true, version: true },
        });
        const response = {
          id: request.id,
          status: request.status,
          version: Number(request.version),
        };
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: response as object,
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response };
      });
    } catch {
      return { kind: "concurrent" };
    }
  }

  async transition(input: TransitionInput): Promise<MaintenanceResult> {
    const scope = `maintenance.request.${input.action}.v1:${input.organizationId}:${input.requestId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (!["OWNER", "PROPERTY_MANAGER", "MAINTENANCE_MANAGER"].includes(membership.role))
          return { kind: "forbidden" };
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existing) {
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
            return { kind: "idempotency_conflict" };
          return { kind: "replayed", response: existing.response as unknown };
        }
        const current = await tx.maintenanceRequest.findFirst({
          where: { id: input.requestId, organizationId: input.organizationId },
          select: { status: true, version: true },
        });
        if (!current) return { kind: "not_found" };
        if (Number(current.version) !== input.expectedVersion)
          return { kind: "version_mismatch", currentVersion: Number(current.version) };
        const next = nextMaintenanceStatus(input.action, current.status);
        if (!next) return { kind: "state_invalid" };
        const updateData = {
          status: next,
          version: { increment: 1 },
          ...(input.assignedVendorName ? { assignedVendorName: input.assignedVendorName } : {}),
          ...(input.assignedVendorEmail ? { assignedVendorEmail: input.assignedVendorEmail } : {}),
          ...(input.scheduledFor ? { scheduledFor: input.scheduledFor } : {}),
          ...(input.action === "complete" ? { completedAt: new Date() } : {}),
          ...(input.action === "verify" ? { verifiedAt: new Date() } : {}),
          ...(input.action === "close" ? { closedAt: new Date() } : {}),
        };
        const updated = await tx.maintenanceRequest.update({
          where: {
            organizationId_id: { organizationId: input.organizationId, id: input.requestId },
          },
          data: updateData,
          select: { id: true, status: true, version: true },
        });
        const response = {
          id: updated.id,
          status: updated.status,
          version: Number(updated.version),
        };
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: response as object,
            statusCode: 200,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "transitioned", response };
      });
    } catch {
      return { kind: "concurrent" };
    }
  }
}
