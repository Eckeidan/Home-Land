Excellent.

À mon avis, ce document est le plus important de toute la partie technique.

Pourquoi ?

Parce que le Backend est le cerveau de toute la plateforme.

Il contrôle :

* les règles métier,
* la sécurité,
* les workflows,
* les événements,
* les moteurs,
* les transactions,
* l’IA,
* les intégrations.

Si le Backend est bien conçu, tu pourras remplacer React par Flutter, créer une API publique, ajouter une application mobile, connecter Power BI ou intégrer un ERP sans toucher à la logique métier.

Je vais même aller plus loin que la plupart des architectures SaaS.

Nous allons organiser le Backend comme un Business Operating System (BOS).

⸻

15_BACKEND_ARCHITECTURE.md

🏡 THE HOME LAND

Backend Architecture

Version: 1.0

⸻

Purpose

This document defines the backend architecture for The Home Land.

The backend is the central execution layer responsible for business rules, workflows, security, data integrity, automation, AI orchestration, integrations, and platform services.

It is the single source of business truth.

⸻

Backend Philosophy

The backend is not a CRUD server.

It is a Business Operating System responsible for enforcing every business rule consistently across all clients.

Clients may change.

Business rules do not.

⸻

Technology Stack

Runtime           : Node.js LTS
Language          : TypeScript
Framework         : NestJS (Preferred) or Express (Modular)
ORM               : Prisma
Database          : PostgreSQL
Authentication    : JWT + Refresh Tokens
Authorization     : RBAC + ABAC
Queue             : BullMQ
Cache             : Redis
Storage           : S3 Compatible
Validation        : Zod / class-validator
API               : REST (OpenAPI 3.1)
Logging           : Pino
Tracing           : OpenTelemetry
Testing           : Vitest + Supertest

⸻

Backend Layered Architecture

HTTP Layer
      │
      ▼
Middleware Layer
      │
      ▼
Controllers
      │
      ▼
Application Services
      │
      ▼
Domain Layer
      │
      ▼
System Engines
      │
      ▼
Repositories
      │
      ▼
Prisma
      │
      ▼
PostgreSQL

Each layer has one responsibility.

⸻

Directory Structure

src/
├── api/
├── auth/
├── common/
├── config/
├── domain/
│
├── modules/
│   ├── organizations/
│   ├── onboarding/
│   ├── properties/
│   ├── buildings/
│   ├── units/
│   ├── tenants/
│   ├── leases/
│   ├── invoices/
│   ├── payments/
│   ├── maintenance/
│   ├── vendors/
│   ├── inspections/
│   ├── documents/
│   ├── reports/
│   ├── automation/
│   ├── ai/
│   └── settings/
│
├── engines/
│   ├── authorization/
│   ├── workflow/
│   ├── rules/
│   ├── audit/
│   ├── notification/
│   ├── automation/
│   ├── reporting/
│   ├── ai/
│   ├── billing/
│   ├── onboarding/
│   ├── analytics/
│   └── search/
│
├── events/
├── queues/
├── integrations/
├── repositories/
├── jobs/
├── storage/
├── webhooks/
└── tests/

⸻

Controllers

Controllers have one responsibility:

Receive requests.

Return responses.

Controllers must never contain:

* Business rules
* SQL
* Permission logic
* Workflow logic
* Financial calculations

Controllers delegate everything.

⸻

Application Services

Application Services orchestrate use cases.

Example:

Create Lease
↓
Validate Request
↓
Authorization Engine
↓
Rules Engine
↓
Lease Domain
↓
Workflow Engine
↓
Repository
↓
Emit Domain Event
↓
Return Response

⸻

Domain Layer

The Domain Layer contains:

* Business rules
* Business invariants
* State transitions
* Calculations
* Validation
* Policies

The Domain Layer never depends on HTTP.

⸻

Repository Layer

Repositories abstract persistence.

Responsibilities:

* Read
* Write
* Transactions
* Pagination
* Filtering
* Query optimization

Repositories never contain business decisions.

⸻

System Engines

Every cross-cutting concern belongs to an Engine.

Examples:

Authorization Engine

Workflow Engine

Rules Engine

Audit Engine

Notification Engine

Automation Engine

Reporting Engine

Analytics Engine

AI Engine

Search Engine

Onboarding Engine

No module may duplicate engine responsibilities.

⸻

Request Pipeline

HTTP Request
      │
      ▼
Rate Limiter
      │
      ▼
Authentication
      │
      ▼
Organization Resolution
      │
      ▼
Authorization Engine
      │
      ▼
Validation
      │
      ▼
Application Service
      │
      ▼
Domain Layer
      │
      ▼
Workflow Engine
      │
      ▼
Repository
      │
      ▼
Database Transaction
      │
      ▼
Domain Event
      │
      ▼
Audit Engine
      │
      ▼
HTTP Response

⸻

Transaction Strategy

Every critical business operation executes inside a database transaction.

Examples:

* Lease creation
* Payment processing
* Refund
* Move-In
* Move-Out
* Subscription update
* Ownership transfer

Domain events are published only after successful commit.

⸻

Event Architecture

Business modules emit domain events.

Consumers execute independently.

Examples:

LeaseSigned
↓
Audit
↓
Notification
↓
Analytics
↓
AI
↓
Webhooks

⸻

Queue Architecture

Background jobs include:

* Emails
* SMS
* Push notifications
* PDF generation
* AI processing
* OCR
* Imports
* Exports
* Billing synchronization
* Scheduled maintenance
* Daily KPI calculations

Workers must be horizontally scalable.

⸻

Security

Every request validates:

* JWT
* Organization
* Membership
* Permission
* Policy
* Resource ownership

Sensitive operations additionally require:

* MFA
* Re-authentication
* Approval workflow
* Audit logging

⸻

Validation

Validation occurs at multiple levels:

HTTP Schema

↓

Application Rules

↓

Domain Rules

↓

Database Constraints

Validation is never delegated to the frontend.

⸻

Error Handling

Errors follow a standardized structure.

Categories:

Validation

Authentication

Authorization

Business Rule

Infrastructure

Integration

Unexpected

Every error includes a correlation ID.

⸻

Configuration

Configuration sources:

Environment variables

Secret manager

Feature flags

Organization settings

Configuration is immutable during runtime where possible.

⸻

External Integrations

Third-party providers are isolated through adapters.

Supported:

* Stripe
* OpenAI-compatible AI
* DocuSign
* Twilio
* SendGrid
* Microsoft 365
* Google Workspace
* QuickBooks
* Webhooks

The Domain Layer never imports vendor SDKs directly.

⸻

AI Orchestration

The AI Engine coordinates:

* Prompt templates
* Provider selection
* Cost tracking
* Token limits
* Moderation
* Caching
* Response validation
* Audit
* Fallback providers

Future support:

Multiple AI providers with dynamic routing.

⸻

File Processing

Pipeline:

Upload
↓
Virus Scan
↓
Metadata Extraction
↓
Storage
↓
Thumbnail Generation
↓
OCR
↓
AI Classification
↓
Database Metadata
↓
Domain Event

⸻

Scheduling

Scheduled jobs:

* Rent generation
* Subscription billing
* Reminder notifications
* SLA monitoring
* Data retention
* KPI recalculation
* AI health checks
* Backup verification

⸻

Performance

Backend optimizations:

* Connection pooling
* Query optimization
* Pagination
* Caching
* Batch processing
* Streaming
* Compression
* Lazy loading

Avoid:

* N+1 queries
* Long-running transactions
* Blocking I/O

⸻

Observability

Every request emits:

* Logs
* Metrics
* Traces
* Audit events
* Security events

Every operation includes:

Correlation ID

Organization ID

User ID

Execution time

⸻

Scalability

Phase 1

Modular Monolith

↓

Phase 2

Dedicated Workers

↓

Phase 3

Read Replicas

↓

Phase 4

Service Extraction

↓

Phase 5

Event Bus

↓

Phase 6

Multi-Region

Service extraction occurs only after measured need.

⸻

Testing Strategy

Required:

* Unit tests
* Integration tests
* Repository tests
* API tests
* Security tests
* Contract tests
* Load tests

Critical workflows require end-to-end verification.

⸻

Coding Standards

* Dependency Injection
* SOLID principles
* Domain-Driven Design
* Repository Pattern
* Strategy Pattern
* Factory Pattern
* Event-Driven Architecture
* CQRS-ready architecture
* Open/Closed Principle

⸻

Non-Negotiable Rules

1. Controllers never contain business logic.
2. Domain Layer owns business rules.
3. Repositories own persistence.
4. Engines own reusable platform capabilities.
5. Every transaction is auditable.
6. Every financial operation is transactional.
7. Every module emits domain events.
8. Every API request enforces organization isolation.
9. Third-party SDKs never leak into the Domain Layer.
10. Business rules are deterministic and testable.

⸻

Backend Vision

The backend is designed as a long-lived enterprise platform capable of serving:

* Millions of users
* Thousands of organizations
* Billions of business events
* Multiple AI providers
* Multi-region deployments
* Public APIs
* Mobile applications
* Enterprise integrations

without requiring architectural redesign.

⸻

Final Principle

The backend is the execution engine of The Home Land.

Every business rule, workflow, transaction, and integration must pass through a consistent, secure, observable, and scalable architecture that prioritizes correctness over convenience.

⸻

J’ai une proposition qui va énormément augmenter la valeur du projet

À partir d’ici, je pense qu’il faut arrêter temporairement les documents techniques.

Nous avons déjà construit une base d’architecture très solide.

Je propose de changer de niveau et de commencer ce qui fera réellement la différence face à AppFolio, Buildium ou DoorLoop :

Les spécifications des modules.

Par exemple :

* PROPERTY_MODULE_SPECIFICATION.md (~150 pages)
* TENANT_MODULE_SPECIFICATION.md
* LEASE_MODULE_SPECIFICATION.md
* PAYMENT_MODULE_SPECIFICATION.md
* MAINTENANCE_MODULE_SPECIFICATION.md

Chaque module décrira :

* Vision
* Cas d’usage
* Workflow
* Écrans
* APIs
* Base de données
* Permissions
* États
* Événements
* Automatisations
* IA
* Notifications
* Rapports
* KPIs
* Edge Cases
* Tests
* UX détaillée

C’est cette documentation qui permettra ensuite à Codex de développer des modules complets avec très peu d’ambiguïté et un niveau de cohérence élevé sur l’ensemble de la plateforme.