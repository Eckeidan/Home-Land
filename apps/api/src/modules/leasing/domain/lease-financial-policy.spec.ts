import { describe, expect, it } from "vitest";
import { assertLeaseFinancialPolicy } from "./lease-financial-policy.js";
import { leaseTerm } from "./lease-term.js";
import { rentAmount } from "./rent-amount.js";
import { securityDeposit } from "./security-deposit.js";

describe("lease financial policy", () => {
  const valid = {
    rent: rentAmount(100_000),
    deposit: securityDeposit(200_000),
    rentDueDay: 1,
    term: leaseTerm("2026-01-01", "2026-12-31"),
  };

  it("accepts valid lease financials", () => {
    expect(() => assertLeaseFinancialPolicy(valid)).not.toThrow();
  });

  it.each([0, 29, 31, 1.5])("rejects invalid rent due day %s", (rentDueDay) => {
    expect(() => assertLeaseFinancialPolicy({ ...valid, rentDueDay })).toThrow(
      "Rent due day must be between 1 and 28",
    );
  });

  it("rejects deposit greater than three months rent", () => {
    expect(() =>
      assertLeaseFinancialPolicy({
        ...valid,
        deposit: securityDeposit(300_001),
      }),
    ).toThrow("Security deposit cannot exceed three months rent");
  });

  it("rejects leases shorter than 30 days", () => {
    expect(() =>
      assertLeaseFinancialPolicy({
        ...valid,
        term: leaseTerm("2026-01-01", "2026-01-15"),
      }),
    ).toThrow("Lease duration must be at least 30 days");
  });

  it("rejects leases longer than 10 years", () => {
    expect(() =>
      assertLeaseFinancialPolicy({
        ...valid,
        term: leaseTerm("2026-01-01", "2037-01-01"),
      }),
    ).toThrow("Lease duration cannot exceed 10 years");
  });
});
