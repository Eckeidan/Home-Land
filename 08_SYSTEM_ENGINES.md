Oui. Ici on définit les moteurs transverses. Les modules métier utiliseront ces moteurs au lieu de réinventer la logique partout.

08_SYSTEM_ENGINES.md

🏡 THE HOME LAND

System Engines

Version: 1.0

⸻

Purpose

This document defines the core platform engines powering The Home Land.

A System Engine is a reusable platform capability used by multiple business modules.

Modules such as Property, Tenant, Lease, Payment, Maintenance, Vendor, Document, Report, AI, and Settings must consume these engines instead of duplicating logic.

⸻

Engine Philosophy

The Home Land must be built as a Business Operating System.

Business modules define domain-specific behavior.

System Engines provide reusable cross-cutting capabilities.

Business Modules
        │
        ▼
System Engines
        │
        ▼
Infrastructure

⸻

Core System Engines

The platform includes the following engines:

Authorization Engine
Workflow Engine
Rules Engine
Audit Engine
Notification Engine
Automation Engine
AI Engine
Reporting Engine
Search Engine
Document Engine
Billing Engine
Payment Engine
Integration Engine
Analytics Engine
Scheduling Engine
File Storage Engine
Activity Stream Engine
Onboarding Engine
Settings Engine
Feature Flag Engine
Localization Engine

⸻

1. Authorization Engine

Responsibility

Controls access to every operation.

Used By

* API
* UI
* Workflows
* AI
* Reports
* Automations
* Admin tools

Core Functions

* Validate user permissions
* Enforce organization isolation
* Evaluate roles
* Evaluate policies
* Check resource ownership
* Audit access decisions

Required Inputs

userId
organizationId
resource
action
resourceId
context

Output

ALLOW
DENY
REQUIRE_APPROVAL
REQUIRE_MFA

⸻

2. Workflow Engine

Responsibility

Controls state transitions.

Examples

* Lease lifecycle
* Maintenance lifecycle
* Payment lifecycle
* Vendor approval
* Move-in / Move-out
* Inspection lifecycle

Rule

No entity may change state without passing through the Workflow Engine.

Example

MaintenanceRequest: OPEN → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED

⸻

3. Rules Engine

Responsibility

Evaluates business rules.

Examples

* Late fee calculation
* Lease eligibility
* Refund validation
* Maintenance SLA
* Payment allocation
* Approval requirements

Rule

Business rules must not be hidden inside UI components or random service files.

⸻

4. Audit Engine

Responsibility

Records immutable history of critical actions.

Captured Data

actorId
organizationId
action
entityType
entityId
previousValue
newValue
ipAddress
device
timestamp
correlationId

Rule

Critical actions must always produce audit records.

⸻

5. Notification Engine

Responsibility

Sends system messages through multiple channels.

Channels

* In-app
* Email
* SMS
* Push Notification
* WhatsApp future
* Webhook future

Examples

* Rent due reminder
* Lease expiration alert
* Maintenance update
* Payment receipt
* Vendor assignment
* Document request

⸻

6. Automation Engine

Responsibility

Executes configured business automations.

Trigger Types

* Event-based
* Time-based
* Condition-based
* Manual
* AI-suggested

Example

WHEN lease expires in 30 days
IF tenant has good payment history
THEN notify property manager to propose renewal

⸻

7. AI Engine

Responsibility

Provides intelligent assistance and recommendations.

Capabilities

* AI Copilot
* Lease analysis
* Document summarization
* Payment risk scoring
* Maintenance prediction
* Tenant risk analysis
* Portfolio insights
* Natural language search
* Report generation

Rule

AI may recommend actions but must not perform irreversible actions without user approval.

⸻

8. Reporting Engine

Responsibility

Generates structured reports.

Report Types

* Financial reports
* Occupancy reports
* Maintenance reports
* Tenant reports
* Lease reports
* Vendor reports
* Executive reports
* Compliance reports

Output Formats

* Web dashboard
* PDF
* Excel
* CSV
* API response

⸻

9. Search Engine

Responsibility

Provides fast search across the platform.

Search Scope

* Properties
* Units
* Tenants
* Leases
* Payments
* Documents
* Vendors
* Maintenance
* Messages

Future

Support semantic search and AI-assisted natural language queries.

⸻

10. Document Engine

Responsibility

Manages document lifecycle.

Capabilities

* Upload
* Preview
* Classification
* Versioning
* Signature status
* Access control
* Retention
* OCR future
* AI summarization future

Examples

* Lease document
* Invoice
* Receipt
* Inspection report
* Vendor contract
* Insurance certificate

⸻

11. Billing Engine

Responsibility

Manages SaaS subscription billing.

Capabilities

* Plans
* Subscriptions
* Usage limits
* Trial periods
* Invoices
* Add-ons
* AI credits
* Feature access

Rule

Billing controls platform access but never deletes customer data.

⸻

12. Payment Engine

Responsibility

Processes property-related payments.

Capabilities

* Rent payment
* Deposit payment
* Late fee
* Partial payment
* Refund
* Receipt
* Payment reconciliation
* Stripe integration
* Failed payment handling

Rule

Financial records must be immutable after posting.

⸻

13. Integration Engine

Responsibility

Connects The Home Land with external systems.

Integrations

* Stripe
* QuickBooks
* DocuSign
* Google Workspace
* Microsoft 365
* Twilio
* SendGrid
* Maps
* OpenAI
* Webhooks
* External accounting systems

Rule

External integrations must be isolated behind stable internal contracts.

⸻

14. Analytics Engine

Responsibility

Computes metrics, KPIs, trends, and scores.

Examples

* Occupancy rate
* Collection rate
* Property Health Score
* Financial Health Score
* Tenant risk score
* Vendor performance score
* Maintenance SLA performance

Mathematical Rule

All KPIs must have deterministic formulas.

Example:

Occupancy Rate = Occupied Units / Total Rentable Units × 100

⸻

15. Scheduling Engine

Responsibility

Runs time-based operations.

Examples

* Rent invoice generation
* Lease expiration checks
* Reminder notifications
* Subscription renewals
* Scheduled reports
* Preventive maintenance
* Data retention jobs

⸻

16. File Storage Engine

Responsibility

Stores and secures files.

File Types

* Images
* PDFs
* Videos
* Receipts
* Contracts
* Reports
* Inspection photos

Rule

Files inherit organization-level security and resource-level permissions.

⸻

17. Activity Stream Engine

Responsibility

Creates user-facing activity timelines.

Examples

* Tenant uploaded document
* Payment received
* Lease renewed
* Work order assigned
* Vendor completed task
* Property updated

⸻

18. Onboarding Engine

Responsibility

Guides new Organizations from registration to operational readiness.

Steps

* Create organization
* Create owner account
* Configure branding
* Configure payment
* Configure bank info
* Configure settings
* Import properties
* Import units
* Invite users
* Invite tenants
* Activate workspace

⸻

19. Settings Engine

Responsibility

Stores configurable organization preferences.

Examples

* App name
* Logo
* Currency
* Language
* Tax rules
* Payment rules
* Maintenance SLA
* Notifications
* Lease templates
* Invoice templates
* AI preferences

⸻

20. Feature Flag Engine

Responsibility

Controls feature availability.

Used For

* Subscription plans
* Beta features
* Enterprise features
* AI modules
* Regional features
* Gradual rollout

⸻

21. Localization Engine

Responsibility

Supports multilingual and regional behavior.

Required Languages

* English
* French

Future

* Spanish
* Portuguese

Localization includes:

* UI labels
* Email templates
* Date formats
* Currency formats
* Number formats
* Legal wording templates

⸻

Engine Interaction Example

Maintenance Request Flow

Tenant submits request
        ↓
Authorization Engine validates access
        ↓
Rules Engine validates request
        ↓
Workflow Engine creates OPEN state
        ↓
Notification Engine alerts manager
        ↓
Automation Engine may assign vendor
        ↓
Audit Engine records action
        ↓
Activity Stream Engine updates timeline
        ↓
AI Engine may estimate urgency

⸻

Engine Design Rules

1. Engines are reusable.
2. Engines are independent from UI.
3. Engines expose stable internal APIs.
4. Engines emit domain events.
5. Engines are observable.
6. Engines are testable.
7. Engines are versioned when contracts change.
8. Engines must enforce organization isolation.
9. Engines must generate audit events when required.
10. Engines must not duplicate responsibility.

⸻

Required Engine Events

AuthorizationEvaluated
WorkflowTransitioned
RuleEvaluated
AuditRecorded
NotificationQueued
NotificationDelivered
AutomationTriggered
AIInsightGenerated
ReportGenerated
DocumentUploaded
PaymentProcessed
IntegrationSynced
KPIComputed
ScheduledJobExecuted
FileStored
ActivityCreated
OnboardingStepCompleted
SettingUpdated
FeatureFlagChanged
LocaleChanged

⸻

Final Principle

The Home Land must not be built as disconnected modules.

It must be built as a platform of reusable engines powering all business modules with consistency, security, observability, and long-term scalability.

Prochain document recommandé : 09_STATE_MACHINES.md.