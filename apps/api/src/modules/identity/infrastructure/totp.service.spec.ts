import { describe, expect, it } from "vitest";
import { TotpService } from "./totp.service.js";

describe("TotpService", () => {
  const service = new TotpService();
  const rfcSecret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("matches RFC 6238 SHA-1 vectors reduced to six digits", () => {
    expect(service.code(rfcSecret, Math.floor(59 / 30))).toBe("287082");
    expect(service.code(rfcSecret, Math.floor(1_111_111_109 / 30))).toBe("081804");
  });

  it("accepts one adjacent time step and rejects malformed codes", () => {
    const now = 1_700_000_000_000;
    const previous = service.code(rfcSecret, Math.floor(now / 30_000) - 1);
    expect(service.verify(rfcSecret, previous, now)).toBe(true);
    expect(service.verify(rfcSecret, "12345", now)).toBe(false);
  });

  it("generates 160-bit base32 secrets", () => {
    expect(service.generateSecret()).toMatch(/^[A-Z2-7]{32}$/);
  });
});
