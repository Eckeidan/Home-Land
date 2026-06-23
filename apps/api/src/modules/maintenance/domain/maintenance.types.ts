export type MaintenancePriority = "LOW" | "NORMAL" | "HIGH" | "EMERGENCY";
export type MaintenanceAction = "triage" | "assign" | "complete" | "verify" | "close";

export interface CreateMaintenanceRequestCommand {
  organizationId: string;
  actorUserId: string;
  propertyId: string;
  unitId?: string;
  tenantProfileId?: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
  idempotencyKey: string;
  correlationId: string;
}

export interface MaintenanceTransitionCommand {
  organizationId: string;
  actorUserId: string;
  requestId: string;
  action: MaintenanceAction;
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
  assignedVendorName?: string;
  assignedVendorEmail?: string;
  scheduledFor?: string;
}
