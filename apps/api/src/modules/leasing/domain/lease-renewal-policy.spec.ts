import { describe, expect, it } from "vitest";
import { assertLeaseRenewalPolicy } from "./lease-renewal-policy.js";

describe("lease renewal policy", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("accepts active lease within renewal window", () => {
    expect(() =>
      assertLeaseRenewalPolicy({
        leaseStatus: "ACTIVE",
        renewalMarkedAt: null,
        endDate: new Date("2026-04-01T00:00:00.000Z"),
        now,
      }),
    ).not.toThrow();
  });

  it("rejects non-active lease", () => {
    expect(() =>
      assertLeaseRenewalPolicy({
        leaseStatus: "READY_FOR_ACTIVATION",
        renewalMarkedAt: null,
        endDate: new Date("2026-04-01T00:00:00.000Z"),
        now,
      }),
    ).toThrow("Lease must be active");
  });

  it("rejects duplicate renewal marker", () => {
    expect(() =>
      assertLeaseRenewalPolicy({
        leaseStatus: "ACTIVE",
        renewalMarkedAt: new Date("2026-01-02T00:00:00.000Z"),
        endDate: new Date("2026-04-01T00:00:00.000Z"),
        now,
      }),
    ).toThrow("Lease renewal already marked");
  });

  it("rejects renewal marker outside the 120-day window", () => {
    expect(() =>
      assertLeaseRenewalPolicy({
        leaseStatus: "ACTIVE",
        renewalMarkedAt: null,
        endDate: new Date("2026-07-01T00:00:00.000Z"),
        now,
      }),
    ).toThrow("Lease renewal cannot be marked more than 120 days before end date");
  });
});
