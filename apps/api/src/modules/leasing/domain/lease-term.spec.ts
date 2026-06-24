import { describe, expect, it } from "vitest";
import { leaseTerm } from "./lease-term.js";

describe("lease term value object", () => {
  it("accepts valid ordered dates", () => {
    const term = leaseTerm("2026-01-01", "2026-12-31");

    expect(term.startDate.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(term.endDate.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it.each([
    ["2026-01-01", "2026-01-01"],
    ["2026-12-31", "2026-01-01"],
  ])("rejects invalid order %s -> %s", (start, end) => {
    expect(() => leaseTerm(start, end)).toThrow("Lease start date must precede end date");
  });

  it.each([
    ["2026-02-30", "2026-12-31"],
    ["bad-date", "2026-12-31"],
    ["2026-01-01", "bad-date"],
  ])("rejects invalid date %s -> %s", (start, end) => {
    expect(() => leaseTerm(start, end)).toThrow("Lease date must be a valid ISO date");
  });
});
