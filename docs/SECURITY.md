# Security Baseline

Status: Canonical  
Security posture: Zero trust between boundaries, least privilege by default

## Protected assets

- Tenant identities and contact data.
- Lease and property documents.
- Payment and bank-related metadata.
- Organization financial records.
- Credentials, sessions, API keys, and integration tokens.
- Audit history and authorization policy.

## Primary threats

| Threat | Impact | Required controls |
|---|---|---|
| Cross-tenant data access | Critical | scoped repositories, DB constraints/RLS, isolation tests |
| Account takeover | Critical | secure sessions, MFA, rate limits, anomaly signals |
| Stripe webhook spoof/replay | High | signatures, timestamp tolerance, idempotency, reconciliation |
| Insecure document access | High | private storage, short signed URLs, authorization on download |
| Privileged support abuse | High | just-in-time access, reason, audit, alerting |
| Sensitive log/prompt leakage | High | classification, redaction, provider controls, tests |
| Queue/event duplication | High | idempotent consumers, deduplication, immutable audit |
| Dependency/supply-chain compromise | High | lockfiles, review, scanning, signed CI provenance where feasible |

Risk scoring uses `risk = likelihood × impact`, but numerical scores require a
defined scale and evidence. Do not invent precision.

## Authentication and sessions

- Server-managed browser sessions or short-lived access credentials delivered in
  secure `HttpOnly`, `Secure`, `SameSite` cookies.
- Rotate refresh/session credentials and revoke the family on reuse detection.
- CSRF protection for state-changing cookie-authenticated requests.
- MFA for owners, platform operators, and privileged financial roles.
- Rate limits and progressive defenses for login, recovery, invitations, and MFA.
- Recovery actions invalidate relevant sessions and generate security events.

## Authorization

Authorization combines membership, role permissions, contextual attributes,
resource ownership, and business state. Deny by default.

Platform support access is not global invisible access. It must be time-bound,
purpose-bound, visible in audit, and optionally customer-approved for sensitive
operations.

## Data protection

- TLS in transit and provider-managed encryption at rest.
- Envelope encryption for selected highly restricted fields when threat modeling
  justifies application-level encryption.
- Managed KMS and secret manager in production.
- Private object storage with malware scanning and content-type validation.
- Data minimization: do not collect identity documents or screening data until a
  validated workflow and retention rule requires them.
- Backups follow the same access and encryption requirements as primary data.

## AI safety boundary

- Do not send restricted data to an AI provider by default.
- Prompts and outputs are treated as untrusted data.
- Recommendations cite source records and expose uncertainty.
- Human approval is mandatory for consequential actions.
- Tenant screening, protected-class inference, eligibility, rent discrimination,
  eviction, and legal advice are outside the MVP AI scope.

## Compliance preparation

Before US production launch, qualified specialists must validate the applicable
requirements for privacy, accessibility, Fair Housing, consumer reporting or
screening, electronic signatures, payment processing, state landlord-tenant
rules, accounting/trust funds, tax records, and retention.

The engineering team must maintain a jurisdiction-to-control matrix. This file
is a security baseline, not legal advice or a compliance certification.

## Production security gates

- Threat model reviewed for every MVP bounded context.
- Automated authorization and cross-tenant test suite passes.
- External penetration test or equivalent independent review completed.
- Critical/high findings resolved or formally risk-accepted by an accountable
  owner with an expiry date.
- Incident response, breach communication, access review, backup restore, and
  secret rotation runbooks exercised.
- Dependency, container, secret, and infrastructure scans run in CI/CD.
