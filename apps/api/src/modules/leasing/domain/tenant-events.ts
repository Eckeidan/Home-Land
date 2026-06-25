export type TenantDomainEvent =
  | {
      eventType: "TenantProfileCreated";
      aggregateType: "TenantProfile";
      aggregateId: string;
      payload: {
        organizationId: string;
        tenantProfileId: string;
        invitationCreated: boolean;
      };
    }
  | {
      eventType: "TenantInvitationCreated";
      aggregateType: "TenantInvitation";
      aggregateId: string;
      payload: {
        organizationId: string;
        tenantProfileId: string;
        email: string;
      };
    }
  | {
      eventType: "TenantInvitationAccepted";
      aggregateType: "TenantInvitation";
      aggregateId: string;
      payload: {
        organizationId: string;
        tenantProfileId: string;
      };
    };

export function tenantEvent(event: TenantDomainEvent): TenantDomainEvent {
  return event;
}
