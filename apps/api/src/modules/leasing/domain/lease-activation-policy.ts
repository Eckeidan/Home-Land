export interface LeaseActivationPolicyInput {
  workspaceStatus: "ACTIVE" | string;
  leaseStatus: "READY_FOR_ACTIVATION" | string;
  tenantStatus: "ACTIVE" | string;
  unitStatus: "AVAILABLE" | string;
}

export function assertLeaseActivationPolicy(input: LeaseActivationPolicyInput): void {
  if (input.workspaceStatus !== "ACTIVE") {
    throw new Error("Workspace must be active");
  }

  if (input.leaseStatus !== "READY_FOR_ACTIVATION") {
    throw new Error("Lease must be ready for activation");
  }

  if (input.tenantStatus !== "ACTIVE") {
    throw new Error("Tenant must be active");
  }

  if (input.unitStatus !== "AVAILABLE") {
    throw new Error("Unit must be available");
  }
}
