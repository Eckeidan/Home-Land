export type MaintenanceStatus =
  | "SUBMITTED"
  | "TRIAGED"
  | "ASSIGNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "VERIFIED"
  | "CLOSED"
  | "CANCELLED";

export type MaintenanceAction = "triage" | "assign" | "complete" | "verify" | "close";

export function nextMaintenanceStatus(
  action: MaintenanceAction,
  status: MaintenanceStatus,
): MaintenanceStatus | null {
  if (action === "triage" && status === "SUBMITTED") return "TRIAGED";
  if (action === "assign" && ["TRIAGED", "ASSIGNED"].includes(status)) return "ASSIGNED";
  if (action === "complete" && ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(status)) {
    return "COMPLETED";
  }
  if (action === "verify" && status === "COMPLETED") return "VERIFIED";
  if (action === "close" && status === "VERIFIED") return "CLOSED";
  return null;
}

export function canTransitionMaintenance(
  action: MaintenanceAction,
  status: MaintenanceStatus,
): boolean {
  return nextMaintenanceStatus(action, status) !== null;
}
