import { describe, expect, it } from "vitest";
import { securityDeposit } from "./security-deposit.js";

describe("security deposit", () => {
  it("accepts positive amount", () => {
    expect(securityDeposit(100000).amountMinor).toBe(100000);
  });

  it("accepts zero", () => {
    expect(securityDeposit(0).amountMinor).toBe(0);
  });

  it("rejects negative amount", () => {
    expect(() => securityDeposit(-1)).toThrow();
  });
});
