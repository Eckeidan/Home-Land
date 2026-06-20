# ADR-0003 — npm Workspaces Bootstrap

Status: Accepted

Date: 2026-06-20

## Context

The project requires a web application, API, shared contracts, and database
package. The local environment provides Node.js 20 and npm directly. Adding a
monorepo orchestrator before build scale is measured would create another tool,
cache, and configuration surface without solving a demonstrated bottleneck.

## Decision

Use npm workspaces for the initial monorepo.

- `apps/web`: Next.js App Router.
- `apps/api`: NestJS modular API.
- `packages/contracts`: transport-safe shared types.
- `packages/database`: Prisma schema and PostgreSQL client boundary.
- Root scripts explicitly order generated/database artifacts before consumers.

Use Node.js 20.19 or newer in the Node 20 line for local and deployment parity.

## Consequences

- One lockfile and one dependency installation path.
- No remote build cache initially.
- Build order remains explicit in root scripts.
- Workspaces may later move to another package manager or add an orchestrator if
  measured CI time and dependency graph complexity justify migration.

## Review triggers

- CI build time exceeds the agreed budget repeatedly.
- More than three independently deployed applications require affected builds.
- Remote caching provides a measured cost or feedback-time improvement.
