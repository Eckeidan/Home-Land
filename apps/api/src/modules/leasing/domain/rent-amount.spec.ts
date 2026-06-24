import { describe, expect, it } from "vitest";
import { rentAmount } from "./rent-amount.js";

describe("rent amount", () => {
  it("accepts positive amount", () => {
    expect(rentAmount(120000).amountMinor).toBe(120000);
  });

  it("rejects zero", () => {
    expect(() => rentAmount(0)).toThrow();
  });

  it("rejects negative", () => {
    expect(() => rentAmount(-1)).toThrow();
  });
});
