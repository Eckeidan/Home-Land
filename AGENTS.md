# The Home Land — Agent Instructions

## Mission

Build The Home Land as a secure, multi-tenant property operations SaaS for the
United States. Optimize first for a reliable product used by property managers,
then evolve toward the long-term Property Operating System vision.

## Required reading order

Before changing code or schemas, read:

1. `00_MASTER_INDEX.md`
2. `.codex/project-rules.md`
3. `docs/PRODUCT_BRIEF.md`
4. `docs/MVP_SCOPE.md`
5. `docs/ONBOARDING_SPEC.md` when working on identity, organizations, or setup
6. `docs/ONBOARDING_DATA_MODEL.md` and `docs/api/onboarding.openapi.yaml` for onboarding implementation
7. `docs/THREAT_MODEL_ONBOARDING.md` for onboarding security controls
8. `docs/ARCHITECTURE.md`
9. `docs/SECURITY.md`
10. The relevant domain document and ADRs

If an exploratory Book conflicts with a canonical document under `docs/`, the
canonical document wins. Record intentional exceptions in an ADR.

## Non-negotiable rules

- Never access a business record without an explicit organization context.
- Authorization is enforced server-side; UI visibility is not authorization.
- Financial operations are idempotent and auditable.
- State changes use explicit application commands and validated transitions.
- External side effects use an outbox/worker boundary where consistency matters.
- Sensitive data must not appear in source, logs, events, analytics, or prompts.
- No AI recommendation may autonomously make housing eligibility decisions.
- No new platform engine, microservice, or infrastructure dependency without a
  demonstrated MVP requirement and an ADR.
- Every feature includes validation, failure states, authorization tests,
  tenant-isolation tests, observability, and rollback considerations.

## Delivery rule

Implement vertical slices. A slice is complete only when its UI, API, domain
rules, persistence, authorization, audit, tests, and operational signals work
together. Do not scaffold the entire future platform before completing the first
slice.
