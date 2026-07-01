# Asset Hub UI Template

This folder is the base UI system for the SaaS application.

## Route template

- Public website: `/`
- Auth: `/login`, `/register`
- Onboarding: `/onboarding/*`
- SaaS app: `/app/[organizationId]/*`

## App shell rule

`/app/[organizationId]/layout.tsx` is the only source of:

- sidebar
- header
- organization context
- user profile
- logout

Feature pages must render only page content. They must not create another shell.

## Required page structure

Use this order for new app pages:

1. `PageHeader`
2. optional `Alert`
3. metric cards or summary cards
4. primary content grid
5. empty/loading/error states

## Core primitives

- `Button`
- `Badge`
- `Alert`
- `Card`
- `PageHeader`
- `MetricCard`
- `TextField`

## Visual direction

Use the same design language as the HR Disciplinary app:

- light operational background
- dark navy sidebar
- navy primary buttons
- teal/emerald accent for active states and status highlights
- white cards
- moderate radius, not fully rounded enterprise bubbles
- Inter typography
- compact, clear dashboard density

## Multi-tenant invariant

Every app page lives under `/app/[organizationId]`.
Every API call for business data must include the same `organizationId`.
