# Book 20 — Property Module Index

Status: Long-term domain research  
Current MVP authority: `docs/MVP_SCOPE.md` and `docs/ARCHITECTURE.md`

## Purpose

This Book will contain the detailed Property bounded-context specification. It
must not be expanded into future Digital Twin capabilities before the MVP
property workflow is validated.

## Required chapters before implementation

1. Property aggregate and invariants.
2. Property, building, and unit lifecycle state machines.
3. Organization-scoped entity relationship model.
4. Commands, queries, API contracts, and error codes.
5. Authorization matrix.
6. Address, time-zone, and jurisdiction model.
7. CSV import and deduplication behavior.
8. Audit events and operational timeline.
9. Search and indexing strategy.
10. Unit, integration, isolation, and E2E test scenarios.

## MVP boundary

The MVP Property module manages properties, buildings, units, addresses,
statuses, time zones, import, and an operational timeline. BIM, GIS, IoT, 3D,
predictive maintenance, and advanced Digital Twin layers are deferred.
