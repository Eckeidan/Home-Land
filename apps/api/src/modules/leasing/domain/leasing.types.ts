export interface CreateTenantCommand {
  organizationId: string;
  actorUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  sendInvitation: boolean;
  idempotencyKey: string;
  correlationId: string;
}
export interface CreateLeaseDraftCommand {
  organizationId: string;
  actorUserId: string;
  propertyId: string;
  unitId: string;
  tenantProfileId: string;
  startDate: string;
  endDate: string;
  monthlyRentMinor: number;
  securityDepositMinor: number;
  rentDueDay: number;
  idempotencyKey: string;
  correlationId: string;
}
export interface TenantSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  version: number;
}
export interface LeaseDraftSummary {
  id: string;
  tenantProfileId: string;
  tenantName: string;
  propertyId: string;
  unitId: string;
  unitCode: string;
  status: "DRAFT" | "READY_FOR_ACTIVATION" | "ACTIVE" | "TERMINATED";
  startDate: string;
  endDate: string;
  monthlyRentMinor: number;
  currencyCode: "USD";
  rentDueDay: number;
  version: number;
  renewalMarkedAt: string | null;
}
export interface LeaseTransitionCommand {
  organizationId: string;
  actorUserId: string;
  leaseId: string;
  expectedVersion: number;
  idempotencyKey: string;
  correlationId: string;
}
