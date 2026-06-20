Excellent. Nous arrivons maintenant au cœur de l’architecture SaaS.

Si ce document est bien conçu, il sera possible de faire évoluer The Home Land d’un simple client à des milliers d’organisations sans refonte de l’architecture.

Je vais aller plus loin que le simple concept de “Landlord”. Nous allons construire une architecture Enterprise Multi-Tenant capable de supporter :

* Un propriétaire individuel.
* Une agence immobilière.
* Une société de gestion.
* Une entreprise possédant plusieurs filiales.
* Une franchise.
* Un groupe immobilier international.

⸻

06_ORGANIZATION_MODEL.md

🏡 THE HOME LAND

Organization Model

Version: 1.0

⸻

Purpose

The Organization Model defines how The Home Land structures, isolates, secures, and manages customers within a multi-tenant SaaS architecture.

Every business object belongs to an Organization.

Organizations are completely isolated from one another.

No business operation may cross organizational boundaries unless explicitly authorized by the platform.

⸻

Organization Philosophy

The Organization is the highest business entity inside the application.

Everything belongs to an Organization.

Platform
│
├── Organization A
│      ├── Users
│      ├── Properties
│      ├── Buildings
│      ├── Units
│      ├── Tenants
│      ├── Vendors
│      ├── Payments
│      └── Documents
│
├── Organization B
│      ├── ...
│
└── Organization C

Organizations never share operational data.

⸻

Organization Types

The platform supports multiple organization categories.

Individual Landlord

Single owner managing personal properties.

⸻

Property Management Company

Professional company managing properties on behalf of owners.

⸻

Real Estate Agency

Agency managing leasing, tenants, and operations.

⸻

Investment Group

Organization managing multiple investment portfolios.

⸻

Enterprise

Large company operating across multiple regions.

⸻

Franchise

Parent organization supervising several independent branches.

⸻

Organization Structure

Each Organization may contain:

Organization
↓
Business Units
↓
Departments
↓
Teams
↓
Users

Business Units are optional.

Departments are optional.

Teams are optional.

⸻

Organization Identity

Each Organization stores:

* Organization ID (UUID)
* Legal Name
* Display Name
* Business Registration Number
* Tax Number
* Company Logo
* Brand Colors
* Time Zone
* Default Currency
* Language
* Address
* Contact Information
* Website
* Industry
* Country
* State
* City
* Postal Code

⸻

Organization Settings

Each Organization manages its own configuration.

Examples:

* Branding
* Invoice Templates
* Lease Templates
* Email Templates
* Notification Rules
* Maintenance Categories
* Tax Configuration
* Business Hours
* Working Days
* Payment Rules
* Stripe Configuration
* Bank Accounts
* AI Preferences
* Security Policies

⸻

Organization Ownership

Each Organization has:

One Primary Owner.

The Primary Owner cannot be deleted while the Organization exists.

Ownership transfer must follow an approval workflow.

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

⸻

Workspace

Every Organization owns one isolated Workspace.

The Workspace includes:

* Database records
* Uploaded files
* Documents
* Reports
* AI Context
* Settings
* Automations
* Audit Logs

⸻

Data Isolation

Every business table contains:

organizationId

Example:

Properties
id
organizationId
name
...
Tenants
organizationId
...
Payments
organizationId
...
Maintenance
organizationId
...

No query may omit organizationId filtering.

⸻

Multi-Tenant Rules

Every request is evaluated using:

Authenticated User
↓
Organization
↓
Permissions
↓
Requested Resource
↓
Authorization

⸻

Cross-Organization Access

Disabled by default.

Only SuperAdmin may access multiple Organizations.

Future enterprise features may allow delegated access through explicit trust relationships.

⸻

Organization Branding

Each Organization controls:

* Logo
* Favicon
* Login Screen
* Email Branding
* Invoice Branding
* Report Branding
* Color Palette
* Application Name
* Custom Domain (Future)
* White Label (Enterprise Plans)

⸻

Organization Subscription

Every Organization owns one subscription.

Subscription controls:

* Plan
* Billing Cycle
* Active Users
* Storage
* AI Credits
* API Limits
* Property Limits
* Unit Limits
* Vendor Limits
* Feature Availability

⸻

Feature Flags

Each Organization may enable or disable features.

Examples:

* AI Assistant
* Executive Dashboard
* Smart Automation
* Vendor Portal
* Accounting
* Asset Management
* Digital Twin
* IoT Integration
* API Access
* White Label

⸻

User Membership

A User belongs to one or more Organizations.

Each membership includes:

* Role
* Status
* Permissions
* Join Date
* Last Access
* Invitation Source

Future versions will support consultants and external auditors working across multiple Organizations with explicit authorization.

⸻

Organization Roles

Default roles:

* Owner
* Administrator
* Property Manager
* Accountant
* Maintenance Manager
* Leasing Manager
* Support Agent
* Read Only
* Tenant
* Vendor

Organizations may create custom roles.

⸻

Organization Security

Each Organization may define:

* Password Policy
* MFA Requirement
* Session Timeout
* IP Restrictions
* Allowed Countries
* Device Trust
* Login Alerts
* SSO Configuration (Enterprise)
* SCIM Provisioning (Enterprise)

⸻

Organization Onboarding

The onboarding process provisions:

* Organization
* Workspace
* Default Settings
* Subscription
* Owner Account
* Branding
* Initial Roles
* Default Permissions
* Email Templates
* Lease Templates
* Maintenance Categories
* Tax Rules
* Stripe Integration
* Bank Accounts

The Organization becomes operational only after successful onboarding.

⸻

Organization Limits

Limits may include:

* Properties
* Buildings
* Units
* Tenants
* Documents
* Storage
* Users
* Vendors
* API Calls
* AI Requests
* Automations
* Reports
* Scheduled Jobs

Limits are enforced by the subscription plan.

⸻

Organization Events

Examples:

OrganizationCreated
OrganizationProvisioned
OrganizationActivated
OrganizationUpdated
OrganizationSuspended
OrganizationArchived
OrganizationDeleted
SubscriptionChanged
BrandingUpdated
OwnerTransferred
WorkspaceProvisioned
OrganizationOnboarded

Each event may trigger:

* Notifications
* Audit Logs
* Automation
* Billing Updates
* AI Analysis
* External Webhooks

⸻

Organization KPIs

Each Organization dashboard should expose:

* Occupancy Rate
* Collection Rate
* Monthly Revenue
* Outstanding Balance
* Maintenance SLA
* Open Work Orders
* Tenant Satisfaction
* Vendor Performance
* Lease Renewal Rate
* AI Health Score
* Property Health Score
* Financial Health Score

⸻

Architectural Constraints

1. Every Organization is logically isolated.
2. Every business entity references organizationId.
3. SuperAdmin never modifies tenant business data directly.
4. Soft deletion is mandatory.
5. Every organization action is audited.
6. Organization deletion requires verification, backup, and retention policies.
7. Subscription status affects feature availability but never deletes business data.
8. White-label customization never changes the underlying domain model.
9. Organization ownership is immutable until an approved transfer process completes.
10. No business operation may bypass organization-level authorization.

⸻

Future Enterprise Capabilities

The architecture is designed to support:

* Multi-region organizations
* Multi-country operations
* Holding companies
* Parent-child organizations
* Franchise management
* Cross-region reporting
* Centralized compliance
* Enterprise SSO
* Identity federation
* Marketplace integrations
* Data residency policies
* Customer-managed encryption keys

⸻

Final Principle

The Organization Model is the foundation of security, permissions, billing, subscriptions, data isolation, reporting, automation, and scalability.

Every future feature must respect the Organization boundary as the highest level of business ownership within The Home Land.

⸻

Une amélioration importante

À partir du prochain document, nous allons introduire un concept que très peu de Property Management Systems possèdent : un moteur de permissions indépendant.

Au lieu de coder les autorisations directement dans les rôles, nous construirons un système complet :

* Roles (Owner, Manager, Accountant…)
* Permissions (property.create, lease.approve, payment.refund, etc.)
* Permission Groups
* Policies
* Resource Ownership
* Context-Aware Authorization
* Delegation
* Temporary Access
* Approval-Based Permissions
* Attribute-Based Access Control (ABAC) en complément du RBAC.


