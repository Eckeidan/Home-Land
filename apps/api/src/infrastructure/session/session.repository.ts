import type { DatabaseClient } from "@home-land/database";
import { Inject, Injectable } from "@nestjs/common";
import { DATABASE_CLIENT } from "../database/database.constants.js";
import type { AuthenticatedIdentity } from "./session.types.js";

@Injectable()
export class SessionRepository {
  constructor(@Inject(DATABASE_CLIENT) private readonly database: DatabaseClient) {}

  async findActiveIdentity(
    secretHash: Uint8Array<ArrayBuffer>,
  ): Promise<AuthenticatedIdentity | null> {
    const now = new Date();
    const session = await this.database.userSession.findFirst({
      where: {
        secretHash,
        revokedAt: null,
        idleExpiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
        user: { status: "ACTIVE", emailVerifiedAt: { not: null } },
      },
      select: {
        id: true,
        csrfTokenHash: true,
        lastSeenAt: true,
        primaryAuthenticatedAt: true,
        absoluteExpiresAt: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!session?.csrfTokenHash) return null;

    if (now.getTime() - session.lastSeenAt.getTime() >= 5 * 60 * 1000) {
      await this.database.userSession.update({
        where: { id: session.id },
        data: { lastSeenAt: now },
      });
    }

    return {
      sessionId: session.id,
      userId: session.user.id,
      email: session.user.email,
      csrfTokenHash: Uint8Array.from(session.csrfTokenHash),
      primaryAuthenticatedAt: session.primaryAuthenticatedAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
    };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.database.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }
}
