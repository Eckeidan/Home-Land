# The Home Land

The Home Land is being prepared as a secure, multi-tenant property operations
SaaS for the United States.

## Current phase

Phase 0 — product validation and architecture readiness. Application code has not
started yet by design.

## Read first

1. [Master index](00_MASTER_INDEX.md)
2. [Product brief](docs/PRODUCT_BRIEF.md)
3. [MVP scope](docs/MVP_SCOPE.md)
4. [Onboarding MVP specification](docs/ONBOARDING_SPEC.md)
5. [Onboarding data model](docs/ONBOARDING_DATA_MODEL.md)
6. [Onboarding visual prototype](prototypes/onboarding/README.md)
7. [Responsible delivery roadmap](docs/DELIVERY_ROADMAP.md)
8. [Definition of ready](docs/DEFINITION_OF_READY.md)

The existing numbered documents capture long-term product research. Canonical
MVP decisions live under `docs/` and in `.codex/project-rules.md`.

## Immediate next action

The Phase 1 walking skeleton is initialized as an npm workspace monorepo.

## Local development

Prerequisites: Node.js 20.19+, npm 10.8+, Docker Desktop.

```bash
cp .env.example .env
npm install
npm run infra:up
npm run db:generate
npm run db:migrate -- --name onboarding_foundation
npm run dev
```

Local services:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/api/v1/health`
- Web health: `http://localhost:3000/api/health`
- PostgreSQL: `localhost:5433` (container port `5432`)

Run all quality gates with `npm run check`.
