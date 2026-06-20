# ADR-0002 — Secure Browser Sessions

Status: Accepted

Date: 2026-06-20

## Context

Earlier research documents propose JWT access and refresh tokens but do not
define safe browser storage, rotation, CSRF handling, revocation, or reuse
detection. The MVP is a first-party web application handling sensitive tenant,
lease, document, and financial data.

## Decision

Use server-controlled browser sessions represented by opaque, high-entropy
credentials in `HttpOnly`, `Secure`, `SameSite` cookies.

- Store only a hash of the session credential server-side.
- Rotate credentials after authentication, privilege changes, recovery, and at a
  bounded interval.
- Enforce absolute and idle expiry.
- Revoke sessions individually and by user/security event.
- Require CSRF protection for state-changing cookie-authenticated requests.
- Require recent authentication for MFA reset, sensitive organization settings,
  and other high-risk actions.
- Do not store bearer or refresh tokens in `localStorage` or expose them to
  application JavaScript.

Service-to-service and future public API authentication are separate decisions.

## Consequences

- Immediate revocation and device/session management are straightforward.
- The API requires a highly available session store or a PostgreSQL-backed
  implementation with appropriate caching and fail-safe behavior.
- Cross-origin deployment requires deliberate cookie, CORS, and CSRF design.
- Native mobile authentication will require a future ADR.

## Rejected alternatives

- Long-lived JWT in `localStorage`: vulnerable to token theft through XSS and
  difficult to revoke reliably.
- Stateless JWT-only browser sessions: revocation and privilege-change semantics
  are unnecessarily complex for the MVP.
- Raw session identifiers stored server-side: a database disclosure would expose
  active credentials.

## Review triggers

- Public third-party API launch.
- Native mobile application launch.
- Multi-region session consistency requirements.
- Identity-provider federation or enterprise SSO.
