Très bon choix.

Pour une plateforme Enterprise, les State Machines sont obligatoires.

La majorité des applications changent simplement une colonne status.

Exemple :

status = 'ACTIVE'

Puis n’importe quel développeur peut la modifier.

C’est une erreur d’architecture.

Dans The Home Land, aucun état ne pourra changer directement.

Chaque transition passera par le Workflow Engine, sera contrôlée par le Rules Engine, validée par le Permission Engine et enregistrée par le Audit Engine.

Autrement dit :

Current State
      │
      ▼
Permission Engine
      │
      ▼
Rules Engine
      │
      ▼
Workflow Engine
      │
      ▼
Audit Engine
      │
      ▼
Next State

C’est cette architecture qui garantit la cohérence métier.

⸻

09_STATE_MACHINES.md

🏡 THE HOME LAND

Enterprise State Machines

Version: 1.0

⸻

Purpose

Every business entity has a lifecycle.

This document defines every valid business state and every allowed transition inside The Home Land.

State transitions are platform capabilities.

No entity may change state outside the Workflow Engine.

⸻

State Machine Principles

Principle 1

Every entity has exactly one current state.

⸻

Principle 2

Transitions are explicit.

Implicit state changes are forbidden.

⸻

Principle 3

Every transition generates:

* Domain Event
* Audit Record
* Activity Log
* Notifications (optional)
* Automation (optional)

⸻

Principle 4

State transitions require:

* Permission validation
* Business rule validation
* Organization validation

⸻

Principle 5

State history is immutable.

⸻

Generic Transition Model

Current State
        │
        ▼
Requested Transition
        │
        ▼
Permission Engine
        │
        ▼
Rules Engine
        │
        ▼
Workflow Engine
        │
        ▼
Audit Engine
        │
        ▼
Activity Stream
        │
        ▼
Domain Event
        │
        ▼
Next State

⸻

Organization Lifecycle

Draft
↓
Provisioning
↓
Active
↓
Suspended
↓
Archived
↓
Deleted

Allowed transitions

Draft → Provisioning

Provisioning → Active

Active → Suspended

Suspended → Active

Active → Archived

Archived → Deleted

⸻

User Lifecycle

Invited
↓
Pending Verification
↓
Active
↓
Locked
↓
Suspended
↓
Disabled
↓
Deleted

Rules

Deleted users remain in audit history.

Locked users cannot authenticate.

⸻

Property Lifecycle

Draft
↓
Available
↓
Occupied
↓
Under Maintenance
↓
Unavailable
↓
Archived

Rules

Occupied properties cannot be archived.

Archived properties become read-only.

⸻

Unit Lifecycle

Draft
↓
Available
↓
Reserved
↓
Occupied
↓
Maintenance
↓
Unavailable
↓
Archived

Rules

Only Available units may receive new leases.

Maintenance blocks occupancy.

⸻

Lease Lifecycle

Draft
↓
Pending Approval
↓
Approved
↓
Signed
↓
Active
↓
Renewal Pending
↓
Renewed
↓
Expired
↓
Closed
↓
Archived

Rules

Only Signed leases become Active.

Closed leases are immutable.

Archived leases remain searchable.

⸻

Tenant Lifecycle

Invited
↓
Pending Documents
↓
Approved
↓
Active
↓
Moving Out
↓
Former Tenant
↓
Archived

Rules

Former tenants retain payment history.

Archived tenants remain available for reporting.

⸻

Payment Lifecycle

Created
↓
Pending
↓
Processing
↓
Completed
↓
Reconciled

Alternative Flow

Processing
↓
Failed

Alternative Flow

Completed
↓
Refund Requested
↓
Refund Approved
↓
Refunded

Rules

Completed payments cannot be edited.

Reconciled payments become immutable.

⸻

Invoice Lifecycle

Draft
↓
Issued
↓
Partially Paid
↓
Paid
↓
Overdue
↓
Cancelled

Rules

Paid invoices cannot return to Draft.

Cancelled invoices remain visible.

⸻

Maintenance Request Lifecycle

Created
↓
Submitted
↓
Assigned
↓
Accepted
↓
In Progress
↓
Waiting Parts
↓
Waiting Approval
↓
Completed
↓
Verified
↓
Closed

Alternative Flow

Rejected

Cancelled

Rules

Closed requests become read-only.

⸻

Work Order Lifecycle

Created
↓
Assigned
↓
Accepted
↓
Working
↓
Completed
↓
Verified
↓
Closed

⸻

Vendor Lifecycle

Invited
↓
Pending Review
↓
Approved
↓
Active
↓
Suspended
↓
Inactive
↓
Archived

⸻

Inspection Lifecycle

Scheduled
↓
Started
↓
Completed
↓
Approved
↓
Archived

⸻

Document Lifecycle

Uploaded
↓
Scanning
↓
Classified
↓
Verified
↓
Signed
↓
Archived

Future

OCR

AI Classification

Digital Signature

⸻

Subscription Lifecycle

Trial
↓
Active
↓
Past Due
↓
Suspended
↓
Cancelled
↓
Expired

Rules

Suspended subscriptions limit platform functionality.

Business data is never deleted.

⸻

Automation Lifecycle

Draft
↓
Enabled
↓
Running
↓
Paused
↓
Disabled
↓
Archived

⸻

AI Recommendation Lifecycle

Generated
↓
Reviewed
↓
Accepted
↓
Executed

Alternative

Rejected

Expired

AI recommendations never execute automatically.

⸻

Notification Lifecycle

Created
↓
Queued
↓
Sending
↓
Delivered

Alternative

Failed

Expired

⸻

Approval Workflow

Requested
↓
Under Review
↓
Approved

Alternative

Rejected

Cancelled

Expired

⸻

Generic Transition Rules

Every transition defines:

Current State

Next State

Required Permission

Required Policy

Required Approval

Generated Events

Notifications

Automations

Audit Requirements

Rollback Strategy

⸻

Transition Metadata

Every transition records:

Transition ID

Entity ID

Previous State

Next State

Timestamp

Actor

Reason

Approval ID

Correlation ID

Organization ID

⸻

Illegal Transitions

Examples

Draft → Archived

Completed Payment → Draft

Closed Lease → Active

Deleted User → Active

Archived Property → Available

Illegal transitions must be rejected by the Workflow Engine.

⸻

Rollback Strategy

Rollback is permitted only when:

Business rules allow it.

Required approvals exist.

Financial integrity is preserved.

Audit records are never removed.

⸻

State History

Every entity maintains complete state history.

Example

Lease
Draft
↓
Approved
↓
Signed
↓
Active
↓
Renewed
↓
Active
↓
Expired
↓
Closed

History is immutable.

⸻

Future Workflow Features

Support for:

* Parallel workflows
* Conditional transitions
* Escalation rules
* SLA timers
* Approval chains
* AI-assisted routing
* BPMN import/export
* Visual workflow designer
* No-code workflow editor

⸻

Mathematical Model

Each state machine is represented as:

S = {s₁, s₂, …, sₙ}

where:

* S is the finite set of valid states.

Transitions are defined as:

T ⊆ S × S

Every transition belongs to the set of allowed ordered pairs.

For every transition:

(CurrentState, NextState) ∈ T

Otherwise:

Transition = INVALID

This guarantees deterministic and verifiable workflows.

⸻

Final Principle

A business entity is never defined solely by its data.

Its lifecycle, transitions, permissions, and business rules are equally part of its identity.

Every lifecycle within The Home Land must be modeled as a deterministic, auditable, and secure state machine.

⸻

À partir d’ici, nous entrons dans la phase “Architecture Profonde”

Les documents suivants vont définir les fondations techniques définitives de la plateforme :

1. 10_DOMAIN_EVENTS.md — Tous les événements métier (LeaseSigned, PaymentCompleted, TenantMovedOut, etc.).
2. 11_DATABASE_ARCHITECTURE.md — Modèle logique de la base de données, conventions, audit, indexation, partitionnement.
3. 12_SYSTEM_ARCHITECTURE.md — Architecture complète Frontend, Backend, API, Workers, Queues, Storage, Cache, Search, IA.
4. 13_API_ARCHITECTURE.md — Standards REST, versionnement, contrats, pagination, erreurs, webhooks.
5. 14_DESIGN_SYSTEM.md — Design System complet (couleurs, composants, animations, accessibilité).

