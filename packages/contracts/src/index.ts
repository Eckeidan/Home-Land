export type OnboardingState =
  | "REGISTERED"
  | "EMAIL_VERIFICATION_PENDING"
  | "EMAIL_VERIFIED"
  | "ORGANIZATION_CREATED"
  | "WORKSPACE_CONFIGURED"
  | "MFA_REQUIRED"
  | "PORTFOLIO_REQUIRED"
  | "READY_FOR_REVIEW"
  | "ACTIVE"
  | "ABANDONED"
  | "EXPIRED"
  | "SUSPENDED";

export type ReadinessRequirementCode =
  | "EMAIL_VERIFIED"
  | "ORGANIZATION_VALID"
  | "OWNER_MFA_ENABLED"
  | "FIRST_PROPERTY_CREATED"
  | "FIRST_UNIT_CREATED"
  | "TERMS_ACCEPTED";

export interface ReadinessRequirement {
  code: ReadinessRequirementCode;
  complete: boolean;
  actionPath?: string;
}

export interface OnboardingReadiness {
  ready: boolean;
  requirements: ReadonlyArray<ReadinessRequirement>;
  evaluatedAt: string;
  version: number;
}
