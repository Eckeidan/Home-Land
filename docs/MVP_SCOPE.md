# MVP Scope

Status: Canonical  
Release objective: Validate one complete property-operations loop

## MVP actors

- Organization Owner
- Property Manager
- Accountant with constrained financial permissions
- Tenant
- Vendor
- Platform Operator with audited support access

## Included capabilities

### Foundation

- Registration, email verification, sign-in, sign-out, password recovery.
- Organization creation and membership invitations.
- Role templates plus resource-aware authorization.
- MFA for privileged roles.
- Audit trail and activity timeline.

### Portfolio

- Properties, buildings, and units.
- Property addresses, time zones, statuses, and ownership metadata.
- CSV import with dry run, row-level errors, and repeat-safe execution.

### Leasing

- Tenant profile and invitation.
- Lease creation, activation, renewal marker, and termination.
- Occupancy derived from active lease relationships, not manually edited.
- Document attachments with access controls.

### Rent operations

- Recurring rent obligations.
- Charges, credits, payments, refunds, and allocation in an immutable ledger.
- Stripe payment intent/webhook integration.
- Idempotent webhook handling and reconciliation queue.
- Receipts and manager exception view.

### Maintenance

- Tenant request with photos.
- Triage, assignment, scheduling, progress, completion, verification, closure.
- Vendor-restricted access to assigned work.
- SLA timestamps and notifications.

### Operational experience

- Operational inbox.
- Search and command palette.
- Property timeline.
- Manager dashboard based on actionable exceptions.
- English-first UI with translation-ready message keys; French can follow once
  the core copy stabilizes.

## Deferred capabilities

- Generic workflow/rules builders.
- Predictive models trained on customer behavior.
- Executive Command Center beyond MVP operational reporting.
- Digital Twin 3D/BIM/IoT layers.
- Native mobile applications.
- Public integration marketplace.
- Multi-country rules and multi-region active-active deployment.

## Release acceptance scenarios

The MVP is releasable only when all scenarios work end-to-end:

1. An owner creates an organization, invites a manager, and configures MFA.
2. A manager imports a property and units without creating duplicates.
3. A manager creates a tenant and activates a valid lease for an available unit.
4. A tenant pays rent; the signed webhook produces exactly one ledger effect and
   a receipt.
5. A tenant reports maintenance; a vendor completes it; a manager verifies it.
6. Every action appears in the correct organization audit trail.
7. Automated tests prove that equivalent users in another organization cannot
   read, infer, mutate, search, export, or download those records.

## Scope change rule

An addition enters the MVP only when it supports an acceptance scenario, has a
named owner, includes measurable success criteria, and replaces or explicitly
budgets another item. Vision alone is not sufficient.
