export type LeaseDomainEvent =
  | {
      eventType: "LeaseDraftCreated";
      aggregateType: "Lease";
      aggregateId: string;
      payload: {
        organizationId: string;
        leaseId: string;
        unitId: string;
        tenantProfileId: string;
      };
    }
  | {
      eventType: "LeaseValidated" | "LeaseActivated" | "LeaseRenewalMarked" | "LeaseTerminated";
      aggregateType: "Lease";
      aggregateId: string;
      payload: {
        organizationId: string;
        leaseId: string;
        unitId: string;
        status?: string;
      };
    };

export function leaseEvent(event: LeaseDomainEvent): LeaseDomainEvent {
  return event;
}
