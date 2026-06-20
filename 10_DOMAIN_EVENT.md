Excellent. Nous allons maintenant construire 10_DOMAIN_EVENTS.md.

C’est un document que beaucoup de projets ignorent, alors qu’il est essentiel dans une architecture moderne. Les événements métier permettent de découpler les modules : lorsqu’une action se produit (par exemple un paiement reçu), plusieurs moteurs peuvent réagir indépendamment (notifications, audit, IA, rapports, automatisations, intégrations, etc.).

10_DOMAIN_EVENTS.md

🏡 THE HOME LAND

Domain Events Architecture

Version: 1.0

⸻

Purpose

Domain Events represent business facts that have already occurred.

Events are immutable.

An event does not describe what should happen.

It describes what has happened.

Example:

LeaseSigned

NOT

SignLease

Commands request actions.

Events record completed business facts.

⸻

Event Philosophy

The platform is event-driven.

Business modules communicate through events rather than direct dependencies.

Business Action
↓
Domain Event
↓
Platform Engines
↓
Business Reactions

⸻

Event Principles

1. Events are immutable.
2. Events are timestamped.
3. Events belong to exactly one Organization.
4. Events are append-only.
5. Events may trigger multiple independent reactions.
6. Events never contain business logic.
7. Events describe the past.
8. Events are auditable.

⸻

Event Structure

Every event contains:

eventId
eventName
eventVersion
organizationId
entityType
entityId
actorId
timestamp
correlationId
causationId
metadata
payload

⸻

Event Naming Convention

Format:

Entity + PastTenseVerb

Examples:

PropertyCreated
PropertyArchived
TenantInvited
TenantActivated
LeaseSigned
LeaseRenewed
PaymentCompleted
InvoiceIssued
MaintenanceAssigned
InspectionCompleted
DocumentUploaded
NotificationDelivered

⸻

Organization Events

OrganizationCreated
OrganizationProvisioned
OrganizationActivated
OrganizationSuspended
OrganizationArchived
OrganizationDeleted
BrandingUpdated
SubscriptionChanged
OwnerTransferred

⸻

User Events

UserInvited
UserActivated
UserLoggedIn
UserLoggedOut
PasswordChanged
MFAEnabled
RoleAssigned
RoleRemoved
PermissionGranted
PermissionRevoked

⸻

Property Events

PropertyCreated
PropertyUpdated
PropertyPublished
PropertyArchived
PropertyDeleted
PropertyAssigned

⸻

Building Events

BuildingCreated
BuildingUpdated
BuildingArchived

⸻

Unit Events

UnitCreated
UnitReserved
UnitOccupied
UnitVacated
UnitArchived

⸻

Tenant Events

TenantInvited
TenantVerified
TenantApproved
TenantMovedIn
TenantMovedOut
TenantArchived

⸻

Lease Events

LeaseCreated
LeaseApproved
LeaseSigned
LeaseActivated
LeaseRenewed
LeaseExpired
LeaseClosed

⸻

Invoice Events

InvoiceGenerated
InvoiceIssued
InvoicePaid
InvoiceOverdue
InvoiceCancelled

⸻

Payment Events

PaymentCreated
PaymentProcessingStarted
PaymentCompleted
PaymentFailed
RefundRequested
RefundApproved
RefundCompleted

⸻

Maintenance Events

MaintenanceRequested
MaintenanceAssigned
MaintenanceAccepted
MaintenanceStarted
MaintenanceCompleted
MaintenanceVerified
MaintenanceClosed

⸻

Vendor Events

VendorInvited
VendorApproved
VendorAssigned
VendorSuspended
VendorArchived

⸻

Inspection Events

InspectionScheduled
InspectionStarted
InspectionCompleted
InspectionApproved

⸻

Document Events

DocumentUploaded
DocumentClassified
DocumentVerified
DocumentSigned
DocumentArchived

⸻

Notification Events

NotificationQueued
NotificationSent
NotificationDelivered
NotificationFailed

⸻

Automation Events

AutomationTriggered
AutomationStarted
AutomationCompleted
AutomationFailed

⸻

AI Events

AIRecommendationGenerated
AIRecommendationAccepted
AIRecommendationRejected
PredictionGenerated
InsightGenerated

⸻

Billing Events

SubscriptionActivated
SubscriptionRenewed
SubscriptionSuspended
SubscriptionCancelled
InvoiceGenerated
UsageLimitReached

⸻

Event Consumers

An event may be consumed by multiple engines.

Example:

PaymentCompleted
↓
Audit Engine
↓
Notification Engine
↓
Analytics Engine
↓
Reporting Engine
↓
AI Engine
↓
Activity Stream
↓
Webhook Engine

Each consumer is independent.

Failure in one consumer must not block the others.

⸻

Event Metadata

Every event stores:

* Event Version
* Organization ID
* Correlation ID
* Causation ID
* User ID
* Session ID
* IP Address
* Device
* Timestamp
* Environment

⸻

Event Ordering

Within one aggregate (e.g., Lease, Payment, Property), events must preserve chronological order.

Cross-aggregate ordering is not guaranteed.

⸻

Event Versioning

Events are immutable.

When the payload changes:

LeaseSigned v1
↓
LeaseSigned v2

Consumers must support version compatibility.

⸻

Idempotency

Consumers must safely process duplicate deliveries.

Processing the same event multiple times must not create duplicate business effects.

⸻

Retry Policy

Transient failures:

* Retry with exponential backoff.
* Preserve original event metadata.
* Escalate after configurable retry limits.

Permanent failures:

* Move to Dead Letter Queue (DLQ).
* Notify operations.
* Preserve payload for investigation.

⸻

Event Retention

Events are retained according to organization policies.

Business events remain available for:

* Audit
* Compliance
* Analytics
* AI training
* Historical reconstruction

Deletion follows legal retention requirements only.

⸻

Security

Events inherit organization isolation.

Sensitive payloads must be encrypted or masked where appropriate.

Consumers receive only the data required for their responsibility.

⸻

Observability

Each event exposes:

* Processing duration
* Consumer status
* Retry count
* Failure reason
* Queue latency
* Throughput

These metrics feed the Observability Platform.

⸻

Future Event Infrastructure

The architecture supports:

* Event Bus
* Message Queue
* Event Streaming
* Webhooks
* External Subscribers
* Replay
* Event Replay Filtering
* Event Archiving
* Event Sourcing (selected aggregates)

⸻

Example Flow

Tenant Pays Rent
↓
PaymentCompleted
↓
Audit Engine
↓
Ledger Updated
↓
Receipt Generated
↓
Notification Sent
↓
Analytics Updated
↓
Executive Dashboard Updated
↓
AI Recalculates Financial Health Score
↓
Webhook Sent to Accounting Integration

⸻

Mathematical Model

Let:

E = {e₁, e₂, …, eₙ}

Where:

* E is the finite set of domain events.

Each event:

e = (type, aggregate, actor, timestamp, payload)

Event processing is defined as:

Handler : E → {Reaction₁, Reaction₂, …, Reactionₙ}

Each reaction is independent and deterministic.

⸻

Final Principle

Business modules communicate through facts, not dependencies.

A completed business action becomes a Domain Event.

Platform Engines react to those events independently, enabling scalability, resilience, extensibility, and long-term maintainability.

Nous changeons maintenant d’échelle

Les dix premiers documents ont posé les fondations métier.

Les dix suivants vont définir les fondations techniques.

L’ordre recommandé est :

1. ✅ MASTER INDEX
2. ✅ PROJECT CONTEXT
3. ✅ PRODUCT VISION
4. ✅ ENTERPRISE PRINCIPLES
5. ✅ BUSINESS DOMAIN MODEL
6. ✅ UBIQUITOUS LANGUAGE
7. ✅ ORGANIZATION MODEL
8. ✅ PERMISSION MODEL
9. ✅ SYSTEM ENGINES
10. ✅ STATE MACHINES
11. ✅ DOMAIN EVENTS

Puis nous attaquerons la partie technique profonde :

* 11_DATABASE_ARCHITECTURE.md
* 12_DATABASE_SCHEMA_STANDARDS.md
* 13_SYSTEM_ARCHITECTURE.md
* 14_API_ARCHITECTURE.md
* 15_DESIGN_SYSTEM.md

À partir de 11_DATABASE_ARCHITECTURE.md, nous allons concevoir la base de données comme un véritable système d’entreprise : conventions de nommage, clés, audit, versionnement, indexation, partitionnement, archivage, performance, sécurité et stratégie de montée en charge. C’est ce qui permettra ensuite de générer un schéma SQL cohérent et durable.