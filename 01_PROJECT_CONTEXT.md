🏡 THE HOME LAND — MASTER INDEX

Project Name

The Home Land

Client

Meta Global

Target Market

United States of America

Product Type

Enterprise-grade Property Management Operating System.

Core Users

* SuperAdmin
* Landlord
* Property Manager
* Agency Admin
* Tenant
* Vendor
* Accountant
* Maintenance Staff
* Support Agent

Primary Objective

Build a futuristic SaaS platform for property management, combining:

* Property operations
* Tenant management
* Lease lifecycle
* Payments
* Maintenance
* Vendor coordination
* AI insights
* Automation
* Reporting
* Digital twins
* Predictive analytics
* Enterprise security

Documentation Books

BOOK 00 — MASTER INDEX
BOOK 01 — PROJECT CONTEXT
BOOK 02 — PRODUCT VISION
BOOK 03 — BUSINESS MODEL
BOOK 04 — REQUIREMENTS
BOOK 05 — SYSTEM ARCHITECTURE
BOOK 06 — DOMAIN MODEL
BOOK 07 — DATABASE MODEL
BOOK 08 — API ARCHITECTURE
BOOK 09 — SECURITY MODEL
BOOK 10 — DESIGN SYSTEM
BOOK 11 — MODULE SPECIFICATIONS
BOOK 12 — AI ENGINE
BOOK 13 — AUTOMATION ENGINE
BOOK 14 — DIGITAL TWIN
BOOK 15 — DEVOPS & DEPLOYMENT
BOOK 16 — TESTING & QUALITY
BOOK 17 — FUTURE LAB

Engineering Principle

The Home Land must be designed as a long-term enterprise SaaS platform, not as a simple CRUD application.

Every module must follow:

* Multi-tenant architecture
* Strong data isolation
* Role-based access control
* Auditability
* Observability
* API-first design
* Mobile-first responsiveness
* AI-ready data structure
* Scalable database modeling
* Secure payment workflows
* Future extensibility

Codex Rule

Codex must never generate code without first reading:

1. 00_MASTER_INDEX.md
2. 01_PROJECT_CONTEXT.md
3. SYSTEM_ARCHITECTURE.md
4. DOMAIN_MODEL.md
5. The module specification related to the task

No blind coding is allowed.

01_PROJECT_CONTEXT.md

🏡 The Home Land — Project Context

1. Project Identity

The Home Land is an enterprise-grade property management SaaS platform designed for the USA real estate market.

It is intended for landlords, real estate agencies, property managers, tenants, vendors, administrators, and future enterprise clients.

The platform must operate as a complete Property Management Operating System, not merely as a rent collection tool.

2. Client

Client Name: Meta Global
Target Country: United States
Primary Market: Residential and commercial property management
Future Expansion: Multi-country SaaS model

3. Product Vision

The Home Land must become a futuristic property operating platform capable of managing:

* Properties
* Units
* Tenants
* Leases
* Payments
* Maintenance
* Vendors
* Documents
* Reports
* AI insights
* Automations
* Digital property intelligence

The final vision is to create a platform that helps property owners and managers understand, operate, optimize, and predict the performance of their real estate portfolio.

4. Strategic Positioning

The Home Land should compete with platforms such as:

* AppFolio
* Buildium
* Rentec Direct
* DoorLoop
* Propertyware
* TenantCloud

But it must differentiate itself through:

* AI-first workflows
* Digital twin architecture
* Predictive maintenance
* Smart onboarding
* Advanced automation
* Executive command center
* Property health scoring
* Deep operational intelligence

5. Core Architecture Principle

The system must be designed from the beginning as:

Multi-tenant
Role-based
API-first
AI-ready
Audit-ready
Mobile-ready
Scalable
Secure
Observable
Extensible

6. Multi-Tenant Rule

Every landlord, agency, or property company belongs to an Organization.

Every business record must be scoped by:

organizationId

This applies to:

* Properties
* Units
* Tenants
* Leases
* Payments
* Maintenance requests
* Vendors
* Documents
* Reports
* Settings
* Notifications
* Audit logs

No user must access data outside their organization.

7. Primary Roles

SuperAdmin

Controls the entire SaaS platform.

Can manage:

* Organizations
* Global settings
* Billing plans
* System health
* Platform analytics
* Feature flags
* Support tools

Landlord

Owns or manages property portfolios.

Can manage:

* Properties
* Units
* Tenants
* Leases
* Payments
* Maintenance
* Reports

Admin / Property Manager

Operates daily property management tasks.

Can manage assigned properties, tenants, maintenance, documents, and reports based on permissions.

Tenant

Uses the tenant portal.

Can:

* View lease
* Pay rent
* Submit maintenance requests
* Upload documents
* Receive notifications
* Communicate with management

Vendor

Handles service requests.

Can:

* View assigned work orders
* Update work status
* Upload invoices
* Add photos
* Communicate with property managers

8. Mandatory Modules

Authentication
Onboarding Setup
Organization Settings
Dashboard
Properties
Units
Tenants
Leases
Payments
Maintenance
Vendors
Documents
Reports
Notifications
Messaging
AI Insights
Automation
Audit Logs
Billing
Security
Support

9. Onboarding Setup

The system must include a structured onboarding process.

During onboarding, an organization configures:

* Company name
* Logo
* Contact information
* Business address
* Bank information
* Stripe account
* Default currency
* Tax configuration
* Lease templates
* Payment rules
* Maintenance categories
* User invitations
* Property import
* Unit setup
* Tenant import

Onboarding must not be a secondary feature. It is the foundation of system activation.

10. Settings Module

Settings must allow each organization to configure:

* Application name
* Logo
* Branding colors
* Company details
* Bank account information
* Stripe payment configuration
* Invoice numbering
* Receipt numbering
* Tax rules
* Notification preferences
* User roles
* Permissions
* Lease templates
* Payment rules
* Maintenance SLAs
* AI preferences

11. Payment Requirement

Payments are mandatory.

The system must support:

* Stripe integration
* Rent payments
* Deposit payments
* Late fees
* Partial payments
* Payment receipts
* Payment history
* Failed payment tracking
* Refund logic
* Bank code storage
* Financial reports

12. Language Requirement

The platform should support:

English
French

The default market language is English.

French support must be prepared through internationalization.

13. Mobile Requirement

A mobile application will come later.

However, the web platform must already be designed as:

Responsive
Mobile-first
Touch-friendly
Fast
Progressive Web App ready

14. AI Vision

The Home Land must include specialized AI engines:

* AI Copilot
* AI Property Analyzer
* AI Lease Analyzer
* AI Payment Risk Analyzer
* AI Maintenance Predictor
* AI Tenant Risk Analyzer
* AI Document Assistant
* AI Report Generator
* AI Automation Builder

AI must not be decoration. It must improve decision-making.

15. Futuristic Innovation Layer

The platform must include future-ready concepts:

* Digital Twin per property
* Property Health Score
* Executive Command Center
* Predictive Maintenance
* Portfolio Intelligence
* Rent Optimization
* Occupancy Forecasting
* Smart Alerts
* AI Workflow Automation
* Natural Language Search
* Scenario Simulation

16. Development Rule

Every feature must be specified before implementation.

For every module, documentation must include:

* Purpose
* Users
* Permissions
* Data model
* API endpoints
* UI screens
* Workflows
* Business rules
* Edge cases
* Security rules
* Audit events
* Tests

17. First Development Priority

The first implementation phase must focus on:

Authentication
Organization Onboarding
Settings
Property Management
Unit Management
Tenant Management
Lease Management
Payments
Maintenance
Dashboard

AI and advanced innovation will be introduced after the core operational foundation is stable.

18. Non-Negotiable Rule

The Home Land must never be built as a simple prototype.

Every architecture decision must assume future growth:

10 organizations
100 organizations
1,000 organizations
10,000 organizations
1,000,000+ users

The foundation must not block future scale.

