# Responsible Delivery Roadmap

Status: Canonical planning baseline

Dates are intentionally absent until team capacity and customer discovery are
known. Sequence and exit criteria matter more than speculative deadlines.

## Phase 0 — Validate and freeze the foundation

Deliverables:

- 10 qualified customer interviews and documented evidence.
- Primary persona, unit range, pricing hypothesis, and top three workflows.
- Domain workshops for leasing, rent accounting, maintenance, and US compliance.
- Clickable prototype of onboarding, operational inbox, property workspace,
  payment exception, and maintenance workflow.
- Threat model, data classification, context map, first ERD, API conventions.
- Hosting decision, cost envelope, ADRs, CI quality gates.

Exit: `docs/DEFINITION_OF_READY.md` passes and one pilot customer agrees to test.

## Phase 1 — Platform walking skeleton

Build one production-shaped vertical slice:

```text
register -> create organization -> invite manager -> create property
```

Include authentication, authorization, tenant isolation, audit, observability,
migration, deployment, backups, and E2E tests.

The authoritative workflow contract is `docs/ONBOARDING_SPEC.md`.

Exit: slice runs in a non-production environment and tenant-isolation tests pass.

## Phase 2 — Portfolio and leasing

- Property/building/unit hierarchy.
- Safe CSV import.
- Tenant invitation and profile.
- Lease lifecycle and occupancy derivation.
- Document controls.

Exit: pilot organization can represent its real portfolio and active leases.

## Phase 3 — Rent operations

- Obligations and immutable ledger.
- Stripe payments, webhooks, reconciliation, receipts, exceptions.
- Financial permissions and audit exports.

Exit: sandbox and controlled pilot reconciliation have zero unexplained balance
differences; accounting model is reviewed by a domain specialist.

## Phase 4 — Maintenance operations

- Request, triage, assignment, scheduling, work, verification, closure.
- Tenant and vendor constrained portals.
- Notifications and SLA views.

Exit: pilot completes real maintenance cases and measures response time.

## Phase 5 — Operational intelligence

- Unified inbox, command palette, property timeline.
- Explainable rule-based health indicators.
- AI summaries only where source citation, privacy, evaluation, and fallback are
  implemented.

Exit: measured reduction in manager follow-up time without increased errors.

## Phase 6 — Production readiness and controlled launch

- Security review, load test, accessibility audit, restore exercise.
- Incident and support runbooks.
- Data migration rehearsal and rollback plan.
- Legal/compliance control matrix reviewed.
- Service objectives and alert thresholds validated.

Exit: limited cohort launch with feature flags and monitored rollback capability.

## Future investment rule

Digital Twin, predictive maintenance, marketplace, multi-region, and configurable
platform engines require usage evidence, data readiness, a business case, and a
new ADR. They are roadmap options, not inherited commitments.
