export const organizationTypes = [
  "INDIVIDUAL_LANDLORD",
  "PROPERTY_MANAGEMENT_COMPANY",
  "REAL_ESTATE_AGENCY",
  "INVESTMENT_GROUP",
] as const;

export const approximateUnitRanges = [
  "ONE_TO_NINE",
  "TEN_TO_NINETY_NINE",
  "ONE_HUNDRED_TO_FIVE_HUNDRED",
  "FIVE_HUNDRED_TO_FIVE_THOUSAND",
  "OVER_FIVE_THOUSAND",
] as const;

export type OrganizationType = (typeof organizationTypes)[number];
export type ApproximateUnitRange = (typeof approximateUnitRanges)[number];

export interface CreateOrganizationCommand {
  actorUserId: string;
  legalName: string;
  displayName: string;
  organizationType: OrganizationType;
  primaryStateCode: string;
  approximateUnitRange: ApproximateUnitRange;
  idempotencyKey: string;
  correlationId: string;
}

export interface OrganizationCreated {
  organization: {
    id: string;
    displayName: string;
    slug: null;
    status: "ONBOARDING";
    version: number;
  };
  membershipRole: "OWNER";
  onboarding: {
    organizationId: string;
    state: "ORGANIZATION_CREATED";
    nextAction: "CONFIGURE_WORKSPACE";
    version: number;
  };
}

export interface OrganizationContext {
  organizationId: string;
  actorUserId: string;
}

export interface ConfigureWorkspaceCommand extends OrganizationContext {
  slug: string;
  timeZone: string;
  locale: "en-US";
  expectedVersion: number;
  correlationId: string;
}

export interface WorkspaceConfigured {
  id: string;
  displayName: string;
  slug: string;
  status: "ONBOARDING";
  version: number;
}
