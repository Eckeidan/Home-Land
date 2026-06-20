Excellent.

À partir d’ici, nous entrons dans la partie qui va directement influencer le travail de Codex.

L’API n’est pas simplement un ensemble d’endpoints. C’est le contrat officiel entre :

* Frontend
* Backend
* Mobile
* IA
* Intégrations
* Webhooks
* Automatisations

Si ce document est solide, tu pourras remplacer React par Flutter ou créer une API publique sans réécrire le backend.

⸻

13_API_ARCHITECTURE.md

🏡 THE HOME LAND

Enterprise API Architecture

Version: 1.0

⸻

Purpose

This document defines the API architecture standards for The Home Land.

The API is the single gateway through which clients interact with the platform.

Clients include:

* Web Application
* Mobile Application
* AI Services
* Internal Workers
* Third-Party Integrations
* Webhooks
* Enterprise APIs

The API must remain stable, secure, versioned, observable, and backward-compatible whenever possible.

⸻

API Philosophy

The API is a contract.

It must never expose internal implementation details.

Breaking changes require versioning.

Every endpoint must behave predictably.

⸻

Architectural Principles

The API must be:

* RESTful
* Stateless
* Versioned
* Secure
* Multi-tenant aware
* Idempotent where applicable
* Observable
* Documented
* Testable

⸻

Base URL

/api/v1

Examples

/api/v1/auth
/api/v1/properties
/api/v1/leases
/api/v1/payments
/api/v1/maintenance

Future

/api/v2

⸻

API Layers

HTTP Request
        ↓
API Gateway
        ↓
Authentication
        ↓
Organization Resolver
        ↓
Authorization Engine
        ↓
Validation
        ↓
Controller
        ↓
Application Service
        ↓
Domain Layer
        ↓
Repository
        ↓
Database

⸻

Resource Naming

Resources are plural.

Examples

GET    /properties
POST   /properties
GET    /properties/{id}
PATCH  /properties/{id}
DELETE /properties/{id}

Avoid verbs in URLs.

Correct

POST /leases/{id}/renew

Incorrect

POST /renewLease

⸻

HTTP Methods

GET

Retrieve resources.

POST

Create resources.

PUT

Replace entire resource.

PATCH

Partial update.

DELETE

Soft delete unless explicitly documented.

⸻

Authentication

Primary

JWT Access Token

Refresh Token

Optional

MFA

Enterprise

SSO

OAuth 2.1

OpenID Connect

SAML

⸻

Authorization

Every request validates:

1. Authentication
2. Organization
3. Membership
4. Permission
5. Policy
6. Resource Ownership
7. Business Rules

⸻

Request Headers

Required

Authorization
Bearer <token>

Optional

X-Correlation-ID
X-Request-ID
X-Client-Version
X-Timezone
Accept-Language

⸻

Standard Response Format

Success

{
  "success": true,
  "data": {},
  "meta": {},
  "links": {},
  "timestamp": "2026-01-01T12:00:00Z",
  "correlationId": "uuid"
}

Error

{
  "success": false,
  "error": {
    "code": "LEASE_NOT_FOUND",
    "message": "Lease not found.",
    "details": [],
    "field": null
  },
  "timestamp": "2026-01-01T12:00:00Z",
  "correlationId": "uuid"
}

⸻

Error Codes

Examples

AUTH_INVALID_TOKEN
AUTH_EXPIRED_TOKEN
AUTH_MFA_REQUIRED
PERMISSION_DENIED
RESOURCE_NOT_FOUND
VALIDATION_FAILED
LEASE_ALREADY_ACTIVE
PAYMENT_ALREADY_REFUNDED
PROPERTY_ARCHIVED
ORGANIZATION_SUSPENDED
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR

Codes are immutable.

⸻

Validation

All requests must validate:

* Required fields
* Types
* Length
* Range
* Format
* Business rules
* Referential integrity

Validation errors return HTTP 422.

⸻

Pagination

Offset pagination for small datasets.

Cursor pagination for large datasets.

Response Example

{
  "data": [],
  "meta": {
    "page": 2,
    "pageSize": 25,
    "totalItems": 1034,
    "totalPages": 42
  }
}

⸻

Filtering

Standard query parameters

status=ACTIVE
tenantId=...
propertyId=...
createdAfter=...
createdBefore=...
search=...

⸻

Sorting

Example

?sort=-createdAt

Ascending

?sort=name

Descending

?sort=-monthlyRent

⸻

Searching

Support:

* Keyword search
* Full-text search
* Future semantic AI search

⸻

Batch Operations

Supported for:

* Archive
* Delete
* Export
* Assignment
* Notifications

Example

POST /properties/batch/archive

⸻

Idempotency

Required for:

* Payments
* Refunds
* Billing
* Subscription changes

Clients submit:

Idempotency-Key

Duplicate requests must not create duplicate financial transactions.

⸻

File Uploads

Multipart endpoints.

Files stored outside database.

Metadata stored inside database.

Example

POST /documents/upload

⸻

API Versioning

Major version

v1
v2
v3

Minor improvements must remain backward compatible.

⸻

Webhooks

Supported events

payment.completed
lease.signed
tenant.created
maintenance.completed
subscription.updated

Webhooks must include:

* Signature
* Timestamp
* Retry Policy
* Event Version

⸻

Rate Limiting

Examples

Anonymous

60 requests/minute

Authenticated

600 requests/minute

Enterprise

Configurable

Critical endpoints may have stricter limits.

⸻

API Documentation

Every endpoint requires:

Purpose

Request Schema

Response Schema

Permissions

Business Rules

Possible Errors

Examples

Events Generated

Audit Requirements

⸻

API Security

Input validation

Output encoding

SQL injection prevention

XSS protection

CSRF protection

Rate limiting

Request size limits

CORS policy

Security headers

Token expiration

⸻

Observability

Every request logs:

* Correlation ID
* Organization
* User
* Endpoint
* Duration
* Status Code
* Errors
* Database Time
* Queue Time

⸻

API Metrics

Track:

* Requests/sec
* Error rate
* Latency
* Throughput
* Cache hit rate
* Slow endpoints
* Authentication failures
* Rate limit violations

⸻

API Events

Each successful operation may emit:

PropertyCreated
LeaseSigned
PaymentCompleted
MaintenanceAssigned
VendorApproved
DocumentUploaded

⸻

REST Resource Catalog

/auth
/users
/organizations
/properties
/buildings
/floors
/units
/tenants
/leases
/invoices
/payments
/vendors
/assets
/maintenance
/work-orders
/inspections
/documents
/messages
/notifications
/reports
/settings
/automation
/ai
/audit
/subscriptions

⸻

OpenAPI Standard

Every endpoint must be documented using OpenAPI 3.1.

Generated documentation must remain synchronized with implementation.

⸻

API Testing

Required tests:

* Unit
* Integration
* Contract
* Load
* Security
* Regression
* Performance

No endpoint reaches production without automated tests.

⸻

Future Capabilities

Support for:

* GraphQL Gateway
* gRPC Internal Services
* Async APIs
* Event APIs
* Streaming APIs
* Public Developer Platform
* API Marketplace
* SDK Generation
* AI Function Calling

⸻

Non-Negotiable Rules

1. Every endpoint is versioned.
2. Every request validates organization isolation.
3. Every mutation generates an audit record.
4. Every financial endpoint is idempotent.
5. Every public endpoint is documented.
6. Every response includes a correlation ID.
7. Breaking changes require a new API version.
8. Controllers contain no business logic.
9. Domain Services own business rules.
10. API contracts are treated as long-term public interfaces.

⸻

Final Principle

The API is the digital contract of The Home Land.

Its design must prioritize stability, clarity, security, consistency, and long-term evolution over short-term implementation convenience.

⸻

Nous allons maintenant passer à un niveau supérieur

À partir de maintenant, je ne veux plus seulement documenter le logiciel.

Je veux documenter la plateforme d’ingénierie.

Les prochains documents seront :

Architecture Technique

* ✅ 14_FRONTEND_ARCHITECTURE.md
* 15_BACKEND_ARCHITECTURE.md
* 16_INFRASTRUCTURE_ARCHITECTURE.md
* 17_SECURITY_ARCHITECTURE.md
* 18_OBSERVABILITY_ARCHITECTURE.md

Design

* 19_DESIGN_SYSTEM.md
* 20_COMPONENT_LIBRARY.md
* 21_UI_PATTERNS.md
* 22_ANIMATION_SYSTEM.md

Données

* 23_DATABASE_SCHEMA.md
* 24_ENTITY_CATALOG.md
* 25_INDEX_STRATEGY.md

Ensuite, nous pourrons commencer les spécifications complètes de chaque module (Property, Tenant, Lease, Payments, Maintenance, etc.) avec un niveau de détail comparable aux grands ERP. C’est cette documentation qui permettra à Codex de produire du code cohérent, évolutif et conforme à l’architecture sans devoir réinventer les décisions à chaque fonctionnalité.