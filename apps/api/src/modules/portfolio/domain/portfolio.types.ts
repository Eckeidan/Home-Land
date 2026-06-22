export const propertyTypes = ["SINGLE_FAMILY", "MULTIFAMILY", "APARTMENT_COMPLEX"] as const;
export type PropertyType = (typeof propertyTypes)[number];

export interface OrganizationContext {
  organizationId: string;
  actorUserId: string;
}

export interface CreatePortfolioFoundationCommand extends OrganizationContext {
  propertyName: string;
  propertyType: PropertyType;
  address: {
    line1: string;
    line2?: string;
    city: string;
    stateCode: string;
    postalCode: string;
    countryCode: "US";
  };
  timeZone: string;
  unitCode: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface PortfolioFoundationCreated {
  property: {
    id: string;
    organizationId: string;
    name: string;
    propertyType: PropertyType;
    status: "ACTIVE";
    version: number;
  };
  unit: {
    id: string;
    organizationId: string;
    propertyId: string;
    unitCode: string;
    status: "AVAILABLE";
    version: number;
  };
  onboarding: {
    state: "READY_FOR_REVIEW";
    nextAction: "REVIEW_READINESS";
    version: number;
  };
}

export interface PortfolioSnapshot {
  organization: {
    id: string;
    displayName: string;
    slug: string | null;
    status: string;
    version: number;
  };
  properties: Array<{
    id: string;
    name: string;
    propertyType: PropertyType;
    status: string;
    city: string;
    stateCode: string;
    unitCount: number;
    availableUnitCount: number;
  }>;
  onboardingState: string;
}
