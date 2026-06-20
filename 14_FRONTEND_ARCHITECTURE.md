On avance avec 14_FRONTEND_ARCHITECTURE.md.

14_FRONTEND_ARCHITECTURE.md

🏡 THE HOME LAND

Frontend Architecture

Version: 1.0

⸻

Purpose

This document defines the frontend architecture for The Home Land.

The frontend must provide a futuristic, responsive, secure, fast, and enterprise-grade user experience for all platform roles.

⸻

Frontend Stack

Framework: Next.js
Language: TypeScript
UI: React
Styling: TailwindCSS
Components: shadcn/ui
Icons: Lucide React
Forms: React Hook Form
Validation: Zod
Data Fetching: TanStack Query
Charts: Recharts
Tables: TanStack Table
State: Zustand
Authentication: JWT + Refresh Token Flow
Internationalization: next-intl

⸻

Frontend Principles

1. UI never owns business logic.
2. Authorization is displayed in UI but enforced by backend.
3. Every page must be responsive.
4. Every form must validate client-side and server-side.
5. Every data request must include authentication context.
6. Every component must be reusable when possible.
7. Every screen must support loading, empty, error, and success states.
8. Accessibility is mandatory.
9. Dark mode is mandatory.
10. Performance is a product feature.

⸻

Application Structure

src/
│
├── app/
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   ├── properties/
│   ├── units/
│   ├── tenants/
│   ├── leases/
│   ├── payments/
│   ├── maintenance/
│   ├── vendors/
│   ├── documents/
│   ├── reports/
│   ├── ai/
│   ├── settings/
│   └── admin/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── modals/
│   ├── onboarding/
│   └── domain/
│
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── property/
│   ├── tenant/
│   ├── lease/
│   ├── payment/
│   ├── maintenance/
│   └── ai/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── permissions/
│   ├── validators/
│   ├── formatters/
│   └── utils/
│
├── hooks/
├── stores/
├── types/
└── styles/

⸻

Routing Model

The application contains separate route groups.

/public
/auth
/onboarding
/app
/tenant
/vendor
/superadmin

Public Routes

* Landing page
* Pricing
* Login
* Register
* Forgot password

Onboarding Routes

* Organization setup
* Branding setup
* Financial setup
* Stripe setup
* Property import
* User invitations
* Go Live checklist

App Routes

* Dashboard
* Properties
* Units
* Tenants
* Leases
* Payments
* Maintenance
* Reports
* Settings

⸻

Layout Architecture

The authenticated app uses a persistent shell.

AppShell
│
├── Sidebar
├── Topbar
├── Command Palette
├── Notification Center
├── Main Content
└── AI Copilot Panel

The shell remains mounted while pages change.

⸻

Onboarding Frontend Requirement

Onboarding must be treated as a first-class product experience.

Required UI elements:

* Stepper
* Progress indicator
* Readiness score
* Smart checklist
* Save and resume
* AI-guided setup
* Import wizard
* Preview screens
* Go Live button

The user must never be sent to the main dashboard until minimum onboarding requirements are complete.

⸻

State Management

Use server state and client state separately.

Server State

Handled by TanStack Query.

Examples:

* Properties
* Tenants
* Leases
* Payments
* Maintenance
* Reports

Client State

Handled by Zustand.

Examples:

* Sidebar state
* Theme
* Command palette
* Onboarding draft
* Modal state
* AI panel state

⸻

API Client

All API calls must pass through a centralized API client.

Responsibilities:

* Attach access token
* Refresh expired token
* Add correlation ID
* Normalize errors
* Handle pagination
* Handle retries
* Enforce base URL

No component may call fetch directly.

⸻

Permissions in UI

The frontend may hide or disable UI actions based on permissions.

However:

Frontend permission checks are UX helpers only.
Backend authorization is the source of truth.

⸻

Form Architecture

Every form must include:

* Schema validation
* Default values
* Dirty state detection
* Loading state
* Error state
* Success feedback
* Server validation mapping
* Accessibility labels

Recommended stack:

React Hook Form + Zod

⸻

Table Architecture

Data tables must support:

* Pagination
* Sorting
* Filtering
* Search
* Column visibility
* Export
* Row actions
* Bulk actions
* Empty state
* Skeleton loading

⸻

Dashboard Architecture

Dashboards are composed of widgets.

Widget types:

* KPI Card
* Chart
* Table
* Timeline
* Map
* Risk Card
* AI Insight Card
* Task List
* Alert Card

Widgets should be configurable by role and organization.

⸻

AI Copilot UI

The AI Copilot should be accessible from:

* Global panel
* Module pages
* Documents
* Reports
* Maintenance
* Lease screens

AI must show:

* Explanation
* Confidence level
* Source data
* Suggested action
* Approval requirement

⸻

Design Requirements

The interface should feel:

* Futuristic
* Clean
* Premium
* Fast
* Professional
* Trustworthy
* Enterprise-ready

Design direction:

* Dark mode first
* Soft glass surfaces
* High-contrast text
* Command-center dashboards
* Micro-interactions
* Smooth transitions
* Spatial hierarchy
* Data-rich cards

⸻

Responsive Rules

Breakpoints:

Mobile: 375px–767px
Tablet: 768px–1023px
Desktop: 1024px+
Large: 1440px+

Mobile requirements:

* Collapsible sidebar
* Bottom navigation where appropriate
* Touch-friendly buttons
* Responsive tables
* Card-based lists
* Simplified dashboards

⸻

Accessibility Requirements

Must support:

* Keyboard navigation
* Focus states
* Screen reader labels
* Color contrast
* Semantic HTML
* ARIA only where needed
* Reduced motion option

⸻

Performance Requirements

Targets:

First Contentful Paint < 1.8s
Largest Contentful Paint < 2.5s
Interaction to Next Paint < 200ms
Cumulative Layout Shift < 0.1

Frontend must use:

* Code splitting
* Lazy loading
* Optimized images
* Memoization where useful
* Server components where appropriate
* Cached queries

⸻

Error Handling

Every page must handle:

* 401 Unauthorized
* 403 Forbidden
* 404 Not Found
* 422 Validation Failed
* 500 Server Error
* Network Failure
* Empty Data

⸻

Internationalization

Default language:

English

Supported:

French

All visible text must be translation-ready.

No hardcoded UI copy inside deep components.

⸻

Testing

Required frontend tests:

* Component tests
* Form validation tests
* Permission rendering tests
* Route protection tests
* Accessibility tests
* E2E tests for critical flows

Critical flows:

* Registration
* Login
* Onboarding
* Property creation
* Tenant invitation
* Lease creation
* Payment
* Maintenance request

⸻

Non-Negotiable Rules

1. No business logic inside UI components.
2. No direct API calls from components.
3. No hardcoded permissions.
4. No unhandled loading state.
5. No unhandled empty state.
6. No inaccessible form.
7. No desktop-only screen.
8. No hardcoded text that blocks localization.
9. No financial action without confirmation.
10. No dashboard before onboarding completion.

⸻

Final Principle

The frontend is not decoration.

It is the operational cockpit of The Home Land.

Every screen must help users understand, decide, and act faster with clarity, security, and confidence.

Prochain : 15_BACKEND_ARCHITECTURE.md.