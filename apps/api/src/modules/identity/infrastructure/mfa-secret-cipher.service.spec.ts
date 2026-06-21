import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MfaSecretCipherService } from "./mfa-secret-cipher.service.js";

describe("MfaSecretCipherService", () => {
  const originalKey = process.env.MFA_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.MFA_ENCRYPTION_KEY;
    else process.env.MFA_ENCRYPTION_KEY = originalKey;
  });

  it("round-trips a secret only with the bound context", () => {
    const cipher = new MfaSecretCipherService();
    const encrypted = cipher.encrypt("BASE32SECRET", "user:org:enrollment");
    expect(cipher.decrypt(encrypted, "user:org:enrollment")).toBe("BASE32SECRET");
    expect(() => cipher.decrypt(encrypted, "other:context")).toThrow();
  });

  it("rejects malformed key material", () => {
    process.env.MFA_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => new MfaSecretCipherService().encrypt("secret", "context")).toThrow(
      "MFA_ENCRYPTION_KEY must decode to 32 bytes",
    );
  });
});
