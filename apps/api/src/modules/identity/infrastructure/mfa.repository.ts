import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";
import type { EncryptedSecret } from "../domain/mfa.types.js";

interface BeginEnrollmentInput extends EncryptedSecret {
  enrollmentId: string;
  userId: string;
  organizationId: string;
  expiresAt: Date;
  correlationId: string;
}

interface PendingEnrollment extends EncryptedSecret {
  id: string;
  userId: string;
  organizationId: string;
}

interface ConfirmEnrollmentInput {
  enrollmentId: string;
  userId: string;
  sessionId: string;
  recoveryCodeHashes: string[];
  newSessionHash: Uint8Array<ArrayBuffer>;
  newCsrfHash: Uint8Array<ArrayBuffer>;
  primaryAuthenticatedAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  correlationId: string;
}

export type BeginEnrollmentResult = "created" | "not_found" | "transition_invalid";
export type ConfirmEnrollmentResult = "confirmed" | "invalid" | "transition_invalid";
export type AcknowledgeResult = "acknowledged" | "invalid" | "transition_invalid";

@Injectable()
export class MfaRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async beginEnrollment(input: BeginEnrollmentInput): Promise<BeginEnrollmentResult> {
    return this.database.$transaction(async (transaction) => {
      const membership = await transaction.membership.findFirst({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { organization: { select: { onboardingProgress: { select: { state: true } } } } },
      });
      if (!membership) return "not_found";
      const state = membership.organization.onboardingProgress?.state;
      if (state !== "WORKSPACE_CONFIGURED" && state !== "MFA_REQUIRED") {
        return "transition_invalid";
      }

      await transaction.mfaEnrollment.updateMany({
        where: {
          userId: input.userId,
          organizationId: input.organizationId,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      if (state === "WORKSPACE_CONFIGURED") {
        const progressed = await transaction.onboardingProgress.updateMany({
          where: { organizationId: input.organizationId, state: "WORKSPACE_CONFIGURED" },
          data: { state: "MFA_REQUIRED", lastActivityAt: new Date(), version: { increment: 1 } },
        });
        if (progressed.count !== 1) throw new Error("MFA_BEGIN_TRANSITION_RACE");
      }
      await transaction.mfaEnrollment.create({
        data: {
          id: input.enrollmentId,
          userId: input.userId,
          organizationId: input.organizationId,
          secretCiphertext: input.ciphertext,
          secretIv: input.iv,
          secretAuthTag: input.authTag,
          keyVersion: input.keyVersion,
          expiresAt: input.expiresAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.userId,
          action: "identity.mfa.enrollment_started",
          targetType: "MfaEnrollment",
          targetId: input.enrollmentId,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
        },
      });
      return "created";
    });
  }

  async findPendingEnrollment(
    enrollmentId: string,
    userId: string,
  ): Promise<PendingEnrollment | null> {
    const enrollment = await this.database.mfaEnrollment.findFirst({
      where: {
        id: enrollmentId,
        userId,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        secretCiphertext: true,
        secretIv: true,
        secretAuthTag: true,
        keyVersion: true,
      },
    });
    if (!enrollment) return null;
    return {
      id: enrollment.id,
      userId: enrollment.userId,
      organizationId: enrollment.organizationId,
      ciphertext: Uint8Array.from(enrollment.secretCiphertext),
      iv: Uint8Array.from(enrollment.secretIv),
      authTag: Uint8Array.from(enrollment.secretAuthTag),
      keyVersion: enrollment.keyVersion,
    };
  }

  async recordInvalidAttempt(
    enrollmentId: string,
    userId: string,
    correlationId: string,
  ): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const enrollment = await transaction.mfaEnrollment.updateMany({
        where: { id: enrollmentId, userId, consumedAt: null, revokedAt: null, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      if (enrollment.count === 1) {
        await transaction.auditEvent.create({
          data: {
            actorUserId: userId,
            action: "identity.mfa.confirmation_denied",
            targetType: "MfaEnrollment",
            targetId: enrollmentId,
            outcome: "DENIED",
            correlationId,
          },
        });
      }
    });
  }

  async confirmEnrollment(input: ConfirmEnrollmentInput): Promise<ConfirmEnrollmentResult> {
    return this.database.$transaction(async (transaction) => {
      const enrollment = await transaction.mfaEnrollment.findFirst({
        where: {
          id: input.enrollmentId,
          userId: input.userId,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 5 },
        },
        select: {
          organizationId: true,
          secretCiphertext: true,
          secretIv: true,
          secretAuthTag: true,
          keyVersion: true,
        },
      });
      if (!enrollment) return "invalid";
      const membership = await transaction.membership.findFirst({
        where: {
          userId: input.userId,
          organizationId: enrollment.organizationId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { organization: { select: { onboardingProgress: { select: { state: true } } } } },
      });
      if (!membership) return "invalid";
      if (membership.organization.onboardingProgress?.state !== "MFA_REQUIRED")
        return "transition_invalid";

      const consumed = await transaction.mfaEnrollment.updateMany({
        where: { id: input.enrollmentId, consumedAt: null, revokedAt: null, attempts: { lt: 5 } },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1) return "invalid";
      await transaction.mfaFactor.updateMany({
        where: { userId: input.userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: new Date() },
      });
      const factor = await transaction.mfaFactor.create({
        data: {
          enrollmentId: input.enrollmentId,
          userId: input.userId,
          secretCiphertext: enrollment.secretCiphertext,
          secretIv: enrollment.secretIv,
          secretAuthTag: enrollment.secretAuthTag,
          keyVersion: enrollment.keyVersion,
          recoveryCodes: { create: input.recoveryCodeHashes.map((codeHash) => ({ codeHash })) },
        },
        select: { id: true },
      });
      await transaction.userSession.update({
        where: { id: input.sessionId },
        data: { revokedAt: new Date() },
      });
      await transaction.userSession.create({
        data: {
          userId: input.userId,
          secretHash: input.newSessionHash,
          csrfTokenHash: input.newCsrfHash,
          idleExpiresAt: input.idleExpiresAt,
          absoluteExpiresAt: input.absoluteExpiresAt,
          primaryAuthenticatedAt: input.primaryAuthenticatedAt,
          rotatedFromId: input.sessionId,
        },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId: enrollment.organizationId,
          actorUserId: input.userId,
          action: "identity.mfa.enabled",
          targetType: "MfaFactor",
          targetId: factor.id,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
        },
      });
      return "confirmed";
    });
  }

  async acknowledgeRecoveryCodes(
    enrollmentId: string,
    userId: string,
    correlationId: string,
  ): Promise<AcknowledgeResult> {
    return this.database.$transaction(async (transaction) => {
      const factor = await transaction.mfaFactor.findFirst({
        where: { enrollmentId, userId, status: "ACTIVE" },
        select: {
          id: true,
          recoveryAcknowledgedAt: true,
          enrollment: { select: { organizationId: true } },
        },
      });
      if (!factor) return "invalid";
      const membership = await transaction.membership.findFirst({
        where: {
          userId,
          organizationId: factor.enrollment.organizationId,
          role: "OWNER",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!membership) return "invalid";
      if (factor.recoveryAcknowledgedAt) return "acknowledged";

      const progressed = await transaction.onboardingProgress.updateMany({
        where: { organizationId: factor.enrollment.organizationId, state: "MFA_REQUIRED" },
        data: {
          state: "PORTFOLIO_REQUIRED",
          lastActivityAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (progressed.count !== 1) return "transition_invalid";
      await transaction.mfaFactor.update({
        where: { id: factor.id },
        data: { recoveryAcknowledgedAt: new Date() },
      });
      await transaction.auditEvent.create({
        data: {
          organizationId: factor.enrollment.organizationId,
          actorUserId: userId,
          action: "identity.mfa.recovery_codes_acknowledged",
          targetType: "MfaFactor",
          targetId: factor.id,
          outcome: "SUCCESS",
          correlationId,
        },
      });
      await transaction.outboxMessage.create({
        data: {
          eventType: "OwnerMfaEnabled",
          aggregateType: "Organization",
          aggregateId: factor.enrollment.organizationId,
          payload: { organizationId: factor.enrollment.organizationId, userId },
        },
      });
      return "acknowledged";
    });
  }
}
