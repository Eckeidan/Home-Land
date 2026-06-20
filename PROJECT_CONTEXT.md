New projet


Voici le fichier 1 prêt pour Codex.
Copie-colle dans :
PROJECT_CONTEXT.md
# PROJECT_CONTEXT.md

# Project: The Home Land

## 1. Project Identity

Project Name: The Home Land  
Client: Meta Global  
Target Market: United States of America  
Product Type: Property Management SaaS Platform  
Primary Users: Landlords, Property Management Agencies, Admin Staff, Tenants, Vendors  
Languages: English and French  
Payment Provider: Stripe  
Future Expansion: Mobile application  

---

## 2. Vision

The Home Land is an enterprise-grade property management SaaS platform designed for the USA market.

The platform must allow landlords, property managers, agencies, tenants, and vendors to manage the full property lifecycle from one secure system.

The system must support:

- Multi-tenant organizations
- Property and unit management
- Tenant management
- Lease management
- Rent payments through Stripe
- Maintenance requests
- Vendor assignment
- Secure document storage
- Notifications
- Reports
- AI-powered insights
- Audit logs
- English/French language switching without page refresh

The platform must be designed as a long-term SaaS product, not a simple CRUD application.

---

## 3. Core Business Goal

The Home Land must help property owners and agencies manage:

- Properties
- Units
- Tenants
- Leases
- Rent payments
- Maintenance operations
- Vendors
- Documents
- Financial visibility
- Operational performance

The system must improve speed, accuracy, transparency, and accountability.

---

## 4. Target Users

## 4.1 SuperAdmin

The SuperAdmin controls the entire SaaS platform.

Responsibilities:

- Manage all organizations
- Manage platform plans
- Manage global users
- View global analytics
- Monitor security
- Access audit logs
- Manage system configuration
- Disable or suspend organizations

SuperAdmin has global access.

---

## 4.2 Landlord

The Landlord owns or manages properties.

Responsibilities:

- Manage properties
- Manage units
- Manage tenants
- Manage leases
- Track rent payments
- View dashboards
- Manage maintenance
- Invite admins
- Invite vendors
- View reports

Landlord access must be limited to their own organization.

---

## 4.3 Admin

Admin is a staff member working under a Landlord or agency.

Responsibilities:

- Assist with property operations
- Manage tenants if permitted
- Manage maintenance if permitted
- Upload documents if permitted
- View reports if permitted

Admin permissions must be configurable.

---

## 4.4 Tenant

Tenant uses the portal to interact with the landlord.

Responsibilities:

- View lease information
- Pay rent
- Download receipts
- Submit maintenance requests
- Upload maintenance photos
- View documents
- Receive notifications
- Update profile information

Tenant access must be limited to their own lease/unit.

---

## 4.5 Vendor

Vendor is a service provider.

Examples:

- Plumber
- Electrician
- Cleaner
- Contractor
- HVAC technician
- Security provider

Responsibilities:

- Receive assigned maintenance jobs
- Update job status
- Upload completion notes
- Upload photos
- Submit cost information

Vendor access must be limited to assigned work orders only.

---

## 5. Core Roles

The system must support these roles:

```txt
SUPER_ADMIN
LANDLORD
ADMIN
TENANT
VENDOR
Access control must be role-based and permission-based.

⸻

6. Multi-Tenant Rule
The Home Land is a SaaS platform.
Each landlord or agency belongs to an Organization.
All business data must belong to one organization.
Examples:
* Property belongs to organizationId
* Unit belongs to organizationId
* Tenant belongs to organizationId
* Lease belongs to organizationId
* Payment belongs to organizationId
* Maintenance request belongs to organizationId
* Document belongs to organizationId
* Vendor belongs to organizationId
Mandatory rule:
resource.organizationId === user.organizationId
Except for SuperAdmin.
SuperAdmin may access global platform data.

⸻

7. Mathematical Access Rule
The system access model is:
Access(user, resource) = true
IF user.role === SUPER_ADMIN

OR

Access(user, resource) = true
IF user.organizationId === resource.organizationId
AND user has required permission
No API route must return data from another organization.
This is a critical security requirement.

⸻

8. Required Modules
The platform must include:
1. Authentication & Security
2. Organizations
3. Users & Permissions
4. Properties
5. Units
6. Tenants
7. Leases
8. Payments
9. Stripe Integration
10. Maintenance Requests
11. Vendors
12. Documents
13. Notifications
14. Dashboard & KPIs
15. Reports
16. AI Insights
17. Settings
18. Subscription Billing
19. Audit Logs
20. Language Switcher

⸻

9. Authentication Requirements
The system must support:
* Login
* Register
* Forgot password
* Reset password
* JWT authentication
* Password hashing with bcrypt
* MFA/2FA support
* Secure sessions
* Role-based access
* Permission-based access
Passwords must never be stored in plain text.

⸻

10. Language Requirement
The system must support English and French.
Language switch must happen without page refresh.
Recommended library:
i18next + react-i18next
All UI labels must be translatable.
Examples:
Dashboard
Properties
Units
Tenants
Leases
Payments
Maintenance
Documents
Reports
Settings
Must support:
EN ⇄ FR

⸻

11. Payment Requirement
The system must use Stripe.
Stripe must support:
* Rent payment
* Invoice payment
* Payment receipt
* Failed payment tracking
* Refund tracking
* Late fee handling
* Subscription billing for organizations
* Stripe webhook handling
Every Stripe event must be verified securely through webhook signatures.

⸻

12. Future Mobile App
The system must be designed so a mobile app can be added later.
Therefore:
* Backend API must be clean
* Business logic must not be trapped inside frontend only
* Authentication must support web and mobile clients
* API responses must be consistent
* File uploads must work from mobile in the future

⸻

13. UI/UX Direction
The Home Land must look premium, modern, and professional.
Design style:
* Clean SaaS dashboard
* Modern real-estate feel
* Responsive layout
* Desktop-first but mobile-ready
* shadcn/ui components
* TailwindCSS
* Dark/light mode ready
* Professional charts
* Clean tables
* Strong empty states
* Smooth modals
* Clear forms
* Minimal visual noise
The system must feel better than the old PropertyOS prototype.

⸻

14. Dashboard Requirements
Dashboard must show KPIs such as:
* Total properties
* Total units
* Occupied units
* Vacant units
* Occupancy rate
* Monthly rent expected
* Monthly rent collected
* Outstanding balance
* Late payments
* Open maintenance requests
* Vendor jobs
* Lease expirations
* Recent activity
Formula example:
Occupancy Rate = Occupied Units / Total Units × 100

⸻

15. AI Insights
AI Insights must help users understand risks and opportunities.
Examples:
* Tenants with late payment risk
* Properties with high maintenance cost
* Units with low profitability
* Upcoming lease expiry warnings
* Rent optimization suggestions
* Maintenance cost anomalies
* Revenue trend summaries
AI must not make final legal or financial decisions.
AI must provide advisory insights only.

⸻

16. Reports
Reports must include:
* Rent collection report
* Outstanding balance report
* Occupancy report
* Maintenance report
* Vendor performance report
* Lease expiration report
* Property performance report
* Financial summary report
Export formats:
PDF
Excel
CSV

⸻

17. Document Management
The system must store documents securely.
Document examples:
* Lease agreements
* Tenant ID documents
* Payment receipts
* Inspection reports
* Maintenance photos
* Vendor invoices
* Property photos
Documents must be linked to the correct entity.
Examples:
document.propertyId
document.unitId
document.tenantId
document.leaseId
document.maintenanceRequestId

⸻

18. Maintenance Workflow
Maintenance process:
Tenant creates request
→ Landlord/Admin reviews
→ Vendor assigned
→ Vendor updates status
→ Work completed
→ Cost recorded
→ Tenant notified
→ Request closed
Maintenance statuses:
OPEN
IN_REVIEW
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
Maintenance priorities:
LOW
MEDIUM
HIGH
URGENT

⸻

19. Lease Workflow
Lease process:
Create tenant
→ Assign tenant to unit
→ Create lease
→ Upload lease document
→ Set rent amount
→ Set deposit
→ Set lease dates
→ Activate lease
→ Generate payment schedule
Lease statuses:
DRAFT
ACTIVE
EXPIRED
TERMINATED
RENEWED

⸻

20. Payment Workflow
Payment process:
Invoice generated
→ Tenant pays with Stripe
→ Stripe confirms payment
→ Webhook updates payment status
→ Receipt generated
→ Tenant and landlord notified
Payment statuses:
PENDING
PAID
FAILED
REFUNDED
PARTIAL
OVERDUE

⸻

21. Security Requirements
The system must enforce:
* Organization data isolation
* JWT authentication
* Password hashing
* Role-based access control
* Permission checks
* Input validation
* File upload validation
* Stripe webhook verification
* Audit logging
* Rate limiting
* Secure error handling
* No sensitive data in frontend logs
* No cross-organization data leaks

⸻

22. Audit Logs
Every important action must be logged.
Examples:
* User login
* Failed login
* Created property
* Updated tenant
* Deleted document
* Created payment
* Stripe payment confirmed
* Maintenance assigned
* Vendor updated job
* Lease terminated
Audit log fields:
id
organizationId
userId
action
entityType
entityId
metadata
ipAddress
userAgent
createdAt

⸻

23. Recommended Technical Stack
Frontend:
Next.js
TypeScript
TailwindCSS
shadcn/ui
React Query
i18next
Lucide Icons
Backend:
Node.js
NestJS or Express
Prisma ORM
PostgreSQL
JWT
bcrypt
Stripe SDK
Multer or S3 upload
Storage:
AWS S3 or Cloudflare R2
Email:
Resend or SendGrid
AI:
OpenAI API

⸻

24. Development Principles
Codex must follow these principles:
* Build enterprise-grade code
* Avoid shortcuts
* Avoid hardcoded demo logic
* Keep code modular
* Keep APIs clean
* Validate all inputs
* Protect every route
* Use consistent naming
* Use scalable folder structure
* Use reusable UI components
* Use clean database relations
* Support future mobile app
* Support future subscription plans
* Support future multi-region deployment

⸻

25. Non-Negotiable Rules
1. Every business table must include organizationId unless it is a global platform table.
2. SuperAdmin is the only global role.
3. Landlord, Admin, Tenant, and Vendor must never access another organization’s data.
4. Stripe webhooks must be verified.
5. Passwords must be hashed.
6. File uploads must be validated.
7. UI must be responsive.
8. Language switch must not refresh the page.
9. All modules must support audit logging.
10. The project must be built as production SaaS architecture.

⸻

26. Build Strategy
Build in phases.
Phase 1:
Authentication
Roles
Organizations
Main dashboard layout
Language switcher
Phase 2:
Properties
Units
Tenants
Leases
Phase 3:
Payments
Stripe
Invoices
Receipts
Late fees
Phase 4:
Maintenance
Vendors
Documents
Notifications
Phase 5:
Reports
AI Insights
Audit logs
Settings
Subscription billing

⸻

27. Final System Principle
The Home Land must be treated as a SaaS operating system for property management.
It must not be built as separate disconnected pages.
Every module must connect through:
Organization
User
Property
Unit
Tenant
Lease
Payment
Maintenance
Document
AuditLog
Core equation:
System = Data + Rules + Permissions + Workflows + UI + API + Security
The system is only correct if every user sees exactly what they are allowed to see.

