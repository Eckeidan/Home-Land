export interface LeaseRenewalPolicyInput {
  leaseStatus: "ACTIVE" | string;
  renewalMarkedAt: Date | null;
  endDate: Date;
  now?: Date;
}

export function assertLeaseRenewalPolicy(input: LeaseRenewalPolicyInput): void {
  if (input.leaseStatus !== "ACTIVE") {
    throw new Error("Lease must be active");
  }

  if (input.renewalMarkedAt) {
    throw new Error("Lease renewal already marked");
  }

  const now = input.now ?? new Date();
  const daysUntilEnd = Math.ceil((input.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilEnd > 120) {
    throw new Error("Lease renewal cannot be marked more than 120 days before end date");
  }
}
