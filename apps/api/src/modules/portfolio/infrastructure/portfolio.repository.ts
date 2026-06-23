import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type {
  BuildingCreated,
  PortfolioFoundationCreated,
  PortfolioSnapshot,
  PropertyType,
  PropertyWorkspace,
  UnitCreated,
  UnitImportCommand,
  UnitImportReport,
} from "../domain/portfolio.types.js";

interface CreateFoundationInput {
  organizationId: string;
  actorUserId: string;
  propertyName: string;
  propertyType: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateCode: string;
  postalCode: string;
  timeZone: string;
  unitCode: string;
  normalizedAddressHash: Uint8Array<ArrayBuffer>;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

export type FoundationCreationResult =
  | { kind: "created"; response: PortfolioFoundationCreated }
  | { kind: "replayed"; response: PortfolioFoundationCreated }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "state_invalid" }
  | { kind: "idempotency_conflict" }
  | { kind: "concurrent_request" };

class PortfolioTransitionRaceError extends Error {}

interface CreateUnitInput {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
  unitCode: string;
  bedrooms?: number;
  bathrooms?: number;
  buildingId?: string;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

export type UnitCreationResult =
  | { kind: "created" | "replayed"; response: UnitCreated }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "workspace_inactive" }
  | { kind: "unit_conflict" }
  | { kind: "idempotency_conflict" }
  | { kind: "concurrent_request" };

interface CreateBuildingInput {
  organizationId: string;
  propertyId: string;
  actorUserId: string;
  name: string;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

export type BuildingCreationResult =
  | { kind: "created" | "replayed"; response: BuildingCreated }
  | { kind: "not_found" | "forbidden" | "workspace_inactive" | "building_conflict" }
  | { kind: "idempotency_conflict" | "concurrent_request" };

export type UnitImportResult =
  | { kind: "validated" | "committed" | "replayed"; report: UnitImportReport }
  | { kind: "not_found" | "forbidden" | "workspace_inactive" }
  | { kind: "idempotency_conflict" | "concurrent_request" };

@Injectable()
export class PortfolioRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createFoundation(input: CreateFoundationInput): Promise<FoundationCreationResult> {
    const scope = `portfolio.foundation.create.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const existing = await transaction.idempotencyRecord.findUnique({
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
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash))) {
            return { kind: "idempotency_conflict" };
          }
          return { kind: "replayed", response: this.deserialize(existing.response) };
        }

        const membership = await transaction.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: {
            role: true,
            organization: {
              select: {
                status: true,
                onboardingProgress: { select: { state: true, version: true } },
              },
            },
          },
        });
        if (!membership) return { kind: "not_found" };
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER") {
          return { kind: "forbidden" };
        }
        if (
          membership.organization.status !== "ONBOARDING" ||
          membership.organization.onboardingProgress?.state !== "PORTFOLIO_REQUIRED"
        ) {
          return { kind: "state_invalid" };
        }

        const property = await transaction.property.create({
          data: {
            organizationId: input.organizationId,
            name: input.propertyName,
            propertyType: input.propertyType,
            addressLine1: input.addressLine1,
            ...(input.addressLine2 ? { addressLine2: input.addressLine2 } : {}),
            city: input.city,
            stateCode: input.stateCode,
            postalCode: input.postalCode,
            timeZone: input.timeZone,
            normalizedAddressHash: input.normalizedAddressHash,
            status: "ACTIVE",
          },
          select: { id: true, name: true, propertyType: true, status: true, version: true },
        });
        const unit = await transaction.unit.create({
          data: {
            organizationId: input.organizationId,
            propertyId: property.id,
            unitCode: input.unitCode,
            status: "AVAILABLE",
          },
          select: { id: true, propertyId: true, unitCode: true, status: true, version: true },
        });
        const progressed = await transaction.onboardingProgress.updateMany({
          where: { organizationId: input.organizationId, state: "PORTFOLIO_REQUIRED" },
          data: {
            state: "READY_FOR_REVIEW",
            lastActivityAt: new Date(),
            version: { increment: 1 },
          },
        });
        if (progressed.count !== 1) throw new PortfolioTransitionRaceError();

        const response: PortfolioFoundationCreated = {
          property: {
            id: property.id,
            organizationId: input.organizationId,
            name: property.name,
            propertyType: property.propertyType as PropertyType,
            status: "ACTIVE",
            version: Number(property.version),
          },
          unit: {
            id: unit.id,
            organizationId: input.organizationId,
            propertyId: unit.propertyId,
            unitCode: unit.unitCode,
            status: "AVAILABLE",
            version: Number(unit.version),
          },
          onboarding: {
            state: "READY_FOR_REVIEW",
            nextAction: "REVIEW_READINESS",
            version: Number(membership.organization.onboardingProgress.version) + 1,
          },
        };
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "portfolio.foundation.created",
            targetType: "Property",
            targetId: property.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { unitId: unit.id },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "PortfolioFoundationCreated",
            aggregateType: "Property",
            aggregateId: property.id,
            payload: {
              organizationId: input.organizationId,
              propertyId: property.id,
              unitId: unit.id,
            },
          },
        });
        await transaction.idempotencyRecord.create({
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
      if (error instanceof PortfolioTransitionRaceError) return { kind: "concurrent_request" };
      if (!this.isUniqueConflict(error)) throw error;
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
      if (!existing) return { kind: "concurrent_request" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash))) {
        return { kind: "idempotency_conflict" };
      }
      return { kind: "replayed", response: this.deserialize(existing.response) };
    }
  }

  async getSnapshot(
    organizationId: string,
    actorUserId: string,
  ): Promise<PortfolioSnapshot | null> {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: {
        organization: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            status: true,
            version: true,
            onboardingProgress: { select: { state: true } },
            properties: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                name: true,
                propertyType: true,
                status: true,
                city: true,
                stateCode: true,
                units: { select: { status: true } },
              },
            },
          },
        },
      },
    });
    if (!membership) return null;
    const organization = membership.organization;
    return {
      organization: {
        id: organization.id,
        displayName: organization.displayName,
        slug: organization.slug,
        status: organization.status,
        version: Number(organization.version),
      },
      properties: organization.properties.map((property) => ({
        id: property.id,
        name: property.name,
        propertyType: property.propertyType as PropertyType,
        status: property.status,
        city: property.city,
        stateCode: property.stateCode,
        unitCount: property.units.length,
        availableUnitCount: property.units.filter((unit) => unit.status === "AVAILABLE").length,
      })),
      onboardingState: organization.onboardingProgress?.state ?? "MISSING",
    };
  }

  async getPropertyWorkspace(
    organizationId: string,
    propertyId: string,
    actorUserId: string,
  ): Promise<PropertyWorkspace | null> {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: { organization: { select: { id: true, displayName: true, slug: true } } },
    });
    if (!membership) return null;
    const property = await this.database.property.findFirst({
      where: { id: propertyId, organizationId },
      select: {
        id: true,
        name: true,
        propertyType: true,
        status: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        stateCode: true,
        postalCode: true,
        timeZone: true,
        version: true,
        buildings: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, version: true, _count: { select: { units: true } } },
        },
        units: {
          orderBy: { unitCode: "asc" },
          select: {
            id: true,
            unitCode: true,
            status: true,
            bedrooms: true,
            bathrooms: true,
            buildingId: true,
            building: { select: { name: true } },
            version: true,
          },
        },
      },
    });
    if (!property) return null;
    return {
      organization: membership.organization,
      property: {
        id: property.id,
        name: property.name,
        status: property.status,
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2,
        city: property.city,
        stateCode: property.stateCode,
        postalCode: property.postalCode,
        timeZone: property.timeZone,
        propertyType: property.propertyType as PropertyType,
        version: Number(property.version),
      },
      buildings: property.buildings.map((building) => ({
        id: building.id,
        name: building.name,
        unitCount: building._count.units,
        version: Number(building.version),
      })),
      units: property.units.map((unit) => ({
        id: unit.id,
        unitCode: unit.unitCode,
        status: unit.status,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms?.toString() ?? null,
        buildingId: unit.buildingId,
        buildingName: unit.building?.name ?? null,
        version: Number(unit.version),
      })),
    };
  }

  async createBuilding(input: CreateBuildingInput): Promise<BuildingCreationResult> {
    const scope = `portfolio.building.create.v1:${input.organizationId}:${input.propertyId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const membership = await transaction.membership.findFirst({
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
        const existing = await transaction.idempotencyRecord.findUnique({
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
          return { kind: "replayed", response: existing.response as unknown as BuildingCreated };
        }
        const property = await transaction.property.findFirst({
          where: { id: input.propertyId, organizationId: input.organizationId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!property) return { kind: "not_found" };
        const building = await transaction.building.create({
          data: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            name: input.name,
          },
          select: { id: true, propertyId: true, name: true, version: true },
        });
        const response: BuildingCreated = {
          ...building,
          organizationId: input.organizationId,
          version: Number(building.version),
        };
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "portfolio.building.created",
            targetType: "Building",
            targetId: building.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { propertyId: input.propertyId },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "BuildingCreated",
            aggregateType: "Building",
            aggregateId: building.id,
            payload: {
              organizationId: input.organizationId,
              propertyId: input.propertyId,
              buildingId: building.id,
            },
          },
        });
        await transaction.idempotencyRecord.create({
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
      if (!this.isUniqueConflict(error)) throw error;
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
      if (!existing) return { kind: "building_conflict" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", response: existing.response as unknown as BuildingCreated };
    }
  }

  async importUnits(input: UnitImportCommand): Promise<UnitImportResult> {
    const scope = `portfolio.units.import.v1:${input.organizationId}:${input.propertyId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const membership = await transaction.membership.findFirst({
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
        if (input.mode === "COMMIT" && input.keyHash) {
          const existing = await transaction.idempotencyRecord.findUnique({
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
            return { kind: "replayed", report: existing.response as unknown as UnitImportReport };
          }
        }
        const property = await transaction.property.findFirst({
          where: { id: input.propertyId, organizationId: input.organizationId, status: "ACTIVE" },
          select: {
            id: true,
            buildings: { select: { id: true, name: true } },
            units: {
              where: { unitCode: { in: input.rows.map((row) => row.unitCode) } },
              select: { unitCode: true },
            },
          },
        });
        if (!property) return { kind: "not_found" };
        const buildingIds = new Map(
          property.buildings.map((building) => [building.name, building.id]),
        );
        const existingCodes = new Set(property.units.map((unit) => unit.unitCode));
        const errors: UnitImportReport["errors"] = [];
        for (const row of input.rows) {
          if (existingCodes.has(row.unitCode))
            errors.push({ rowNumber: row.rowNumber, code: "UNIT_CODE_EXISTS", field: "unit_code" });
          if (row.buildingName && !buildingIds.has(row.buildingName))
            errors.push({
              rowNumber: row.rowNumber,
              code: "BUILDING_NOT_FOUND",
              field: "building_name",
            });
        }
        const invalidRows = new Set(errors.map((error) => error.rowNumber));
        const report: UnitImportReport = {
          mode: input.mode,
          totalRows: input.rows.length,
          validRows: input.rows.length - invalidRows.size,
          errorRows: invalidRows.size,
          createdCount: 0,
          errors,
        };
        if (input.mode === "DRY_RUN" || errors.length > 0) return { kind: "validated", report };
        if (!input.keyHash) return { kind: "concurrent_request" };
        const created = await transaction.unit.createMany({
          data: input.rows.map((row) => ({
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            unitCode: row.unitCode,
            ...(row.buildingName
              ? { buildingId: buildingIds.get(row.buildingName) as string }
              : {}),
            ...(row.bedrooms !== undefined ? { bedrooms: row.bedrooms } : {}),
            ...(row.bathrooms !== undefined ? { bathrooms: row.bathrooms } : {}),
            status: "AVAILABLE" as const,
          })),
        });
        report.createdCount = created.count;
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "portfolio.units.imported",
            targetType: "Property",
            targetId: input.propertyId,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { createdCount: created.count },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "UnitsImported",
            aggregateType: "Property",
            aggregateId: input.propertyId,
            payload: {
              organizationId: input.organizationId,
              propertyId: input.propertyId,
              createdCount: created.count,
            },
          },
        });
        await transaction.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(report)),
            statusCode: 200,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "committed", report };
      });
    } catch (error) {
      if (!this.isUniqueConflict(error) || !input.keyHash) throw error;
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
      if (!existing) return { kind: "concurrent_request" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash)))
        return { kind: "idempotency_conflict" };
      return { kind: "replayed", report: existing.response as unknown as UnitImportReport };
    }
  }

  async createUnit(input: CreateUnitInput): Promise<UnitCreationResult> {
    const scope = `portfolio.unit.create.v1:${input.organizationId}:${input.propertyId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const membership = await transaction.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (!membership) return { kind: "not_found" };
        if (membership.role !== "OWNER" && membership.role !== "PROPERTY_MANAGER") {
          return { kind: "forbidden" };
        }
        if (membership.organization.status !== "ACTIVE") return { kind: "workspace_inactive" };

        const existing = await transaction.idempotencyRecord.findUnique({
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
          if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash))) {
            return { kind: "idempotency_conflict" };
          }
          return { kind: "replayed", response: existing.response as unknown as UnitCreated };
        }
        const property = await transaction.property.findFirst({
          where: { id: input.propertyId, organizationId: input.organizationId, status: "ACTIVE" },
          select: { id: true },
        });
        if (!property) return { kind: "not_found" };
        if (input.buildingId) {
          const building = await transaction.building.findFirst({
            where: {
              id: input.buildingId,
              organizationId: input.organizationId,
              propertyId: input.propertyId,
            },
            select: { id: true },
          });
          if (!building) return { kind: "not_found" };
        }

        const unit = await transaction.unit.create({
          data: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            unitCode: input.unitCode,
            ...(input.bedrooms !== undefined ? { bedrooms: input.bedrooms } : {}),
            ...(input.bathrooms !== undefined ? { bathrooms: input.bathrooms } : {}),
            ...(input.buildingId ? { buildingId: input.buildingId } : {}),
            status: "AVAILABLE",
          },
          select: {
            id: true,
            propertyId: true,
            unitCode: true,
            status: true,
            bedrooms: true,
            bathrooms: true,
            buildingId: true,
            version: true,
          },
        });
        const response: UnitCreated = {
          ...unit,
          organizationId: input.organizationId,
          status: "AVAILABLE",
          bathrooms: unit.bathrooms?.toString() ?? null,
          version: Number(unit.version),
        };
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "portfolio.unit.created",
            targetType: "Unit",
            targetId: unit.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { propertyId: input.propertyId },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "UnitCreated",
            aggregateType: "Unit",
            aggregateId: unit.id,
            payload: {
              organizationId: input.organizationId,
              propertyId: input.propertyId,
              unitId: unit.id,
            },
          },
        });
        await transaction.idempotencyRecord.create({
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
      if (!this.isUniqueConflict(error)) throw error;
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
      if (!existing) return { kind: "unit_conflict" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash))) {
        return { kind: "idempotency_conflict" };
      }
      return { kind: "replayed", response: existing.response as unknown as UnitCreated };
    }
  }

  private deserialize(value: unknown): PortfolioFoundationCreated {
    const stored = value as PortfolioFoundationCreated;
    return {
      property: stored.property,
      unit: stored.unit,
      onboarding: stored.onboarding,
    };
  }

  private isUniqueConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
