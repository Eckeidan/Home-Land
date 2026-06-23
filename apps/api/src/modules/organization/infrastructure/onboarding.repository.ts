import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type {
  OnboardingReadiness,
  ReadinessRequirement,
  WorkspaceActivated,
} from "../domain/organization.types.js";

interface ActivationInput {
  organizationId: string;
  actorUserId: string;
  expectedVersion: number;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
  currentTermsVersion: string;
}

export type ReadinessResult =
  | { kind: "ready"; readiness: OnboardingReadiness }
  | { kind: "not_found" }
  | { kind: "forbidden" };

export type ActivationResult =
  | { kind: "activated" | "replayed"; response: WorkspaceActivated }
  | { kind: "not_found" }
  | { kind: "forbidden" }
  | { kind: "state_invalid"; currentState: string }
  | { kind: "requirements_incomplete"; readiness: OnboardingReadiness }
  | { kind: "version_mismatch"; currentVersion: number }
  | { kind: "idempotency_conflict" }
  | { kind: "concurrent_request" };

class ActivationRaceError extends Error {}

type ReadinessDatabase = Pick<
  DatabaseClient,
  "organization" | "user" | "mfaFactor" | "termsAcceptance"
>;

@Injectable()
export class OnboardingRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async getReadiness(
    organizationId: string,
    actorUserId: string,
    currentTermsVersion: string,
  ): Promise<ReadinessResult> {
    const membership = await this.database.membership.findFirst({
      where: { organizationId, userId: actorUserId, status: "ACTIVE" },
      select: { role: true },
    });
    if (!membership) return { kind: "not_found" };
    if (membership.role !== "OWNER") return { kind: "forbidden" };
    const readiness = await this.evaluate(
      this.database,
      organizationId,
      actorUserId,
      currentTermsVersion,
    );
    if (!readiness) return { kind: "not_found" };
    return { kind: "ready", readiness };
  }

  async activate(input: ActivationInput): Promise<ActivationResult> {
    const scope = `onboarding.activate.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const membership = await transaction.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            status: "ACTIVE",
          },
          select: { role: true },
        });
        if (!membership) return { kind: "not_found" };
        if (membership.role !== "OWNER") return { kind: "forbidden" };

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
          return { kind: "replayed", response: existing.response as unknown as WorkspaceActivated };
        }

        const progress = await transaction.onboardingProgress.findUnique({
          where: { organizationId: input.organizationId },
          select: { state: true, version: true, activatedAt: true },
        });
        if (!progress) return { kind: "not_found" };
        if (progress.state === "ACTIVE" && progress.activatedAt) {
          return {
            kind: "replayed",
            response: {
              organizationId: input.organizationId,
              status: "ACTIVE",
              activatedAt: progress.activatedAt.toISOString(),
              nextPath: `/app/${input.organizationId}/portfolio`,
            },
          };
        }
        const readiness = await this.evaluate(
          transaction,
          input.organizationId,
          input.actorUserId,
          input.currentTermsVersion,
        );
        if (!readiness) return { kind: "not_found" };
        const currentVersion = Number(progress.version);
        if (progress.state !== "READY_FOR_REVIEW") {
          return { kind: "state_invalid", currentState: progress.state };
        }
        if (currentVersion !== input.expectedVersion) {
          return { kind: "version_mismatch", currentVersion };
        }
        if (!readiness.ready) return { kind: "requirements_incomplete", readiness };

        const activatedAt = new Date();
        const organizationUpdated = await transaction.organization.updateMany({
          where: { id: input.organizationId, status: "ONBOARDING" },
          data: { status: "ACTIVE", version: { increment: 1 } },
        });
        const progressUpdated = await transaction.onboardingProgress.updateMany({
          where: {
            organizationId: input.organizationId,
            state: "READY_FOR_REVIEW",
            version: progress.version,
          },
          data: {
            state: "ACTIVE",
            activatedAt,
            lastActivityAt: activatedAt,
            version: { increment: 1 },
          },
        });
        if (organizationUpdated.count !== 1 || progressUpdated.count !== 1) {
          throw new ActivationRaceError();
        }

        const response: WorkspaceActivated = {
          organizationId: input.organizationId,
          status: "ACTIVE",
          activatedAt: activatedAt.toISOString(),
          nextPath: `/app/${input.organizationId}/portfolio`,
        };
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "organization.workspace.activated",
            targetType: "Organization",
            targetId: input.organizationId,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { readinessVersion: currentVersion },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "WorkspaceActivated",
            aggregateType: "Organization",
            aggregateId: input.organizationId,
            payload: {
              organizationId: input.organizationId,
              actorUserId: input.actorUserId,
              activatedAt: response.activatedAt,
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
            statusCode: 200,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return { kind: "activated", response };
      });
    } catch (error) {
      if (error instanceof ActivationRaceError) return { kind: "concurrent_request" };
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
      return { kind: "replayed", response: existing.response as unknown as WorkspaceActivated };
    }
  }

  private async evaluate(
    database: ReadinessDatabase,
    organizationId: string,
    ownerUserId: string,
    currentTermsVersion: string,
  ): Promise<OnboardingReadiness | null> {
    const organization = await database.organization.findUnique({
      where: { id: organizationId },
      select: {
        status: true,
        slug: true,
        timeZone: true,
        locale: true,
        onboardingProgress: { select: { version: true } },
        properties: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            units: { where: { status: { in: ["AVAILABLE", "OCCUPIED"] } }, select: { id: true } },
          },
        },
      },
    });
    if (!organization?.onboardingProgress) return null;
    const [user, mfaFactor, termsAcceptance] = await Promise.all([
      database.user.findUnique({
        where: { id: ownerUserId },
        select: { status: true, emailVerifiedAt: true },
      }),
      database.mfaFactor.findFirst({
        where: {
          userId: ownerUserId,
          status: "ACTIVE",
          recoveryAcknowledgedAt: { not: null },
          enrollment: { organizationId },
        },
        select: { id: true },
      }),
      database.termsAcceptance.findUnique({
        where: { userId_termsVersion: { userId: ownerUserId, termsVersion: currentTermsVersion } },
        select: { id: true },
      }),
    ]);
    const propertyComplete = organization.properties.length > 0;
    const unitComplete = organization.properties.some((property) => property.units.length > 0);
    const requirementCandidates: ReadinessRequirement[] = [
      {
        code: "EMAIL_VERIFIED",
        complete: user?.status === "ACTIVE" && user.emailVerifiedAt !== null,
        actionPath: "/onboarding/verify-email",
      },
      {
        code: "ORGANIZATION_VALID",
        complete:
          (organization.status === "ONBOARDING" || organization.status === "ACTIVE") &&
          Boolean(organization.slug && organization.timeZone && organization.locale),
        actionPath: `/onboarding/workspace/${organizationId}`,
      },
      {
        code: "OWNER_MFA_ENABLED",
        complete: Boolean(mfaFactor),
        actionPath: "/onboarding/mfa",
      },
      {
        code: "FIRST_PROPERTY_CREATED",
        complete: propertyComplete,
        actionPath: `/app/${organizationId}/portfolio`,
      },
      {
        code: "FIRST_UNIT_CREATED",
        complete: unitComplete,
        actionPath: `/app/${organizationId}/portfolio`,
      },
      {
        code: "TERMS_ACCEPTED",
        complete: Boolean(termsAcceptance),
        actionPath: "/register",
      },
    ];
    const requirements: ReadinessRequirement[] = requirementCandidates.map((requirement) =>
      requirement.complete ? { code: requirement.code, complete: true } : requirement,
    );
    return {
      ready: requirements.every((requirement) => requirement.complete),
      requirements,
      evaluatedAt: new Date().toISOString(),
      version: Number(organization.onboardingProgress.version),
    };
  }

  private isUniqueConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
