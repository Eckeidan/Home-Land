On continue avec 12_SYSTEM_ARCHITECTURE.md : la vue globale qui relie Frontend, Backend, DB, Storage, Jobs, IA, Auth, Events et Integrations.

12_SYSTEM_ARCHITECTURE.md

🏡 THE HOME LAND

System Architecture

Version: 1.0

⸻

Purpose

This document defines the global technical architecture of The Home Land.

It describes how all major platform components interact to support a secure, scalable, multi-tenant, AI-ready property management SaaS.

⸻

Architectural Style

The Home Land follows a modular monolith-first architecture with clear domain boundaries.

Future evolution may introduce microservices only when scale, team structure, or operational complexity requires it.

Initial architecture:

Frontend Web App
        ↓
API Gateway / Backend API
        ↓
Domain Services
        ↓
System Engines
        ↓
Database / Storage / Queue / Integrations

⸻

Core Stack

Frontend: Next.js / React / TypeScript / TailwindCSS
Backend: Node.js / Express or NestJS / TypeScript
Database: PostgreSQL
ORM: Prisma
Authentication: JWT + Refresh Tokens + MFA
Payments: Stripe
Storage: S3-compatible object storage
Cache: Redis
Queue: BullMQ / Redis Queue
Search: PostgreSQL FTS, future Elasticsearch/OpenSearch
AI: OpenAI-compatible provider abstraction
Deployment: Docker
CI/CD: GitHub Actions
Monitoring: OpenTelemetry + Logs + Metrics

⸻

High-Level Architecture

Users
  ↓
Web App / Future Mobile App
  ↓
API Layer
  ↓
Authentication Middleware
  ↓
Authorization Engine
  ↓
Domain Services
  ↓
System Engines
  ↓
Repositories
  ↓
PostgreSQL / Redis / Storage / Queue / External APIs

⸻

Main Components

1. Frontend Application

Responsible for:

* User interface
* Routing
* Forms
* Dashboards
* Tenant portal
* Admin portal
* Responsive design
* API consumption
* Local UI state
* Accessibility

The frontend must never contain business-critical authorization logic.

⸻

2. Backend API

Responsible for:

* Authentication
* Authorization
* Business rules
* Domain workflows
* API contracts
* Validation
* Audit
* Events
* Integrations
* Data persistence

⸻

3. Domain Layer

Contains business logic for:

* Organization
* Property
* Unit
* Tenant
* Lease
* Payment
* Maintenance
* Vendor
* Document
* Report
* AI
* Settings

Business logic must not live in controllers.

⸻

4. System Engines

Reusable platform engines:

* Authorization Engine
* Workflow Engine
* Rules Engine
* Audit Engine
* Notification Engine
* Automation Engine
* AI Engine
* Reporting Engine
* Search Engine
* Document Engine
* Billing Engine
* Payment Engine
* Integration Engine
* Analytics Engine
* Scheduling Engine

⸻

5. Database

PostgreSQL is the source of truth.

Every business table must enforce:

* UUID primary key
* organization_id
* audit fields
* soft delete
* version
* foreign keys
* indexes
* constraints

⸻

6. Cache

Redis is used for:

* Session support
* Rate limiting
* Permission cache
* Feature flag cache
* Job queues
* Temporary tokens

Redis is not the source of truth.

⸻

7. Queue System

Background jobs handle:

* Email sending
* SMS sending
* Report generation
* Webhooks
* AI processing
* File processing
* Scheduled jobs
* Billing sync
* Notification delivery

⸻

8. File Storage

Files are stored outside the database.

Examples:

* Lease PDFs
* Receipts
* Inspection photos
* Maintenance images
* Vendor invoices
* Reports
* Logos

Database stores metadata only.

⸻

9. AI Layer

The AI Layer must be provider-agnostic.

It exposes internal services for:

* Summarization
* Classification
* Prediction
* Recommendation
* Chat
* Natural language search
* Report generation

AI output must be auditable when it affects business decisions.

⸻

10. Integration Layer

External systems connect through adapters.

Examples:

* Stripe
* QuickBooks
* DocuSign
* SendGrid
* Twilio
* Microsoft 365
* Google Workspace
* Maps
* Webhooks

Adapters protect the core domain from third-party instability.

⸻

Request Lifecycle

HTTP Request
  ↓
Rate Limiter
  ↓
Authentication
  ↓
Organization Resolution
  ↓
Authorization Engine
  ↓
Validation
  ↓
Domain Service
  ↓
Rules Engine
  ↓
Workflow Engine
  ↓
Repository
  ↓
Database Transaction
  ↓
Domain Event
  ↓
Audit Log
  ↓
Response

⸻

Event Lifecycle

Business Action
  ↓
Domain Event Created
  ↓
Event Stored
  ↓
Event Published
  ↓
Queue Consumers
  ↓
Notifications / Analytics / AI / Webhooks / Reports

⸻

Multi-Tenant Architecture

The default model is logical isolation.

Every tenant organization is isolated through:

organization_id

All services must enforce:

WHERE organization_id = current_user.organization_id

Future enterprise options:

* Dedicated database per enterprise customer
* Dedicated storage bucket
* Dedicated encryption key
* Data residency region

⸻

Security Architecture

Security layers:

Network Security
Application Security
Authentication
Authorization
Organization Isolation
Input Validation
Encryption
Audit Logging
Monitoring
Incident Response

No client-side security assumption is valid.

⸻

API Architecture Principle

All public and internal APIs must be:

* Versioned
* Validated
* Authenticated
* Authorized
* Documented
* Observable
* Backward-compatible where possible

⸻

Observability Architecture

The system must expose:

* Structured logs
* Metrics
* Distributed traces
* Audit logs
* Security events
* Health checks
* Job status
* Integration status

Every critical operation must have a correlation ID.

⸻

Scalability Strategy

Phase 1

Single deployable backend.

Single PostgreSQL instance.

Redis for cache and jobs.

S3-compatible storage.

Phase 2

Read replicas.

Dedicated workers.

Queue scaling.

CDN for assets.

Phase 3

Service extraction for heavy domains:

* Payments
* Notifications
* AI
* Reporting
* Search

Phase 4

Multi-region deployment.

Enterprise customer isolation.

Advanced analytics warehouse.

⸻

Fault Tolerance

The architecture must tolerate:

* External API failure
* Payment provider downtime
* Email/SMS provider failure
* AI provider failure
* Queue retry failure
* File upload interruption
* Database connection spikes

Critical workflows require retry, fallback, and audit trails.

⸻

Deployment Units

Initial deployable units:

web-app
api-server
worker
scheduler
database
redis
object-storage

Future deployable units:

notification-service
payment-service
ai-service
reporting-service
search-service
integration-service

⸻

Environment Strategy

Required environments:

local
development
staging
production

Production must never share credentials or storage with non-production environments.

⸻

Configuration Management

Configuration must use environment variables and secure secret storage.

Forbidden:

* Hardcoded credentials
* Secrets in Git
* Production secrets in local files
* Shared API keys across environments

⸻

Architectural Boundaries

Controllers handle HTTP.

Services handle use cases.

Domain handles business rules.

Repositories handle persistence.

Engines handle reusable platform capability.

Adapters handle external systems.

⸻

Non-Negotiable Rules

1. No business logic in UI components.
2. No authorization logic only on the frontend.
3. No database query without organization isolation.
4. No direct third-party dependency inside domain logic.
5. No financial mutation without audit.
6. No AI irreversible action without approval.
7. No unversioned public API.
8. No file stored directly in the database.
9. No production secret in source code.
10. No module bypasses system engines.

⸻

Final Principle

The Home Land architecture must remain simple enough to build, strong enough to scale, and modular enough to evolve.

The platform begins as a disciplined modular monolith and evolves only when real scale demands service extraction.

Prochaine étape : 13_API_ARCHITECTURE.md.