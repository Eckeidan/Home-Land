import { describe, expect, it } from "vitest";
import { assertLeaseActivationPolicy } from "./lease-activation-policy.js";

describe("lease activation policy", () => {
  const valid = {
    workspaceStatus: "ACTIVE",
    leaseStatus: "READY_FOR_ACTIVATION",
    tenantStatus: "ACTIVE",
    unitStatus: "AVAILABLE",
  };

  it("accepts valid activation context", () => {
    expect(() => assertLeaseActivationPolicy(valid)).not.toThrow();
  });

  it("rejects inactive workspace", () => {
    expect(() => assertLeaseActivationPolicy({ ...valid, workspaceStatus: "ONBOARDING" })).toThrow(
      "Workspace must be active",
    );
  });

  it("rejects non-ready lease", () => {
    expect(() => assertLeaseActivationPolicy({ ...valid, leaseStatus: "DRAFT" })).toThrow(
      "Lease must be ready for activation",
    );
  });

  it("rejects inactive tenant", () => {
    expect(() => assertLeaseActivationPolicy({ ...valid, tenantStatus: "INVITED" })).toThrow(
      "Tenant must be active",
    );
  });

  it("rejects unavailable unit", () => {
    expect(() => assertLeaseActivationPolicy({ ...valid, unitStatus: "OCCUPIED" })).toThrow(
      "Unit must be available",
    );
  });
});
