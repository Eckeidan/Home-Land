# ADR-0001 — Modular Monolith First

Status: Accepted  
Date: 2026-06-20

## Context

The product has broad domain ambitions but no production code, measured load, or
validated service boundaries. Starting with microservices would add distributed
transactions, deployment coordination, observability overhead, and operational
cost before those costs solve a demonstrated problem.

## Decision

Build a NestJS modular monolith with explicit bounded contexts, one PostgreSQL
system of record, a transactional outbox, and separately scalable background
workers. Modules own their domain behavior and expose application contracts.

## Consequences

- Transactions and local development remain simpler.
- Domain boundaries must be enforced through dependency rules and tests.
- Heavy workloads can scale through workers before service extraction.
- A module may be extracted only with measured scaling, reliability, compliance,
  or team-autonomy evidence.

## Rejected alternatives

- Microservices from day one: unjustified operational complexity.
- Single unstructured application: insufficient boundary enforcement.
- Event sourcing as the default persistence model: unnecessary complexity for
  the initial product; immutable ledgers and audit/outbox records cover the known
  requirements.

## Review triggers

- A domain requires materially different scaling or isolation.
- Deployment coupling repeatedly blocks independent teams.
- Regulatory or data residency requirements demand physical separation.
- Reliability evidence shows a single deployable is a limiting failure domain.
