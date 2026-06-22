import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type { InvitationalRole, InvitationSummary } from "../domain/organization.types.js";

interface CreateInvitationInput {
  organizationId: string;
  actorUserId: string;
  email: string;
  role: InvitationalRole;
  tokenHash: Uint8Array<ArrayBuffer>;
  keyHash: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  expiresAt: Date;
  correlationId: string;
}

export type InvitationCreationResult =
  | { kind: "created"; response: InvitationSummary; organizationName: string }
  | { kind: "replayed"; response: InvitationSummary }
  | { kind: "idempotency_conflict" }
  | { kind: "not_found" }
  | { kind: "already_member" }
  | { kind: "duplicate_race" }
  | { kind: "state_invalid" };

export type InvitationAcceptanceResult =
  | { kind: "accepted"; organizationId: string; organizationName: string; role: InvitationalRole }
  | { kind: "invalid" }
  | { kind: "already_member" };

@Injectable()
export class InvitationRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async create(input: CreateInvitationInput): Promise<InvitationCreationResult> {
    const scope = `organizations.invitations.create.v1:${input.organizationId}`;
    try {
      return await this.database.$transaction(async (transaction) => {
        const existingRequest = await transaction.idempotencyRecord.findUnique({
          where: {
            actorUserId_scope_keyHash: {
              actorUserId: input.actorUserId,
              scope,
              keyHash: input.keyHash,
            },
          },
          select: { requestHash: true, response: true },
        });
        if (existingRequest) {
          if (!Buffer.from(existingRequest.requestHash).equals(Buffer.from(input.requestHash))) {
            return { kind: "idempotency_conflict" };
          }
          return { kind: "replayed", response: this.deserialize(existingRequest.response) };
        }

        const membership = await transaction.membership.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.actorUserId,
            role: "OWNER",
            status: "ACTIVE",
          },
          select: {
            organization: {
              select: {
                displayName: true,
                status: true,
                onboardingProgress: { select: { state: true } },
              },
            },
          },
        });
        if (!membership) return { kind: "not_found" };
        const state = membership.organization.onboardingProgress?.state;
        if (
          membership.organization.status !== "ACTIVE" &&
          state !== "PORTFOLIO_REQUIRED" &&
          state !== "READY_FOR_REVIEW"
        ) {
          return { kind: "state_invalid" };
        }

        const existingMember = await transaction.membership.findFirst({
          where: { organizationId: input.organizationId, user: { email: input.email } },
          select: { id: true },
        });
        if (existingMember) return { kind: "already_member" };

        await transaction.organizationInvitation.updateMany({
          where: {
            organizationId: input.organizationId,
            email: input.email,
            acceptedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        const invitation = await transaction.organizationInvitation.create({
          data: {
            organizationId: input.organizationId,
            email: input.email,
            proposedRole: input.role,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
            invitedById: input.actorUserId,
          },
          select: { id: true, email: true, proposedRole: true, expiresAt: true },
        });
        const response: InvitationSummary = {
          id: invitation.id,
          email: invitation.email,
          role: invitation.proposedRole as InvitationalRole,
          status: "PENDING",
          expiresAt: invitation.expiresAt,
        };
        await transaction.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "organization.invitation.created",
            targetType: "OrganizationInvitation",
            targetId: invitation.id,
            outcome: "SUCCESS",
            correlationId: input.correlationId,
            metadata: { role: input.role },
          },
        });
        await transaction.outboxMessage.create({
          data: {
            eventType: "OrganizationInvitationCreated",
            aggregateType: "OrganizationInvitation",
            aggregateId: invitation.id,
            payload: { invitationId: invitation.id, organizationId: input.organizationId },
          },
        });
        await transaction.idempotencyRecord.create({
          data: {
            actorUserId: input.actorUserId,
            scope,
            keyHash: input.keyHash,
            requestHash: input.requestHash,
            response: JSON.parse(JSON.stringify(response)),
            statusCode: 202,
            expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
          },
        });
        return {
          kind: "created",
          response,
          organizationName: membership.organization.displayName,
        };
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
      if (!existing) return { kind: "duplicate_race" };
      if (!Buffer.from(existing.requestHash).equals(Buffer.from(input.requestHash))) {
        return { kind: "idempotency_conflict" };
      }
      return { kind: "replayed", response: this.deserialize(existing.response) };
    }
  }

  async accept(
    tokenHash: Uint8Array<ArrayBuffer>,
    userId: string,
    email: string,
    correlationId: string,
  ): Promise<InvitationAcceptanceResult> {
    return this.database.$transaction(async (transaction) => {
      const invitation = await transaction.organizationInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          organizationId: true,
          email: true,
          proposedRole: true,
          invitedById: true,
          expiresAt: true,
          acceptedAt: true,
          revokedAt: true,
          organization: { select: { displayName: true } },
        },
      });
      if (
        !invitation ||
        invitation.email !== email ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date() ||
        invitation.proposedRole === "OWNER"
      ) {
        return { kind: "invalid" };
      }
      const existing = await transaction.membership.findUnique({
        where: { organizationId_userId: { organizationId: invitation.organizationId, userId } },
        select: { id: true },
      });
      if (existing) return { kind: "already_member" };

      const consumed = await transaction.organizationInvitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { acceptedAt: new Date() },
      });
      if (consumed.count !== 1) return { kind: "invalid" };
      await transaction.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.proposedRole,
          status: "ACTIVE",
          invitedById: invitation.invitedById,
          acceptedAt: new Date(),
        },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId: invitation.organizationId,
          actorUserId: userId,
          action: "organization.invitation.accepted",
          targetType: "OrganizationInvitation",
          targetId: invitation.id,
          outcome: "SUCCESS",
          correlationId,
          metadata: { role: invitation.proposedRole },
        },
      });
      await transaction.outboxMessage.create({
        data: {
          eventType: "OrganizationInvitationAccepted",
          aggregateType: "OrganizationInvitation",
          aggregateId: invitation.id,
          payload: {
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
            userId,
          },
        },
      });
      return {
        kind: "accepted",
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.displayName,
        role: invitation.proposedRole as InvitationalRole,
      };
    });
  }

  private deserialize(value: unknown): InvitationSummary {
    const stored = value as InvitationSummary & { expiresAt: string | Date };
    return { ...stored, expiresAt: new Date(stored.expiresAt) };
  }

  private isUniqueConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
