# The Home Land — Project Rules

Status: Canonical  
Version: 1.0  
Scope: MVP and all production code

## Product boundary

The MVP serves US residential property managers. The initial validation segment
is organizations managing roughly 100–5,000 units; this range is a hypothesis to
validate through customer interviews, not a permanent technical limit.

The MVP is a property operations product. It is not yet a configurable ERP,
marketplace, IoT platform, BIM system, or autonomous AI decision system.

## Architecture

- TypeScript end-to-end.
- Modular monolith with explicit bounded contexts.
- Next.js web application, NestJS API, PostgreSQL, Prisma, Redis/BullMQ, and
  S3-compatible object storage.
- REST API described with OpenAPI 3.1.
- PostgreSQL is the system of record.
- Domain modules communicate through application contracts and domain events,
  not direct modification of another module's tables.
- Start with one deployable API and one worker. Extract services only after
  measured scaling or team-boundary evidence.

## Multi-tenancy

- Every organization-owned aggregate carries `organization_id`.
- Repository methods require `OrganizationContext`.
- Tenant identity comes from the authenticated server context, never from a
  trusted request-body field.
- Foreign keys and unique constraints include organization scope where needed.
- Cross-tenant access tests are mandatory for every resource.
- Platform-global records must be explicitly classified; they must not receive a
  fake organization identifier.

## Security

- Browser authentication uses secure, `HttpOnly`, `SameSite` cookies. Do not
  store bearer tokens in `localStorage`.
- Passwords use a modern adaptive password hash. MFA is required for privileged
  roles before production launch.
- Secrets come from a managed secret store in production.
- Validate input at every trust boundary.
- Apply least privilege to database, storage, queues, CI/CD, and cloud roles.
- Logs are structured and redact credentials, tokens, bank data, government IDs,
  lease documents, and sensitive tenant information.

## Data and money

- Store money as integer minor units plus ISO 4217 currency unless a documented
  accounting use case requires higher precision.
- Financial truth is represented by an immutable ledger; payment-provider status
  alone is not the accounting record.
- Stripe webhooks require signature verification, replay protection,
  idempotency, and reconciliation.
- Use UTC instants for events and explicit property/organization time zones for
  local business rules.
- Deletion and retention rules require data classification and legal validation.

## UI/UX

- Mobile-first, keyboard-accessible, WCAG 2.2 AA target.
- Every asynchronous screen defines loading, empty, error, partial, and success
  states.
- The product may use glass and motion only when readability, contrast, reduced
  motion, and performance remain acceptable.
- The futuristic quality comes from workflow speed, contextual intelligence,
  command navigation, and clear decisions—not visual effects alone.

## Quality gates

- Formatting, linting, type checking, unit tests, integration tests, migration
  checks, and critical E2E tests must pass in CI.
- Coverage percentage is not a substitute for testing invariants and failure
  paths.
- Migrations must be backward-compatible with the currently deployed version
  during rolling deployment.
- Production changes require observable success metrics and a rollback path.

## Forbidden without ADR

- Microservices, event sourcing, multi-region writes, multi-cloud abstraction.
- A generic rules builder, generic workflow builder, or plugin marketplace.
- Direct database access from controllers or UI code.
- Business logic in React components.
- Unscoped Prisma access in organization-owned modules.
- AI execution of payments, lease decisions, screening, or legal actions.
