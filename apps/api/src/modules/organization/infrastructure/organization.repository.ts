import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type {
  ApproximateUnitRange,
  OrganizationCreated,
  OrganizationType,
} from "../domain/organization.types.js";

interface PersistOrganizationInput {
  actorUserId: string;
  legalName: string;
  displayName: string;
  organizationType: OrganizationType;
  primaryStateCode: string;
  approximateUnitRange: ApproximateUnitRange;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

export type OrganizationCreationResult =
  | { kind: "created"; response: OrganizationCreated }
  | { kind: "replayed"; response: OrganizationCreated }
  | { kind: "conflict" };

@Injectable()
export class OrganizationRepository {
  private readonly scope = "organizations.create.v1";

  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createOrganizationWithOwner(
    input: PersistOrganizationInput,
  ): Promise<OrganizationCreationResult> {
    try {
      return await this.database.$transaction(async (transaction) => {
        const existing = await transaction.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope: this.scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });

        if (existing) {
          if (!this.hashesEqual(existing.requestHash, input.requestHash))
            return { kind: "conflict" };
          return { kind: "replayed", response: this.deserializeResponse(existing.response) };
        }

        const organization = await transaction.organization.create({
          data: {
            legalName: input.legalName,
            displayName: input.displayName,
            organizationType: input.organizationType,
            primaryStateCode: input.primaryStateCode,
            approximateUnitRange: input.approximateUnitRange,
            createdById: input.actorUserId,
            memberships: {
              create: {
                userId: input.actorUserId,
                role: "OWNER",
                status: "ACTIVE",
                acceptedAt: new Date(),
              },
            },
            onboardingProgress: { create: { state: "ORGANIZATION_CREATED" } },
          },
          select: {
            id: true,
            displayName: true,
            status: true,
            version: true,
            onboardingProgress: { select: { state: true, version: true } },
          },
        });

        const response: OrganizationCreated = {
          organization: {
            id: organization.id,
            displayName: organization.displayName,
            slug: null,
            status: "ONBOARDING",
            version: Number(organization.version),
          },
          membershipRole: "OWNER",
          onboarding: {
            organizationId: organization.id,
            state: "ORGANIZATION_CREATED",
            nextAction: "CONFIGURE_WORKSPACE",
            version: Number(organization.onboardingProgress?.version ?? 1),
          },
        };

        await transaction.auditEvent.create({
          data: {
            organizationId: organization.id,
            actorUserId: input.actorUserId,
            action: "organization.created",
            targetType: "Organization",
            targetId: organization.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { membershipRole: "OWNER" },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "OrganizationCreated",
            aggregateType: "Organization",
            aggregateId: organization.id,
            payload: {
              organizationId: organization.id,
              actorUserId: input.actorUserId,
              membershipRole: "OWNER",
            },
          },
        });
        await transaction.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope: this.scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 201,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });

        return { kind: "created", response };
      });
    } catch (error) {
      if (!this.isUniqueConstraintConflict(error)) throw error;
      const existing = await this.database.idempotencyRecord.findUnique({
        where: {
          actorUserId_scope_keyHash: {
            actorUserId: input.actorUserId,
            scope: this.scope,
            keyHash: input.keyHash,
          },
        },
        select: { requestHash: true, response: true },
      });
      if (!existing) throw error;
      if (!this.hashesEqual(existing.requestHash, input.requestHash)) return { kind: "conflict" };
      return { kind: "replayed", response: this.deserializeResponse(existing.response) };
    }
  }

  private hashesEqual(left: Uint8Array, right: Uint8Array): boolean {
    return Buffer.from(left).equals(Buffer.from(right));
  }

  private deserializeResponse(value: unknown): OrganizationCreated {
    const stored = value as OrganizationCreated;
    return {
      organization: {
        id: stored.organization.id,
        displayName: stored.organization.displayName,
        slug: null,
        status: "ONBOARDING",
        version: stored.organization.version,
      },
      membershipRole: "OWNER",
      onboarding: {
        organizationId: stored.onboarding.organizationId,
        state: "ORGANIZATION_CREATED",
        nextAction: "CONFIGURE_WORKSPACE",
        version: stored.onboarding.version,
      },
    };
  }

  private isUniqueConstraintConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
