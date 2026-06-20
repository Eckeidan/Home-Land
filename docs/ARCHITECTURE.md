# MVP Architecture

Status: Canonical  
Decision baseline: ADR-0001

## System context

```text
Browser
  -> Next.js Web
  -> NestJS REST API
  -> Application and Domain Modules
  -> PostgreSQL / Redis / Object Storage
  -> Worker
  -> Stripe / Email / SMS
```

## Deployment units

1. `web`: Next.js application.
2. `api`: NestJS modular monolith.
3. `worker`: BullMQ consumers using the same application contracts.

They share versioned packages but not mutable runtime state.

## Proposed repository structure

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  database/
  domain/
  authorization/
  observability/
  design-system/
  testing/
docs/
  adr/
```

The exact package tool and versions are selected during bootstrap and recorded
in an ADR after checking supported releases.

## Bounded contexts for MVP

- Identity & Organization
- Portfolio
- Leasing
- Rent Operations
- Maintenance
- Documents
- Notifications
- Audit & Operations

Reporting reads projections from owned data. AI is an adapter-backed application
capability, not an authority or an independent source of truth.

## Multi-tenant model

Let `org(x)` return the organization owning resource `x`.

For every organization-owned command:

```text
authenticated(user)
AND member(user, org(resource))
AND permitted(user, action, resource)
AND org(request_context) = org(resource)
```

Required controls:

- `OrganizationContext` constructed after authentication and membership checks.
- Composite uniqueness and foreign keys that prevent cross-organization links.
- Repository APIs scoped by organization.
- PostgreSQL RLS evaluated in a proof-of-concept before schema freeze; use it as
  defense in depth where operationally safe.
- Storage object keys and signed-download authorization scoped by organization.
- Search, exports, background jobs, caches, and metrics receive the same scope.

## Consistency and events

Domain commands update aggregates transactionally. Events intended for external
side effects are written to a transactional outbox in the same transaction.
Workers publish/process with at-least-once semantics, so consumers must be
idempotent.

Event history is not the primary database model. Event sourcing is deferred.

## Financial model

Balances are derived from immutable ledger entries and allocations. Stripe
objects are integration evidence, not the internal accounting source of truth.
Corrections use reversing entries; settled financial records are not edited in
place.

Formal invariant:

```text
for each balanced transaction t:
sum(debits(t)) = sum(credits(t))
```

The detailed chart of accounts and trust-accounting requirements require a
domain workshop with a US property-accounting specialist before implementation.

## API rules

- REST under `/api/v1` with generated OpenAPI 3.1 documentation.
- Cursor pagination for growing collections.
- Idempotency keys for financial and repeatable command endpoints.
- Optimistic concurrency for contested aggregates.
- Stable machine-readable error codes and correlation IDs.
- Request organization identifiers are selectors only; authorization derives
  organization context from the authenticated membership.

## Reliability baseline

- Automated backups and point-in-time recovery.
- Restore test before production launch.
- Timeouts, bounded retries with jitter, circuit breaking where justified, and
  dead-letter handling for external calls.
- Initial targets: documented RPO <= 15 minutes and RTO <= 4 hours, validated
  against hosting cost and customer commitments before launch.
- No 99.99% contractual promise until architecture, staffing, runbooks, and
  measured reliability support it.

## Observability

- Structured redacted logs.
- OpenTelemetry traces across web request, API, database, queue, and worker.
- Metrics for latency, errors, saturation, queue age, webhook lag, outbox lag,
  reconciliation failures, and authorization denials.
- Alerts map to a runbook and named owner.
