import { describe, expect, it, vi } from "vitest";
import type { IdentityRepository } from "../infrastructure/identity.repository.js";
import type { SecureTokenService } from "../infrastructure/secure-token.service.js";
import { VerifyEmailService } from "./verify-email.service.js";

function setup(verified: boolean) {
  const tokens = {
    generate: vi.fn().mockReturnValue("session-credential"),
    hash: vi.fn().mockReturnValue(Uint8Array.from([1, 2, 3])),
  };
  const repository = {
    verifyEmailAndCreateSession: vi.fn().mockResolvedValue(verified),
  };
  const service = new VerifyEmailService(
    tokens as unknown as SecureTokenService,
    repository as unknown as IdentityRepository,
  );

  return { service, repository };
}

describe("VerifyEmailService", () => {
  it("creates an opaque session after consuming a valid token", async () => {
    const { service, repository } = setup(true);

    const result = await service.execute({
      token: "verification-token",
      correlationId: "correlation-verification",
    });

    expect(result.value).toBe("session-credential");
    expect(result.idleExpiresAt.getTime()).toBeLessThanOrEqual(result.absoluteExpiresAt.getTime());
    expect(repository.verifyEmailAndCreateSession).toHaveBeenCalledOnce();
  });

  it("rejects invalid, expired, revoked, and consumed tokens with one stable error", async () => {
    const { service } = setup(false);

    await expect(
      service.execute({
        token: "invalid-verification-token",
        correlationId: "correlation-invalid",
      }),
    ).rejects.toMatchObject({ response: { code: "AUTH_VERIFICATION_TOKEN_INVALID" } });
  });
});
