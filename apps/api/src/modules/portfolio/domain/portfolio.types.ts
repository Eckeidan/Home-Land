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

export interface PropertyWorkspace {
  organization: { id: string; displayName: string; slug: string | null };
  property: {
    id: string;
    name: string;
    propertyType: PropertyType;
    status: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateCode: string;
    postalCode: string;
    timeZone: string;
    version: number;
  };
  buildings: Array<{
    id: string;
    name: string;
    unitCount: number;
    version: number;
  }>;
  units: Array<{
    id: string;
    unitCode: string;
    status: string;
    bedrooms: number | null;
    bathrooms: string | null;
    buildingId: string | null;
    buildingName: string | null;
    version: number;
  }>;
}

export interface CreateUnitCommand extends OrganizationContext {
  propertyId: string;
  unitCode: string;
  bedrooms?: number;
  bathrooms?: number;
  buildingId?: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface UnitCreated {
  id: string;
  organizationId: string;
  propertyId: string;
  unitCode: string;
  status: "AVAILABLE";
  bedrooms: number | null;
  bathrooms: string | null;
  buildingId: string | null;
  version: number;
}

export interface CreateBuildingCommand extends OrganizationContext {
  propertyId: string;
  name: string;
  idempotencyKey: string;
  correlationId: string;
}

export interface BuildingCreated {
  id: string;
  organizationId: string;
  propertyId: string;
  name: string;
  version: number;
}

export interface ImportUnitRow {
  rowNumber: number;
  unitCode: string;
  buildingName?: string;
  bedrooms?: number;
  bathrooms?: number;
}

export interface UnitImportCommand extends OrganizationContext {
  propertyId: string;
  mode: "DRY_RUN" | "COMMIT";
  rows: ImportUnitRow[];
  keyHash?: Uint8Array<ArrayBuffer>;
  requestHash: Uint8Array<ArrayBuffer>;
  correlationId: string;
}

export interface UnitImportReport {
  mode: "DRY_RUN" | "COMMIT";
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  errors: Array<{ rowNumber: number; code: string; field: string }>;
}
