import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type {
  PortfolioFoundationCreated,
  PortfolioSnapshot,
  PropertyType,
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
