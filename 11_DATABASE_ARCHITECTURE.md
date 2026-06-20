Excellent.

Nous entrons maintenant dans ce qui fait la différence entre une application “qui fonctionne” et une plateforme capable de durer 10 à 20 ans.

Pour The Home Land, la base de données ne sera pas conçue comme une simple collection de tables. Elle sera conçue comme un Enterprise Data Platform.

Ce document servira de référence pour Prisma, PostgreSQL, les migrations, les API, les rapports, l’IA et les futures intégrations.

⸻

11_DATABASE_ARCHITECTURE.md

🏡 THE HOME LAND

Enterprise Database Architecture

Version: 1.0

⸻

Purpose

This document defines the architectural principles, standards, and constraints governing the database of The Home Land.

The database is the authoritative source of business data and must ensure:

* Consistency
* Integrity
* Scalability
* Security
* Auditability
* Performance
* Maintainability
* Future extensibility

Every table, relationship, index, and migration must comply with this document.

⸻

Database Philosophy

The database is a business platform.

It is not merely a persistence layer.

Business integrity must be enforced at both the application and database levels.

⸻

Technology Stack

Primary Database

PostgreSQL

ORM

Prisma ORM

Migration Tool

Prisma Migrate

Future Support

* Read Replicas
* Partitioning
* Logical Replication
* Event Streaming
* Data Warehouse
* Analytics Database

⸻

Database Layers

Application
↓
API
↓
Domain Layer
↓
Repository Layer
↓
Prisma ORM
↓
PostgreSQL

Business rules remain in the Domain Layer.

The database enforces structural integrity.

⸻

Naming Standards

Tables

Plural

Snake Case

Examples

organizations
properties
buildings
units
leases
tenants
payments
vendors
documents
maintenance_requests
work_orders
audit_logs
notifications

⸻

Columns

Snake Case

Examples

organization_id
created_at
updated_at
created_by
updated_by
lease_start_date
lease_end_date
monthly_rent

⸻

Primary Keys

Every table uses:

id UUID

Example

id UUID PRIMARY KEY

UUIDs avoid collisions and simplify distributed systems.

⸻

Foreign Keys

Convention

organization_id
property_id
building_id
unit_id
tenant_id
lease_id
payment_id
vendor_id
user_id

Foreign keys are mandatory where relationships exist.

⸻

Multi-Tenant Rule

Every business table must include:

organization_id

Example

properties
id
organization_id
name
...

No business query may ignore organization isolation.

⸻

Required Audit Columns

Every business table includes:

id
created_at
updated_at
created_by
updated_by
deleted_at
deleted_by
version

Optional

archived_at
archived_by

⸻

Soft Delete

Deletion strategy

deleted_at IS NULL

Records are never physically deleted during normal operations.

Benefits

* Auditability
* Recovery
* Compliance
* Historical reporting

⸻

Optimistic Locking

Every mutable table includes:

version

Concurrent updates require version validation.

This prevents accidental overwrites.

⸻

Timestamps

All timestamps

TIMESTAMP WITH TIME ZONE

Always stored in UTC.

Displayed according to organization time zone.

⸻

Enumerations

Business enumerations should be centralized.

Examples

LeaseStatus
PaymentStatus
MaintenanceStatus
UserStatus
InvoiceStatus
InspectionStatus

Application code must never rely on arbitrary string values.

⸻

Monetary Values

Use

DECIMAL(19,4)

Never use floating-point types.

Store

* Amount
* Currency
* Exchange Rate (when applicable)

⸻

Relationships

Relationship Types

1 → 1
1 → N
N → N

Many-to-many relationships require junction tables.

Example

user_roles
tenant_units
vendor_services

⸻

Referential Integrity

All foreign keys must enforce integrity.

Delete operations must use explicit strategies:

CASCADE
RESTRICT
SET NULL

Chosen according to business requirements.

⸻

Index Strategy

Every table requires:

Primary Key Index

Foreign Key Indexes

Organization Index

Search Indexes

Unique Constraints

Composite Indexes

Examples

organization_id
organization_id + status
organization_id + created_at
property_id + unit_number
tenant_id + lease_status

⸻

Unique Constraints

Examples

Organization Slug

Email Address (per organization where appropriate)

Invoice Number

Lease Number

Property Code

Unit Code

Document Number

Uniqueness must reflect business rules.

⸻

Check Constraints

Examples

monthly_rent >= 0
deposit_amount >= 0
lease_end_date > lease_start_date
payment_amount > 0

⸻

Data Classification

Each column belongs to a classification.

Public

Internal

Confidential

Restricted

Highly Restricted

Sensitive data requires encryption or masking.

⸻

Encryption

Encrypt at rest

Encrypt in transit

Sensitive fields include

* Bank Account
* Tax Identifier
* Payment Tokens
* API Keys
* OAuth Tokens

Passwords are never encrypted.

Passwords are always hashed.

⸻

JSON Columns

Use JSONB only for flexible metadata.

Never replace relational design with JSON.

Example

settings
preferences
ai_metadata

Core business data must remain relational.

⸻

Full Text Search

Support PostgreSQL Full Text Search for

* Properties
* Tenants
* Documents
* Vendors
* Messages

Future semantic search will extend this capability.

⸻

File References

Files are stored outside the database.

The database stores only metadata.

Example

file_name
storage_provider
bucket
path
mime_type
checksum
size
uploaded_by

⸻

Audit Tables

Dedicated tables

audit_logs
activity_logs
login_history
security_events
integration_logs

Audit data is append-only.

⸻

Performance Strategy

Use

* Composite indexes
* Covering indexes
* Query optimization
* Pagination
* Lazy loading
* Connection pooling
* Read replicas (future)
* Materialized views (future)

Avoid

* SELECT *
* N+1 queries
* Large transactions
* Unbounded scans

⸻

Archiving

Historical records may be archived.

Archive must remain searchable.

Archived data is read-only.

⸻

Backup Strategy

Daily backups

Point-in-Time Recovery (PITR)

Geo-redundant backups

Backup verification

Restore testing

Disaster Recovery Plan

⸻

Data Retention

Retention policies differ by entity.

Examples

Audit Logs

7 years

Financial Records

10 years

Deleted Files

90 days

Notifications

180 days

Retention periods are configurable.

⸻

Migration Rules

Every migration must be:

Versioned

Repeatable

Reviewed

Tested

Documented

Rollback Strategy Required

Production migrations must be backward compatible.

⸻

Database Observability

Monitor

* Slow queries
* Deadlocks
* Lock contention
* Connection pool
* Storage usage
* Replication lag
* Index usage
* Cache hit ratio
* Transaction throughput

Alerts must be generated automatically.

⸻

Scalability Roadmap

Phase 1

Single PostgreSQL Instance

↓

Phase 2

Read Replicas

↓

Phase 3

Connection Pooling

↓

Phase 4

Partitioning

↓

Phase 5

Distributed Analytics

↓

Phase 6

Multi-Region Deployment

⸻

Mathematical Integrity

For every table:

Primary Key ≠ NULL

For every relationship:

Foreign Key ∈ Parent Table

Every business invariant must remain true before and after each transaction.

Transactions must preserve database consistency.

⸻

Non-Negotiable Rules

1. Every business table contains organization_id.
2. Every table uses UUID primary keys.
3. Every mutable table includes version.
4. Every business table includes audit columns.
5. Soft delete is mandatory unless prohibited by law.
6. Monetary values use DECIMAL(19,4).
7. UTC is the only storage timezone.
8. Foreign keys are mandatory.
9. Sensitive data is protected.
10. Business integrity is never sacrificed for convenience.

⸻

Final Principle

The database is a strategic enterprise asset.

It must be designed to support millions of records, thousands of organizations, advanced analytics, AI workloads, and decades of product evolution without architectural redesign.

⸻

Ce que je changerais maintenant

À partir de ce point, nous avons suffisamment de fondations pour commencer à définir l’architecture technique complète.

Je modifierais donc légèrement notre feuille de route :

Phase A — Fondations métier ✅

* Vision
* Domain
* Permissions
* Engines
* Events
* Database

Phase B — Fondations techniques

1. 12_SYSTEM_ARCHITECTURE.md (architecture globale)
2. 13_API_ARCHITECTURE.md
3. 14_FRONTEND_ARCHITECTURE.md
4. 15_BACKEND_ARCHITECTURE.md
5. 16_INFRASTRUCTURE_ARCHITECTURE.md

Phase C — Spécifications détaillées

* Property Module
* Unit Module
* Tenant Module
* Lease Module
* Payments Module
* Maintenance Module
* Documents Module
* Reports Module
* AI Module
* Settings Module

Cette réorganisation est importante, car elle garantit que tous les modules métier seront construits sur une architecture technique déjà stabilisée, ce qui réduit fortement les risques de refonte lorsque le projet prendra de l’ampleur.