# Definition of Ready for Implementation

Status: Canonical gate

Development may begin with the Phase 1 walking skeleton when every mandatory
item below is checked. Later domains repeat the same gate at domain level.

## Product

- [ ] Primary customer and buyer are named and interview evidence is stored.
- [ ] Problem statement and measurable outcome are agreed.
- [ ] MVP acceptance scenarios have an accountable product owner.
- [ ] Prototype tested with representative users.
- [ ] Included and excluded scope is accepted.

## Domain

- [ ] Ubiquitous language is cleaned and approved.
- [ ] Aggregate boundaries and ownership are explicit.
- [ ] State transitions, invariants, commands, and failure conditions are listed.
- [ ] Financial rules are reviewed by a property-accounting specialist.
- [ ] Jurisdiction-dependent rules are isolated from core logic.

## Data and API

- [ ] Initial ERD includes cardinality, scoped constraints, indexes, and lifecycle.
- [ ] Data classification and retention owner exist for every sensitive entity.
- [ ] OpenAPI conventions and representative contracts are reviewed.
- [ ] Migration, import, idempotency, and reconciliation strategies are defined.
- [ ] Analytics event names exclude sensitive payloads.

## Security and compliance

- [ ] Threat model covers trust boundaries and abuse cases.
- [ ] Authentication/session architecture is selected through an ADR.
- [ ] Authorization matrix includes platform, organization, tenant, and vendor.
- [ ] Cross-tenant test strategy is executable.
- [ ] Required US legal/compliance reviews are identified and assigned.

## Operations

- [ ] Environment and deployment topology are selected.
- [ ] CI quality gates and dependency policy are defined.
- [ ] Backup/PITR and restore-test procedure are funded.
- [ ] Service objectives, telemetry, alerts, and runbook owners are defined.
- [ ] Cost envelope and expected pilot load are documented.

## Decision

Record the readiness review result in an ADR or dated project decision. Unchecked
items require a named owner and an explicit risk acceptance; they are not silently
ignored.
