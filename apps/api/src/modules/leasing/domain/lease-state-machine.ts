export type LeaseStatus = "DRAFT" | "READY_FOR_ACTIVATION" | "ACTIVE" | "TERMINATED";

export type LeaseTransitionAction = "validate" | "activate" | "renewal-marker" | "terminate";

export function canTransitionLease(status: LeaseStatus, action: LeaseTransitionAction): boolean {
  return (
    (status === "DRAFT" && action === "validate") ||
    (status === "READY_FOR_ACTIVATION" && action === "activate") ||
    (status === "ACTIVE" && action === "renewal-marker") ||
    (status === "ACTIVE" && action === "terminate")
  );
}

export function assertLeaseTransition(status: LeaseStatus, action: LeaseTransitionAction): void {
  if (!canTransitionLease(status, action)) {
    throw new Error(`Invalid lease transition: ${status} -> ${action}`);
  }
}
