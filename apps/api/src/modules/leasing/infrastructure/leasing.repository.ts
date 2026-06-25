import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import { assertLeaseActivationPolicy } from "../domain/lease-activation-policy.js";
import { assertLeaseRenewalPolicy } from "../domain/lease-renewal-policy.js";
import { canTransitionLease } from "../domain/lease-state-machine.js";
import type { LeaseDraftSummary, TenantSummary } from "../domain/leasing.types.js";

interface TenantInput {
  organizationId: string;
  actorUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  sendInvitation: boolean;
  tokenHash?: Uint8Array<ArrayBuffer>;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}
interface LeaseInput {
  organizationId: string;
  actorUserId: string;
  propertyId: string;
  unitId: string;
  tenantProfileId: string;
  startDate: Date;
  endDate: Date;
  monthlyRentMinor: number;
  securityDepositMinor: number;
  rentDueDay: number;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}
export type TenantResult =
  | { kind: "created" | "replayed"; response: TenantSummary; organizationName?: string }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "duplicate"
        | "idempotency_conflict"
        | "concurrent";
    };
export type LeaseResult =
  | { kind: "created" | "replayed"; response: LeaseDraftSummary }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "unit_unavailable"
        | "idempotency_conflict"
        | "concurrent";
    };
export type LeaseTransitionResult =
  | { kind: "transitioned" | "replayed"; response: LeaseDraftSummary }
  | {
      kind:
        | "not_found"
        | "forbidden"
        | "workspace_inactive"
        | "requirements_incomplete"
        | "state_invalid"
        | "unit_unavailable"
        | "idempotency_conflict"
        | "concurrent";
    }
  | { kind: "version_mismatch"; currentVersion: number };
interface TransitionInput {
  organizationId: string;
  actorUserId: string;
  leaseId: string;
  expectedVersion: number;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

@Injectable()
export class LeasingRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async snapshot(organizationId: string, actorUserId: string) {
    const member = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: {
        organization: { select: { id: true, displayName: true, slug: true, status: true } },
      },
    });
    if (!member) return null;
    const [tenants, leases, units] = await Promise.all([
      this.database.tenantProfile.findMany({
        where: { organizationId, status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          version: true,
        },
      }),
      this.database.lease.findMany({
        where: {
          organizationId,
          status: { in: ["DRAFT", "READY_FOR_ACTIVATION", "ACTIVE", "TERMINATED"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tenantProfileId: true,
          propertyId: true,
          unitId: true,
          status: true,
          startDate: true,
          endDate: true,
          monthlyRentMinor: true,
          currencyCode: true,
          rentDueDay: true,
          renewalMarkedAt: true,
          version: true,
          tenantProfile: { select: { firstName: true, lastName: true } },
          unit: { select: { unitCode: true } },
        },
      }),
      this.database.unit.findMany({
        where: { organizationId, status: "AVAILABLE" },
        orderBy: { unitCode: "asc" },
        select: {
          id: true,
          propertyId: true,
          unitCode: true,
          property: { select: { name: true } },
        },
      }),
    ]);
    return {
      organization: member.organization,
      tenants: tenants.map((tenant) => ({ ...tenant, version: Number(tenant.version) })),
      leases: leases.map((lease) => ({
        id: lease.id,
        tenantProfileId: lease.tenantProfileId,
        tenantName: `${lease.tenantProfile.firstName} ${lease.tenantProfile.lastName}`,
        propertyId: lease.propertyId,
        unitId: lease.unitId,
        unitCode: lease.unit.unitCode,
        status: lease.status as "DRAFT" | "READY_FOR_ACTIVATION" | "ACTIVE" | "TERMINATED",
        startDate: lease.startDate.toISOString().slice(0, 10),
        endDate: lease.endDate.toISOString().slice(0, 10),
        monthlyRentMinor: lease.monthlyRentMinor,
        currencyCode: "USD" as const,
        rentDueDay: lease.rentDueDay,
        version: Number(lease.version),
        renewalMarkedAt: lease.renewalMarkedAt?.toISOString() ?? null,
      })),
      availableUnits: units.map((unit) => ({
        id: unit.id,
        propertyId: unit.propertyId,
        unitCode: unit.unitCode,
        propertyName: unit.property.name,
      })),
    };
  }

  async createTenant(input: TenantInput): Promise<TenantResult> {
    const scope = `leasing.tenant.create.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (tx) => {
        const membership = await tx.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true, displayName: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER")
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
          return { kind: "replayed", response: existing.response as unknown as TenantSummary };
        }
        if (
          await tx.tenantProfile.findUnique({
            where: {
              organizationId_email: { organizationId: input.organizationId, email: input.email },
            },
            select: { id: true },
          })
        )
          return { kind: "duplicate" };
        const tenant = await tx.tenantProfile.create({
          data: {
            organizationId: input.organizationId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            ...(input.phone ? { phone: input.phone } : {}),
            status: input.sendInvitation ? "INVITED" : "PROSPECT",
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true,
            version: true,
          },
        });
        if (input.sendInvitation && input.tokenHash)
          await tx.tenantInvitation.create({
            data: {
              organizationId: input.organizationId,
              tenantProfileId: tenant.id,
              email: input.email,
              tokenHash: input.tokenHash,
              expiresAt: new Date(Date.now() + 72 * 60 * 60_000),
              invitedById: input.actorUserId,
            },
          });
        const response: TenantSummary = { ...tenant, version: Number(tenant.version) };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "leasing.tenant.created",
            targetType: "TenantProfile",
            targetId: tenant.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { invitationSent: input.sendInvitation },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: "TenantProfileCreated",
            aggregateType: "TenantProfile",
            aggregateId: tenant.id,
            payload: {
              organizationId: input.organizationId,
              tenantProfileId: tenant.id,
              invitationCreated: input.sendInvitation,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response, organizationName: membership.organization.displayName };
      });
    } catch (error) {
      return (await this.resolveUnique(error, input, scope, "duplicate")) as TenantResult;
    }
  }

  async createLease(input: LeaseInput): Promise<LeaseResult> {
    const scope = `leasing.lease-draft.create.v1:${input.organizationId}`;
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
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER")
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
          return { kind: "replayed", response: existing.response as unknown as LeaseDraftSummary };
        }
        const [tenant, unit, activeLease] = await Promise.all([
          tx.tenantProfile.findFirst({
            where: {
              id: input.tenantProfileId,
              organizationId: input.organizationId,
              status: { not: "ARCHIVED" },
            },
            select: { firstName: true, lastName: true },
          }),
          tx.unit.findFirst({
            where: {
              id: input.unitId,
              propertyId: input.propertyId,
              organizationId: input.organizationId,
              status: "AVAILABLE",
            },
            select: { unitCode: true },
          }),
          tx.lease.findFirst({
            where: { organizationId: input.organizationId, unitId: input.unitId, status: "ACTIVE" },
            select: { id: true },
          }),
        ]);
        if (!tenant) return { kind: "not_found" };
        if (!unit || activeLease) return { kind: "unit_unavailable" };
        const lease = await tx.lease.create({
          data: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            unitId: input.unitId,
            tenantProfileId: input.tenantProfileId,
            startDate: input.startDate,
            endDate: input.endDate,
            monthlyRentMinor: input.monthlyRentMinor,
            securityDepositMinor: input.securityDepositMinor,
            rentDueDay: input.rentDueDay,
          },
          select: { id: true, version: true },
        });
        const response: LeaseDraftSummary = {
          id: lease.id,
          tenantProfileId: input.tenantProfileId,
          tenantName: `${tenant.firstName} ${tenant.lastName}`,
          propertyId: input.propertyId,
          unitId: input.unitId,
          unitCode: unit.unitCode,
          status: "DRAFT",
          startDate: input.startDate.toISOString().slice(0, 10),
          endDate: input.endDate.toISOString().slice(0, 10),
          monthlyRentMinor: input.monthlyRentMinor,
          currencyCode: "USD",
          rentDueDay: input.rentDueDay,
          version: Number(lease.version),
          renewalMarkedAt: null,
        };
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "leasing.lease-draft.created",
            targetType: "Lease",
            targetId: lease.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: "LeaseDraftCreated",
            aggregateType: "Lease",
            aggregateId: lease.id,
            payload: {
              organizationId: input.organizationId,
              leaseId: lease.id,
              unitId: input.unitId,
              tenantProfileId: input.tenantProfileId,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "created", response };
      });
    } catch (error) {
      return (await this.resolveUnique(error, input, scope, "concurrent")) as LeaseResult;
    }
  }

  validateLease(input: TransitionInput): Promise<LeaseTransitionResult> {
    return this.transitionLease(input, false);
  }

  activateLease(input: TransitionInput): Promise<LeaseTransitionResult> {
    return this.transitionLease(input, true);
  }

  markLeaseRenewal(input: TransitionInput): Promise<LeaseTransitionResult> {
    return this.lifecycleLease(input, false);
  }

  terminateLease(input: TransitionInput): Promise<LeaseTransitionResult> {
    return this.lifecycleLease(input, true);
  }

  private async lifecycleLease(
    input: TransitionInput,
    terminate: boolean,
  ): Promise<LeaseTransitionResult> {
    const operation = terminate ? "terminate" : "renewal-marker";
    const scope = `leasing.lease.${operation}.v1:${input.organizationId}:${input.leaseId}`;
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
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER")
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
          return { kind: "replayed", response: existing.response as unknown as LeaseDraftSummary };
        }
        const lease = await tx.lease.findFirst({
          where: { id: input.leaseId, organizationId: input.organizationId },
          select: {
            id: true,
            status: true,
            version: true,
            propertyId: true,
            unitId: true,
            tenantProfileId: true,
            startDate: true,
            endDate: true,
            monthlyRentMinor: true,
            rentDueDay: true,
            renewalMarkedAt: true,
            tenantProfile: { select: { firstName: true, lastName: true } },
            unit: { select: { unitCode: true, status: true } },
          },
        });
        if (!lease) return { kind: "not_found" };
        if (terminate && lease.status === "TERMINATED")
          return { kind: "replayed", response: this.leaseResponse(lease, "TERMINATED") };
        if (!terminate) {
          try {
            assertLeaseRenewalPolicy({
              leaseStatus: lease.status,
              renewalMarkedAt: lease.renewalMarkedAt,
              endDate: lease.endDate,
              now: new Date(lease.endDate.getTime() - 90 * 24 * 60 * 60 * 1000),
            });
          } catch {
            if (lease.status === "ACTIVE" && lease.renewalMarkedAt) {
              return { kind: "replayed", response: this.leaseResponse(lease, "ACTIVE") };
            }

            return { kind: "state_invalid" };
          }
        }

        if (!canTransitionLease(lease.status, operation)) return { kind: "state_invalid" };
        if (!canTransitionLease(lease.status, operation)) return { kind: "state_invalid" };
        const currentVersion = Number(lease.version);
        if (currentVersion !== input.expectedVersion)
          return { kind: "version_mismatch", currentVersion };
        const changedAt = new Date();
        if (terminate) {
          const released = await tx.unit.updateMany({
            where: {
              id: lease.unitId,
              organizationId: input.organizationId,
              propertyId: lease.propertyId,
              status: "OCCUPIED",
            },
            data: { status: "AVAILABLE", version: { increment: 1 } },
          });
          if (released.count !== 1) return { kind: "unit_unavailable" };
        }
        const transitioned = await tx.lease.updateMany({
          where: {
            id: lease.id,
            organizationId: input.organizationId,
            status: "ACTIVE",
            version: lease.version,
            ...(!terminate ? { renewalMarkedAt: null } : {}),
          },
          data: terminate
            ? { status: "TERMINATED", version: { increment: 1 } }
            : { renewalMarkedAt: changedAt, version: { increment: 1 } },
        });
        if (transitioned.count !== 1) throw new Error("LEASE_LIFECYCLE_RACE");
        const response = this.leaseResponse(
          { ...lease, renewalMarkedAt: terminate ? lease.renewalMarkedAt : changedAt },
          terminate ? "TERMINATED" : "ACTIVE",
          currentVersion + 1,
        );
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: `leasing.lease.${terminate ? "terminated" : "renewal-marked"}`,
            targetType: "Lease",
            targetId: lease.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { unitId: lease.unitId },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: terminate ? "LeaseTerminated" : "LeaseRenewalMarked",
            aggregateType: "Lease",
            aggregateId: lease.id,
            payload: {
              organizationId: input.organizationId,
              leaseId: lease.id,
              unitId: lease.unitId,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 200,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "transitioned", response };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "LEASE_LIFECYCLE_RACE")
        return { kind: "concurrent" };
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) return { kind: "concurrent" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as LeaseDraftSummary };
    }
  }

  private async transitionLease(
    input: TransitionInput,
    activate: boolean,
  ): Promise<LeaseTransitionResult> {
    const operation = activate ? "activate" : "validate";
    const scope = `leasing.lease.${operation}.v1:${input.organizationId}:${input.leaseId}`;
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
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER")
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
          return {
            kind: "replayed",
            response: existing.response as unknown as LeaseDraftSummary,
          };
        }
        const lease = await tx.lease.findFirst({
          where: { id: input.leaseId, organizationId: input.organizationId },
          select: {
            id: true,
            status: true,
            version: true,
            propertyId: true,
            unitId: true,
            tenantProfileId: true,
            startDate: true,
            endDate: true,
            monthlyRentMinor: true,
            rentDueDay: true,
            tenantProfile: { select: { firstName: true, lastName: true, status: true } },
            unit: { select: { unitCode: true, status: true } },
            organization: { select: { status: true } },
          },
        });
        if (!lease) return { kind: "not_found" };
        if (activate && lease.status === "ACTIVE") {
          return { kind: "replayed", response: this.leaseResponse(lease, "ACTIVE") };
        }
        if (!canTransitionLease(lease.status, operation)) return { kind: "state_invalid" };
        const requiredState = activate ? "READY_FOR_ACTIVATION" : "DRAFT";

        if (activate) {
          try {
            assertLeaseActivationPolicy({
              workspaceStatus: membership.organization.status,
              leaseStatus: lease.status,
              tenantStatus: lease.tenantProfile.status,
              unitStatus: lease.unit.status,
            });
          } catch {
            if (lease.status === "READY_FOR_ACTIVATION" && lease.unit.status !== "AVAILABLE") {
              return { kind: "unit_unavailable" };
            }

            return { kind: "requirements_incomplete" };
          }
        }

        const currentVersion = Number(lease.version);
        if (currentVersion !== input.expectedVersion)
          return { kind: "version_mismatch", currentVersion };
        if (!activate) {
          const activeLease = await tx.lease.findFirst({
            where: {
              organizationId: input.organizationId,
              unitId: lease.unitId,
              status: "ACTIVE",
              id: { not: lease.id },
            },
            select: { id: true },
          });
          if (lease.tenantProfile.status !== "ACTIVE" || lease.unit.status !== "AVAILABLE")
            return { kind: "requirements_incomplete" };
          if (activeLease) return { kind: "unit_unavailable" };
        }
        if (activate) {
          const occupied = await tx.unit.updateMany({
            where: {
              id: lease.unitId,
              organizationId: input.organizationId,
              propertyId: lease.propertyId,
              status: "AVAILABLE",
            },
            data: { status: "OCCUPIED", version: { increment: 1 } },
          });
          if (occupied.count !== 1) return { kind: "unit_unavailable" };
        }
        const nextStatus = activate ? "ACTIVE" : "READY_FOR_ACTIVATION";
        const transitioned = await tx.lease.updateMany({
          where: {
            id: lease.id,
            organizationId: input.organizationId,
            status: requiredState,
            version: lease.version,
          },
          data: { status: nextStatus, version: { increment: 1 } },
        });
        if (transitioned.count !== 1) throw new Error("LEASE_TRANSITION_RACE");
        const response = this.leaseResponse(lease, nextStatus, currentVersion + 1);
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: `leasing.lease.${activate ? "activated" : "validated"}`,
            targetType: "Lease",
            targetId: lease.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { unitId: lease.unitId },
          },
        });
        await tx.outboxMessage.create({
          data: {
            eventType: activate ? "LeaseActivated" : "LeaseValidated",
            aggregateType: "Lease",
            aggregateId: lease.id,
            payload: {
              organizationId: input.organizationId,
              leaseId: lease.id,
              unitId: lease.unitId,
              status: nextStatus,
            },
          },
        });
        await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 200,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "transitioned", response };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "LEASE_TRANSITION_RACE")
        return { kind: "concurrent" };
      if (
        !(typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
      )
        throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) return { kind: "concurrent" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as LeaseDraftSummary };
    }
  }

  private leaseResponse(
    lease: {
      id: string;
      tenantProfileId: string;
      propertyId: string;
      unitId: string;
      startDate: Date;
      endDate: Date;
      monthlyRentMinor: number;
      rentDueDay: number;
      version: bigint;
      renewalMarkedAt?: Date | null;
      tenantProfile: { firstName: string; lastName: string };
      unit: { unitCode: string };
    },
    status: "READY_FOR_ACTIVATION" | "ACTIVE" | "TERMINATED",
    version = Number(lease.version),
  ): LeaseDraftSummary {
    return {
      id: lease.id,
      tenantProfileId: lease.tenantProfileId,
      tenantName: `${lease.tenantProfile.firstName} ${lease.tenantProfile.lastName}`,
      propertyId: lease.propertyId,
      unitId: lease.unitId,
      unitCode: lease.unit.unitCode,
      status,
      startDate: lease.startDate.toISOString().slice(0, 10),
      endDate: lease.endDate.toISOString().slice(0, 10),
      monthlyRentMinor: lease.monthlyRentMinor,
      currencyCode: "USD",
      rentDueDay: lease.rentDueDay,
      version,
      renewalMarkedAt: lease.renewalMarkedAt?.toISOString() ?? null,
    };
  }

  async acceptInvitation(tokenHash: Uint8Array<ArrayBuffer>, correlationId: string) {
    return this.database.$transaction(async (tx) => {
      const invitation = await tx.tenantInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          organizationId: true,
          tenantProfileId: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
        },
      });
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date()
      )
        return { kind: "invalid" as const };
      const consumed = await tx.tenantInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1) return { kind: "invalid" as const };
      await tx.tenantProfile.updateMany({
        where: {
          id: invitation.tenantProfileId,
          organizationId: invitation.organizationId,
          status: "INVITED",
        },
        data: { status: "ACTIVE", version: { increment: 1 } },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: invitation.organizationId,
          action: "leasing.tenant-invitation.accepted",
          targetType: "TenantInvitation",
          targetId: invitation.id,
          outcome: "SUCCESS",
          correlationId,
        },
      });
      return { kind: "accepted" as const };
    });
  }

  private async resolveUnique(
    error: unknown,
    input: {
      actorUserId: string;
      keyHash: Uint8Array<ArrayBuffer>;
      requestHash: Uint8Array<ArrayBuffer>;
    },
    scope: string,
    fallback: "duplicate" | "concurrent",
  ) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "P2002"))
      throw error;
    const existing = await this.database.idempotencyRecord.findUnique({
      where: {
        actorUserId_scope_keyHash: {
          actorUserId: input.actorUserId,
          scope,
          keyHash: input.keyHash,
        },
      },
      select: { requestHash: true, response: true },
    });
    if (!existing) return { kind: fallback } as const;
    if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
      return { kind: "idempotency_conflict" as const };
    return {
      kind: "replayed" as const,
      response: existing.response as unknown as TenantSummary & LeaseDraftSummary,
    };
  }
}
