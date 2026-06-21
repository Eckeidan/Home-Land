import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../../../infrastructure/database/database.constants.js";

interface PersistRegistrationInput {
  fullName: string;
  email: string;
  passwordHash: string;
  acceptedTermsVersion: string;
  tokenHash: Uint8Array<ArrayBuffer>;
  expiresAt: Date;
  correlationId: string;
}

interface PendingVerification {
  userId: string;
  email: string;
}

interface VerifyEmailInput {
  tokenHash: Uint8Array<ArrayBuffer>;
  sessionHash: Uint8Array<ArrayBuffer>;
  csrfTokenHash: Uint8Array<ArrayBuffer>;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  correlationId: string;
}

@Injectable()
export class IdentityRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async createOrRefreshPendingRegistration(
    input: PersistRegistrationInput,
  ): Promise<PendingVerification | null> {
    return this.database.$transaction(async (transaction) => {
      const existingUser = await transaction.user.findUnique({
        where: { email: input.email },
        select: { id: true, email: true, status: true },
      });

      if (existingUser?.status === "ACTIVE" || existingUser?.status === "DISABLED") {
        return null;
      }

      if (existingUser) {
        await transaction.emailVerificationChallenge.updateMany({
          where: { userId: existingUser.id, consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await transaction.emailVerificationChallenge.create({
          data: {
            userId: existingUser.id,
            tokenHash: input.tokenHash,
            expiresAt: input.expiresAt,
          },
        });
        await this.recordRegistrationRequested(transaction, existingUser.id, input, true);
        return { userId: existingUser.id, email: existingUser.email };
      }

      const user = await transaction.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordCredential: { create: { passwordHash: input.passwordHash } },
          termsAcceptances: { create: { termsVersion: input.acceptedTermsVersion } },
        },
        select: { id: true, email: true },
      });

      await transaction.emailVerificationChallenge.create({
        data: {
          userId: user.id,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      await this.recordRegistrationRequested(transaction, user.id, input, false);

      return { userId: user.id, email: user.email };
    });
  }

  async verifyEmailAndCreateSession(input: VerifyEmailInput): Promise<boolean> {
    return this.database.$transaction(async (transaction) => {
      const challenge = await transaction.emailVerificationChallenge.findUnique({
        where: { tokenHash: input.tokenHash },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          consumedAt: true,
          revokedAt: true,
        },
      });

      if (
        !challenge ||
        challenge.consumedAt ||
        challenge.revokedAt ||
        challenge.expiresAt <= new Date()
      ) {
        await this.recordVerificationDenied(transaction, input.correlationId);
        return false;
      }

      const consumed = await transaction.emailVerificationChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });

      if (consumed.count !== 1) {
        await this.recordVerificationDenied(transaction, input.correlationId);
        return false;
      }

      await transaction.user.update({
        where: { id: challenge.userId },
        data: {
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          version: { increment: 1 },
        },
      });
      await transaction.userSession.create({
        data: {
          userId: challenge.userId,
          secretHash: input.sessionHash,
          csrfTokenHash: input.csrfTokenHash,
          idleExpiresAt: input.idleExpiresAt,
          absoluteExpiresAt: input.absoluteExpiresAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserId: challenge.userId,
          action: "identity.email.verified",
          targetType: "User",
          targetId: challenge.userId,
          outcome: "SUCCESS",
          correlationId: input.correlationId,
        },
      });
      await transaction.outboxMessage.create({
        data: {
          eventType: "UserEmailVerified",
          aggregateType: "User",
          aggregateId: challenge.userId,
          payload: { userId: challenge.userId },
        },
      });

      return true;
    });
  }

  private async recordRegistrationRequested(
    transaction: Parameters<Parameters<DatabaseClient["$transaction"]>[0]>[0],
    userId: string,
    input: PersistRegistrationInput,
    existingPendingUser: boolean,
  ): Promise<void> {
    await transaction.auditEvent.create({
      data: {
        actorUserId: userId,
        action: "identity.registration.requested",
        targetType: "User",
        targetId: userId,
        outcome: "SUCCESS",
        correlationId: input.correlationId,
        metadata: { existingPendingUser },
      },
    });
    await transaction.outboxMessage.create({
      data: {
        eventType: "EmailVerificationRequested",
        aggregateType: "User",
        aggregateId: userId,
        payload: { userId },
      },
    });
  }

  private async recordVerificationDenied(
    transaction: Parameters<Parameters<DatabaseClient["$transaction"]>[0]>[0],
    correlationId: string,
  ): Promise<void> {
    await transaction.auditEvent.create({
      data: {
        action: "identity.email.verification_denied",
        targetType: "EmailVerificationChallenge",
        outcome: "DENIED",
        correlationId,
      },
    });
  }
}
