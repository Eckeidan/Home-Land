import { describe, expect, it, vi } from "vitest";
import type { IdentityRepository } from "../infrastructure/identity.repository.js";
import type { PasswordHasherService } from "../infrastructure/password-hasher.service.js";
import type { SecureTokenService } from "../infrastructure/secure-token.service.js";
import type { VerificationMailerService } from "../infrastructure/verification-mailer.service.js";
import { RegisterUserService } from "./register-user.service.js";

const command = {
  fullName: "  Chris   Morgan  ",
  email: "OWNER@EXAMPLE.COM ",
  acceptedTermsVersion: "2026-06-20",
  correlationId: "correlation-registration",
};

function setup(
  pendingVerification: {
    userId: string;
    email: string;
    shouldSendVerification: boolean;
  } | null,
) {
  const passwordHasher = { hash: vi.fn().mockResolvedValue("argon2-hash") };
  const tokens = {
    generate: vi.fn().mockReturnValue("verification-token"),
    hash: vi.fn().mockReturnValue(Uint8Array.from([1, 2, 3])),
  };
  const repository = {
    createOrRefreshPendingRegistration: vi.fn().mockResolvedValue(pendingVerification),
  };
  const mailer = { sendVerification: vi.fn().mockResolvedValue(undefined) };
  const service = new RegisterUserService(
    passwordHasher as unknown as PasswordHasherService,
    tokens as unknown as SecureTokenService,
    repository as unknown as IdentityRepository,
    mailer as unknown as VerificationMailerService,
  );

  return { service, passwordHasher, repository, mailer };
}

describe("RegisterUserService", () => {
  it("normalizes identity data and sends a verification without exposing account details", async () => {
    const { service, passwordHasher, repository, mailer } = setup({
      userId: "user-id",
      email: "owner@example.com",
      shouldSendVerification: true,
    });

    await expect(service.execute(command)).resolves.toEqual({
      status: "ACCEPTED",
      nextAction: "CHECK_EMAIL",
    });
    expect(repository.createOrRefreshPendingRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: "Chris Morgan",
        email: "owner@example.com",
        passwordHash: "argon2-hash",
      }),
    );
    expect(passwordHasher.hash).toHaveBeenCalledWith(expect.stringMatching(/^AH-/));
    expect(mailer.sendVerification).toHaveBeenCalledWith({
      email: "owner@example.com",
      temporaryPassword: expect.stringMatching(/^AH-/),
      token: "verification-token",
    });
  });

  it("returns the same response for an existing active account and does not send email", async () => {
    const { service, passwordHasher, mailer } = setup(null);

    await expect(service.execute(command)).resolves.toEqual({
      status: "ACCEPTED",
      nextAction: "CHECK_EMAIL",
    });
    expect(passwordHasher.hash).toHaveBeenCalledOnce();
    expect(mailer.sendVerification).not.toHaveBeenCalled();
  });

  it("resends refreshed credentials for an existing pending registration", async () => {
    const { service, mailer } = setup({
      userId: "user-id",
      email: "owner@example.com",
      shouldSendVerification: true,
    });

    await expect(service.execute(command)).resolves.toEqual({
      status: "ACCEPTED",
      nextAction: "CHECK_EMAIL",
    });
    expect(mailer.sendVerification).toHaveBeenCalledWith({
      email: "owner@example.com",
      temporaryPassword: expect.stringMatching(/^AH-/),
      token: "verification-token",
    });
  });

  it("returns the generic response when concurrent registration loses the unique race", async () => {
    const { service, repository, mailer } = setup(null);
    repository.createOrRefreshPendingRegistration.mockRejectedValueOnce({ code: "P2002" });

    await expect(service.execute(command)).resolves.toEqual({
      status: "ACCEPTED",
      nextAction: "CHECK_EMAIL",
    });
    expect(mailer.sendVerification).not.toHaveBeenCalled();
  });

  it("rejects a stale terms version", async () => {
    const { service } = setup(null);

    await expect(
      service.execute({ ...command, acceptedTermsVersion: "stale-version" }),
    ).rejects.toMatchObject({ response: { code: "TERMS_VERSION_OUTDATED" } });
  });
});
