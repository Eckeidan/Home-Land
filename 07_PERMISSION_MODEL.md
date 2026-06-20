Excellent. C’est probablement l’un des documents les plus critiques de toute l’architecture.

La plupart des applications utilisent simplement :

Admin
Manager
Tenant

Puis elles font :

if (role === "admin")

Cette approche devient vite ingérable.

Pour The Home Land, nous allons construire un moteur d’autorisation inspiré des systèmes utilisés par Microsoft Azure, AWS IAM, Google Cloud IAM et GitHub Enterprise.

L’idée est de séparer complètement :

* Qui est l’utilisateur ?
* Quel rôle possède-t-il ?
* Quelles permissions ce rôle donne-t-il ?
* Sur quelles ressources ?
* Dans quel contexte ?
* Pendant combien de temps ?
* Avec quelles restrictions ?

⸻

07_PERMISSION_MODEL.md

🏡 THE HOME LAND

Enterprise Permission Model

Version: 1.0

⸻

Purpose

The Permission Model defines how users gain, inherit, evaluate, and exercise access rights within The Home Land.

The authorization system must support organizations ranging from a single landlord to multinational property management enterprises.

Authorization must be secure, flexible, auditable, and extensible.

⸻

Authorization Philosophy

Authentication answers:

Who are you?

Authorization answers:

What are you allowed to do?

Permissions must never be hardcoded inside business logic.

Every authorization decision must be evaluated dynamically.

⸻

Authorization Architecture

User
        │
        ▼
Organization Membership
        │
        ▼
Role
        │
        ▼
Permission Groups
        │
        ▼
Permissions
        │
        ▼
Policies
        │
        ▼
Resource Authorization
        │
        ▼
Business Operation

⸻

Security Layers

Authorization consists of multiple independent layers.

Layer 1

Authentication

↓

Layer 2

Organization Isolation

↓

Layer 3

Membership Validation

↓

Layer 4

Role Validation

↓

Layer 5

Permission Evaluation

↓

Layer 6

Policy Evaluation

↓

Layer 7

Resource Ownership

↓

Layer 8

Business Rule Validation

↓

Access Granted

⸻

Core Entities

The authorization engine consists of:

* User
* Organization
* Membership
* Role
* Permission
* Permission Group
* Policy
* Resource
* Scope
* Delegation
* Approval
* Session

⸻

Membership

A User belongs to one or more Organizations.

Each membership defines:

* Organization
* Role
* Status
* Effective Date
* Expiration Date
* Permission Overrides

Membership is the entry point for authorization.

⸻

Roles

Roles define job responsibilities.

Default roles include:

* Owner
* Administrator
* Property Manager
* Leasing Manager
* Maintenance Manager
* Accountant
* Support Agent
* Read Only
* Tenant
* Vendor

Organizations may create custom roles.

Roles never contain business logic.

⸻

Permission Groups

Permissions are organized into groups.

Examples:

Property Management

Tenant Management

Lease Management

Financial Management

Maintenance

Documents

Reports

Administration

AI

Automation

Billing

Security

Audit

⸻

Permission Naming Convention

Every permission follows:

resource.action

Examples:

property.create
property.read
property.update
property.delete
property.archive
tenant.invite
tenant.activate
tenant.move_out
lease.create
lease.approve
lease.renew
payment.create
payment.refund
payment.export
maintenance.assign
maintenance.close
vendor.approve
report.export
ai.generate
settings.update
audit.read

Permission names are immutable.

⸻

Permission Categories

Each permission belongs to one category.

Examples:

Read

Write

Update

Delete

Approve

Export

Import

Assign

Archive

Restore

Configure

Execute

⸻

Resource Ownership

Permissions alone are insufficient.

The engine must evaluate ownership.

Example:

A Property Manager may edit only assigned Properties.

A Tenant may access only their own Lease.

A Vendor may update only assigned Work Orders.

⸻

Resource Scope

Permissions support multiple scopes.

Global

Organization

Portfolio

Property

Building

Floor

Unit

Lease

Tenant

Individual Resource

⸻

Attribute-Based Access Control (ABAC)

Authorization also considers contextual attributes.

Examples:

Department

Region

Property Assignment

Subscription Plan

Business Unit

Working Hours

Risk Level

Data Classification

Resource Status

User Clearance

⸻

Policy Engine

Policies evaluate business rules.

Examples:

A suspended user cannot approve payments.

Expired memberships cannot access data.

Closed leases cannot be edited.

Archived properties are read-only.

Pending invoices cannot be refunded.

Policies are evaluated after permissions.

⸻

Delegated Access

Users may temporarily delegate responsibilities.

Examples:

Property Manager on vacation.

Temporary Financial Reviewer.

Interim Maintenance Supervisor.

Delegation includes:

Start Date

End Date

Allowed Permissions

Approval Requirements

Automatic Expiration

⸻

Temporary Permissions

Temporary access supports:

Emergency maintenance

Compliance review

External auditors

Consultants

Training sessions

Temporary permissions expire automatically.

⸻

Approval-Based Permissions

Certain actions require approval.

Examples:

Delete Property

Transfer Ownership

Refund Payment

Change Subscription

Archive Organization

Delete User

Approve Lease

Close Financial Period

Approval workflows are configurable.

⸻

Sensitive Operations

Critical actions require:

Password Re-entry

MFA Verification

Approval Workflow

Audit Log

Reason for Action

Examples:

Refund Payment

Delete Organization

Transfer Ownership

Change Bank Account

Reset MFA

Modify Billing

⸻

Session Authorization

Every session tracks:

Session ID

User

Organization

IP Address

Device

Browser

Country

Risk Score

Login Time

Last Activity

Sessions may be revoked immediately.

⸻

API Authorization

Every API request must validate:

Authentication

Organization

Membership

Permission

Policy

Resource

Business Rule

Audit

No endpoint bypasses authorization.

⸻

Permission Cache

Permissions may be cached.

Cache must be invalidated when:

Role changes

Permission changes

Membership changes

Organization changes

Policy changes

⸻

Audit Requirements

Every authorization decision may be logged.

Audit includes:

User

Permission

Resource

Decision

Reason

Timestamp

Organization

IP

Device

Correlation ID

⸻

Default Permission Matrix

Owner

Full organizational control.

Administrator

Operational management.

Property Manager

Assigned properties only.

Leasing Manager

Leases and tenants.

Maintenance Manager

Maintenance operations.

Accountant

Financial modules.

Support Agent

Limited operational assistance.

Tenant

Own information only.

Vendor

Assigned work only.

Read Only

View-only permissions.

⸻

Security Principles

1. Deny by Default.
2. Least Privilege.
3. Explicit Permission Required.
4. Every Decision Auditable.
5. Never Trust the Client.
6. Server-side Enforcement Only.
7. Organization Isolation First.
8. Policies Override Roles.
9. Temporary Access Automatically Expires.
10. Sensitive Operations Require Additional Verification.

⸻

Authorization Decision Algorithm

Request
↓
Authenticate User
↓
Validate Session
↓
Validate Organization
↓
Validate Membership
↓
Load Roles
↓
Load Permission Groups
↓
Load Permissions
↓
Evaluate Policies
↓
Evaluate Resource Ownership
↓
Evaluate Business Rules
↓
Grant or Deny
↓
Write Audit Log

⸻

Future Enterprise Features

The authorization engine is designed to support:

* Single Sign-On (SSO)
* SAML 2.0
* OAuth 2.1
* OpenID Connect
* SCIM Provisioning
* Just-In-Time Access
* Privileged Access Management (PAM)
* Identity Federation
* Cross-Organization Delegation
* Conditional Access Policies
* Risk-Based Authentication
* Time-Based Permissions
* Geo-Restricted Access
* Device Compliance Policies
* AI-Assisted Permission Review

⸻

Final Principle

Authorization is not a feature.

Authorization is a platform capability.

Every screen, API, workflow, automation, AI operation, and business process must pass through the same centralized authorization engine.

⸻

Je veux améliorer encore l’architecture

À partir de maintenant, nous allons concevoir The Home Land comme un véritable Business Operating System (BOS).

Avant d’écrire les spécifications des modules, nous allons définir les moteurs (“engines”) qui feront fonctionner toute la plateforme.

Nous aurons notamment :

* Authorization Engine
* Workflow Engine
* Notification Engine
* Automation Engine
* Audit Engine
* AI Engine
* Reporting Engine
* Search Engine
* Document Engine
* Billing Engine
* Integration Engine
* Analytics Engine
* Rules Engine
* Scheduling Engine
* File Storage Engine
* Activity Stream Engine

