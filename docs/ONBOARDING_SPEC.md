# Onboarding MVP Specification

Status: Canonical

Owner: Product and Identity & Organization domain

Release: Phase 1 walking skeleton

## 1. Purpose

Onboarding converts a verified person into the owner of a secure, usable
organization workspace containing at least one property and one unit.

Target outcome:

> A qualified user reaches first operational value in less than ten minutes,
> without weakening identity, authorization, or tenant-isolation controls.

Onboarding is a product workflow implemented through domain capabilities. It is
not a generic workflow engine.

## 2. Actors

### Visitor

An unauthenticated person who can register, sign in, verify email, and recover
access.

### Organization Owner

The verified user who creates an organization. The owner receives the minimum
privileged role required to complete setup and must configure MFA before the
workspace becomes active.

### Invited Member

A user invited by an owner. Accepting an invitation creates a membership only in
the organization named by that invitation.

### Platform Operator

May inspect onboarding health and delivery failures. The operator cannot silently
complete onboarding or modify customer business data.

## 3. Scope

Included:

1. Account registration and email verification.
2. Organization creation.
3. Regional and workspace settings.
4. Owner MFA enrollment.
5. Optional team invitations.
6. First property and unit creation.
7. Readiness validation and workspace activation.
8. Save and resume from another trusted session.
9. Auditable abandonment, expiry, and recovery behavior.

Deferred:

- Subscription checkout and billing-plan enforcement.
- Stripe Connect or landlord bank-account setup.
- Bulk portfolio, tenant, vendor, and document imports.
- Custom domains and white-label branding.
- AI configuration and autonomous recommendations.
- Generic onboarding builders and organization-defined onboarding flows.

## 4. User journey

```text
Register account
  -> Verify email
  -> Create organization
  -> Configure workspace
  -> Enroll owner MFA
  -> Invite team (optional)
  -> Create first property
  -> Create first unit
  -> Review readiness
  -> Activate workspace
```

Users may leave and resume after any persisted step. The server determines the
next valid step; the client does not decide completion.

## 5. State model

### Onboarding states

```text
REGISTERED
  -> EMAIL_VERIFICATION_PENDING
  -> EMAIL_VERIFIED
  -> ORGANIZATION_CREATED
  -> WORKSPACE_CONFIGURED
  -> MFA_REQUIRED
  -> PORTFOLIO_REQUIRED
  -> READY_FOR_REVIEW
  -> ACTIVE
```

Terminal or exceptional states:

```text
ABANDONED
EXPIRED
SUSPENDED
```

`ABANDONED` is a product classification after inactivity, not destructive
deletion. A user may resume while the underlying account and organization remain
valid. `SUSPENDED` requires an explicit platform security or policy action.

### Allowed transitions

| Current | Command | Next | Required conditions |
|---|---|---|---|
| REGISTERED | RequestEmailVerification | EMAIL_VERIFICATION_PENDING | active account |
| EMAIL_VERIFICATION_PENDING | VerifyEmail | EMAIL_VERIFIED | valid unused token |
| EMAIL_VERIFIED | CreateOrganization | ORGANIZATION_CREATED | no conflicting active creation request |
| ORGANIZATION_CREATED | ConfigureWorkspace | WORKSPACE_CONFIGURED | valid regional settings |
| WORKSPACE_CONFIGURED | BeginMfaEnrollment | MFA_REQUIRED | owner session recently authenticated |
| MFA_REQUIRED | ConfirmMfaEnrollment | PORTFOLIO_REQUIRED | valid challenge and recovery codes acknowledged |
| PORTFOLIO_REQUIRED | CreatePropertyAndUnit | READY_FOR_REVIEW | valid property and at least one unit |
| READY_FOR_REVIEW | ActivateWorkspace | ACTIVE | all readiness invariants true |

Transitions are commands, not direct status updates. Every successful transition
records an audit event.

## 6. Readiness model

Let:

- `E` = email is verified;
- `O` = organization exists and is active for setup;
- `M` = owner has confirmed MFA;
- `P` = organization owns at least one valid property;
- `U` = one valid unit belongs to one of the organization's properties;
- `T` = required terms acceptance is recorded with version and timestamp.

Workspace readiness is:

```text
Ready = E AND O AND M AND P AND U AND T
```

Activation invariant:

```text
onboarding.state = ACTIVE  =>  Ready = true
```

The reverse is not automatic. A ready workspace becomes active only through the
explicit `ActivateWorkspace` command so the activation event is auditable and
idempotent.

## 7. Domain model

### User

Required MVP fields:

- `id`
- normalized unique `email`
- `email_verified_at`
- `status`
- authentication metadata
- `created_at`, `updated_at`, `version`

The global identity record does not receive a fake `organization_id`. Access to
business data is obtained through memberships.

### Organization

- `id`
- `legal_name`
- `display_name`
- `slug`
- `organization_type`
- `country_code` fixed to `US` for MVP
- `primary_state_code`
- `time_zone`
- `currency_code` fixed to `USD` for MVP
- `status`
- audit/version fields

### Membership

- `id`
- `organization_id`
- `user_id`
- `role`
- `status`
- `invited_by`
- `accepted_at`
- audit/version fields

Uniqueness:

```text
UNIQUE (organization_id, user_id)
```

### OnboardingProgress

- `id`
- `organization_id` unique
- `state`
- `completed_steps`
- `started_at`
- `last_activity_at`
- `activated_at`
- `version`

`completed_steps` may support presentation, but readiness is recalculated from
authoritative domain data. It is never trusted as proof that an invariant holds.

### Invitation

- `id`
- `organization_id`
- normalized `email`
- proposed role
- hashed token reference
- `expires_at`, `accepted_at`, `revoked_at`
- `invited_by`

An invitation is single-use, expiring, revocable, and bound to exactly one
organization.

## 8. Screens and behavior

### Screen 1 — Create account

Fields:

- full name
- professional email
- password
- required terms acceptance

States:

- default, submitting, validation error, duplicate-safe success, rate limited,
  service unavailable.

The response must not reveal whether an email belongs to another account beyond
the approved sign-in/recovery UX.

### Screen 2 — Verify email

- Resend action with cooldown.
- Change-email recovery path requiring re-authentication where applicable.
- Expired and already-used token states.
- Safe success redirect determined by server onboarding state.

### Screen 3 — Create organization

Fields:

- legal name
- display name
- organization type
- primary US state
- approximate unit range

The unit range is discovery/segmentation metadata, not an authorization or plan
limit.

### Screen 4 — Configure workspace

Fields:

- workspace slug with availability check
- time zone inferred from selected property region but user-confirmable
- English as initial UI language
- logo optional and deferred upload allowed

### Screen 5 — Secure account

- MFA enrollment using TOTP initially.
- QR/secret display with explicit confirmation challenge.
- Recovery codes shown once and acknowledged.
- Re-authentication required before restarting enrollment.

### Screen 6 — Invite team

- Optional and skippable.
- Email plus approved role template.
- Owners cannot create arbitrary permissions during onboarding.
- Duplicate and existing-member behavior is explicit.

### Screen 7 — First property

Fields:

- property name
- property type restricted to supported residential types
- structured US address
- property time zone
- first building when required
- first unit name/number

Address validation assists the user but does not silently rewrite legally
meaningful data.

### Screen 8 — Readiness review

Displays each server-evaluated requirement, missing actions, optional tasks, and
an explicit `Activate workspace` action.

### Application shell during onboarding

- Persistent progress indicator.
- Save-and-exit action.
- Support entry point.
- No full operational dashboard until activation.
- Users may revisit completed editable steps when doing so does not violate an
  invariant.

## 9. API contract outline

All endpoints use secure browser authentication, CSRF protection where required,
rate limiting, correlation IDs, validation, and structured errors.

```text
POST   /api/v1/auth/registrations
POST   /api/v1/auth/email-verifications
POST   /api/v1/auth/email-verifications/resend
GET    /api/v1/onboarding
POST   /api/v1/organizations
PATCH  /api/v1/organizations/{organizationId}/workspace
POST   /api/v1/auth/mfa/enrollments
POST   /api/v1/auth/mfa/enrollments/{enrollmentId}/confirm
POST   /api/v1/organizations/{organizationId}/invitations
POST   /api/v1/organizations/{organizationId}/properties
POST   /api/v1/organizations/{organizationId}/properties/{propertyId}/units
GET    /api/v1/organizations/{organizationId}/onboarding/readiness
POST   /api/v1/organizations/{organizationId}/onboarding/activate
```

Creation and activation commands accept an `Idempotency-Key`. Organization IDs in
URLs select a membership context; they never override the authenticated tenant
context.

### Stable error examples

- `AUTH_EMAIL_VERIFICATION_REQUIRED`
- `AUTH_VERIFICATION_TOKEN_INVALID`
- `AUTH_VERIFICATION_TOKEN_EXPIRED`
- `AUTH_MFA_REQUIRED`
- `AUTH_RECENT_AUTHENTICATION_REQUIRED`
- `ORG_SLUG_UNAVAILABLE`
- `ORG_MEMBERSHIP_REQUIRED`
- `ONBOARDING_TRANSITION_INVALID`
- `ONBOARDING_REQUIREMENTS_INCOMPLETE`
- `INVITATION_ALREADY_MEMBER`
- `RATE_LIMITED`

Errors never include stack traces, tokens, or sensitive existence disclosures.

## 10. Authorization matrix

| Action | Visitor | Verified user | Owner | Invited member | Platform operator |
|---|---:|---:|---:|---:|---:|
| Register | yes | no | no | no | no |
| Verify own email | yes with token | yes | yes | yes | no |
| Create organization | no | yes | yes | no | no |
| Configure workspace | no | no | yes | only if explicitly permitted | no |
| Enroll own MFA | no | yes | yes | yes | no |
| Invite member | no | no | yes | permission required | no |
| Create first property/unit | no | no | yes | permission required | no |
| Activate workspace | no | no | yes | no by default | no |
| View operational health | no | no | own organization | own organization | metadata only |

## 11. Security controls

- Verification and invitation tokens are random, short-lived, single-use, and
  stored only as hashes.
- Session cookies follow ADR-0002.
- MFA secrets are encrypted using managed keys and never logged.
- Recovery codes are hashed and individually consumable.
- Registration, resend, token verification, slug checks, and invitations are
  rate limited by layered signals.
- Organization creation and owner membership are one transaction.
- Property and unit creation verifies organization consistency at the database
  and application layers.
- File upload is not required for activation; optional logos use private upload
  validation and controlled transformation.
- Security events include registration, verification, organization creation,
  MFA enrollment, invitation, activation, and suspicious failures.

## 12. Failure and recovery behavior

| Failure | Required behavior |
|---|---|
| Email provider unavailable | persist delivery request safely, retry, show non-deceptive status |
| Duplicate registration request | idempotent response without duplicate account |
| Browser closes mid-step | resume from server state |
| Organization transaction fails | no orphan owner membership or progress record |
| MFA challenge expires | restart challenge without losing prior steps |
| Property created but unit fails | property remains editable; readiness remains false |
| Activation request repeated | return the same active result without duplicate side effects |
| Worker processes event twice | idempotent notification/audit consumers |
| User loses MFA before activation | verified recovery path with security audit |

## 13. Domain and audit events

- `UserRegistered`
- `EmailVerificationRequested`
- `UserEmailVerified`
- `OrganizationCreated`
- `OwnerMembershipCreated`
- `WorkspaceConfigured`
- `MfaEnrollmentConfirmed`
- `OrganizationInvitationCreated`
- `FirstPropertyCreated`
- `FirstUnitCreated`
- `OnboardingBecameReady`
- `WorkspaceActivated`

Events contain identifiers and minimal operational metadata. Sensitive field
values, tokens, MFA secrets, full addresses, and document contents are excluded.

## 14. Product analytics

Measure:

- started, completed, abandoned, and resumed onboarding;
- median time to verified email, organization, first property, and activation;
- validation/error rate by step and field category;
- invitation acceptance;
- support contacts during onboarding.

Analytics identify organization/user with pseudonymous internal identifiers and
must not receive passwords, tokens, MFA data, full addresses, or free-form
sensitive input.

Initial target, subject to discovery validation:

```text
median registration-to-activation < 10 minutes
activation completion rate > 70% for qualified users
cross-tenant onboarding incidents = 0
```

## 15. Accessibility and responsive behavior

- WCAG 2.2 AA target.
- Full keyboard flow and visible focus.
- Errors summarized and associated with fields.
- Progress is communicated in text, not color alone.
- Mobile layouts avoid dense horizontal tables.
- MFA QR enrollment provides an accessible manual secret path.
- Reduced-motion preferences are respected.

## 16. Test strategy

### Domain tests

- Every valid and invalid state transition.
- Readiness truth table.
- Organization creation atomicity.
- Invitation expiry/revocation/single-use.
- Activation idempotency.

### Integration tests

- Database uniqueness and cross-organization constraints.
- Session, CSRF, verification, MFA, and authorization controls.
- Transactional outbox and duplicate consumer delivery.
- Email-provider failure and recovery.

### Isolation tests

For two organizations `A` and `B`, prove that an actor in `A` cannot read,
modify, infer, search, invite into, activate, or enumerate resources in `B`, even
when valid identifiers from `B` are supplied.

### E2E tests

1. Successful owner activation.
2. Save and resume.
3. Expired verification recovery.
4. MFA failure and recovery.
5. Property validation failure without false readiness.
6. Repeated activation request.
7. Mobile and keyboard-only completion.

## 17. Definition of done

- Product copy and prototype tested with representative users.
- State machine and API contract reviewed.
- Threat model completed.
- Data model and migrations reviewed for tenant isolation.
- Accessibility checks and critical E2E scenarios pass.
- Telemetry dashboards and alert ownership exist.
- Email retry and support recovery paths are exercised.
- No critical/high unresolved security finding.
- Deployment and rollback are proven in the non-production environment.
