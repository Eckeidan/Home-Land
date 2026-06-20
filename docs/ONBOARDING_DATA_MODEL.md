# Onboarding Data Model

Status: Canonical

Scope: Phase 1 onboarding walking skeleton

## 1. Design goals

The onboarding data model must:

- separate global identity from organization-owned business data;
- make cross-organization relationships impossible at the database boundary;
- preserve auditable state transitions;
- support safe retries and resume behavior;
- avoid storing derived readiness as authoritative truth;
- allow future enterprise identity without redesigning the core ownership model.

## 2. Entity relationship model

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : "joins through"
    USERS ||--o{ USER_SESSIONS : "authenticates with"
    USERS ||--o{ MFA_FACTORS : "secures account with"
    USERS ||--o{ TERMS_ACCEPTANCES : "accepts"
    USERS ||--o{ ORGANIZATION_INVITATIONS : "sends"

    ORGANIZATIONS ||--o{ MEMBERSHIPS : "contains"
    ORGANIZATIONS ||--|| ONBOARDING_PROGRESS : "has"
    ORGANIZATIONS ||--o{ ORGANIZATION_INVITATIONS : "issues"
    ORGANIZATIONS ||--o{ PROPERTIES : "owns"

    PROPERTIES ||--o{ BUILDINGS : "contains"
    PROPERTIES ||--o{ UNITS : "contains directly"
    BUILDINGS ||--o{ UNITS : "contains"

    USERS {
      uuid id PK
      citext email UK
      string full_name
      enum status
      timestamptz email_verified_at
      bigint version
    }

    ORGANIZATIONS {
      uuid id PK
      string legal_name
      string display_name
      citext slug UK
      enum organization_type
      char country_code
      char primary_state_code
      string time_zone
      char currency_code
      enum status
      bigint version
    }

    MEMBERSHIPS {
      uuid id PK
      uuid organization_id FK
      uuid user_id FK
      enum role
      enum status
      uuid invited_by FK
      timestamptz accepted_at
      bigint version
    }

    ONBOARDING_PROGRESS {
      uuid id PK
      uuid organization_id FK_UK
      enum state
      timestamptz started_at
      timestamptz last_activity_at
      timestamptz activated_at
      bigint version
    }

    ORGANIZATION_INVITATIONS {
      uuid id PK
      uuid organization_id FK
      citext email
      enum proposed_role
      bytes token_hash
      timestamptz expires_at
      timestamptz accepted_at
      timestamptz revoked_at
      uuid invited_by FK
    }

    PROPERTIES {
      uuid id PK
      uuid organization_id FK
      string name
      enum property_type
      jsonb structured_address
      string time_zone
      enum status
      bigint version
    }

    BUILDINGS {
      uuid id PK
      uuid organization_id FK
      uuid property_id FK
      string name
      bigint version
    }

    UNITS {
      uuid id PK
      uuid organization_id FK
      uuid property_id FK
      uuid building_id FK
      string unit_code
      enum status
      bigint version
    }
```

## 3. Ownership classification

### Platform-global identity records

- `users`
- `user_sessions`
- `mfa_factors`
- `mfa_recovery_codes`
- `email_verification_challenges`
- `terms_versions`
- `terms_acceptances`

These records are not assigned a fabricated `organization_id`. Their access is
restricted through identity ownership and privileged platform controls.

### Organization-owned records

- `organizations`
- `memberships`
- `onboarding_progress`
- `organization_invitations`
- `properties`
- `buildings`
- `units`
- organization audit records and outbox messages

Every repository operation on an organization-owned record requires an explicit
`OrganizationContext`.

## 4. Relational constraints

### Membership uniqueness

```sql
UNIQUE (organization_id, user_id)
```

An active user cannot have two memberships in the same organization.

### Organization-scoped relationship integrity

Parent tables expose organization-scoped candidate keys:

```sql
UNIQUE (organization_id, id)
```

Children use composite foreign keys:

```sql
FOREIGN KEY (organization_id, property_id)
  REFERENCES properties (organization_id, id)

FOREIGN KEY (organization_id, building_id)
  REFERENCES buildings (organization_id, id)
```

This prevents a unit in organization `A` from referring to a property or
building in organization `B`, even if application authorization fails.

### Unit topology

A unit always belongs to a property. A building is optional for single-structure
or individually managed residential assets.

```sql
CHECK (property_id IS NOT NULL)
```

If `building_id` is present, the composite foreign keys prove that the building
and property belong to the same organization. A deferred constraint trigger or
domain transaction additionally proves that `building.property_id = unit.property_id`.

### Invitation validity

```sql
CHECK (expires_at > created_at)
CHECK (NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL))
```

Only one currently usable invitation should exist for the same normalized email,
organization, and proposed role. Enforce this with a partial unique index over
non-accepted, non-revoked invitations that have not been superseded.

### Activation

`onboarding_progress.activated_at` is non-null if and only if state is `ACTIVE`.

```sql
CHECK (
  (state = 'ACTIVE' AND activated_at IS NOT NULL)
  OR
  (state <> 'ACTIVE' AND activated_at IS NULL)
)
```

The database cannot independently prove the complete cross-table readiness
predicate. The activation application service locks the progress record,
re-evaluates authoritative data, and commits state plus outbox event in one
transaction.

## 5. Core tables

All timestamps are `timestamptz` in UTC. IDs are UUIDv7 when supported by the
selected PostgreSQL/runtime stack; otherwise use a well-supported random UUID
and document the indexing trade-off before schema freeze.

### users

| Column | Type | Null | Rule |
|---|---|---:|---|
| id | uuid | no | primary key |
| email | citext | no | globally unique normalized email |
| full_name | varchar(160) | no | trimmed, user-editable |
| status | user_status | no | `PENDING_VERIFICATION`, `ACTIVE`, `LOCKED`, `DISABLED` |
| email_verified_at | timestamptz | yes | set once after valid challenge |
| created_at | timestamptz | no | server-generated |
| updated_at | timestamptz | no | server-generated |
| version | bigint | no | optimistic concurrency, starts at 1 |

Credentials are isolated in authentication-owned tables. Password hashes never
appear in domain events, read models, or general user DTOs.

### organizations

| Column | Type | Null | Rule |
|---|---|---:|---|
| id | uuid | no | primary key |
| legal_name | varchar(200) | no | required business identity |
| display_name | varchar(120) | no | UI identity |
| slug | citext | no | globally unique, reserved-word filtered |
| organization_type | organization_type | no | approved enum |
| country_code | char(2) | no | `US` in MVP |
| primary_state_code | char(2) | no | validated US subdivision |
| time_zone | varchar(64) | no | valid IANA zone |
| currency_code | char(3) | no | `USD` in MVP |
| status | organization_status | no | `ONBOARDING`, `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| created_by | uuid | no | references creating user |
| created_at/updated_at | timestamptz | no | audit timestamps |
| version | bigint | no | optimistic concurrency |

### onboarding_progress

One row exists per onboarding organization.

| Column | Type | Null | Rule |
|---|---|---:|---|
| id | uuid | no | primary key |
| organization_id | uuid | no | unique foreign key |
| state | onboarding_state | no | explicit state machine |
| started_at | timestamptz | no | creation time |
| last_activity_at | timestamptz | no | successful workflow activity |
| activated_at | timestamptz | yes | only for `ACTIVE` |
| version | bigint | no | optimistic concurrency |

Do not persist a mutable boolean such as `is_ready`. The readiness query derives
requirements from user, membership, organization, MFA, property, unit, and terms
records.

### user_sessions

| Column | Type | Null | Rule |
|---|---|---:|---|
| id | uuid | no | primary key, public session selector |
| user_id | uuid | no | owner |
| secret_hash | bytea | no | unique credential hash |
| created_at | timestamptz | no | issuance |
| last_seen_at | timestamptz | no | bounded update cadence |
| idle_expires_at | timestamptz | no | idle timeout |
| absolute_expires_at | timestamptz | no | hard timeout |
| revoked_at | timestamptz | yes | immediate invalidation |
| rotated_from_id | uuid | yes | reuse-family investigation |
| ip_prefix_hash | bytea | yes | privacy-limited anomaly signal |
| user_agent_hash | bytea | yes | anomaly signal, not identity proof |

### mfa_factors and recovery codes

MFA factor secrets are envelope-encrypted. Recovery codes are separately salted
and hashed, single-use, and never recoverable after initial display.

### verification challenges

Verification and invitation raw tokens are returned/sent once. Persistence stores
only keyed hashes, purpose, subject, expiry, consumption, and attempt metadata.

## 6. Index strategy

Required initial indexes:

```text
users(email) UNIQUE
organizations(slug) UNIQUE
memberships(user_id, status)
memberships(organization_id, status)
memberships(organization_id, user_id) UNIQUE
onboarding_progress(organization_id) UNIQUE
organization_invitations(organization_id, email, created_at DESC)
properties(organization_id, status, created_at DESC)
properties(organization_id, normalized_address_hash)
buildings(organization_id, property_id)
units(organization_id, property_id, status)
units(organization_id, property_id, unit_code) UNIQUE
user_sessions(user_id, revoked_at, absolute_expires_at)
```

Index decisions must be verified with representative query plans before launch.
Do not add indexes solely from table columns without workload evidence.

## 7. Transaction boundaries

### Create organization

One transaction creates:

1. organization in `ONBOARDING`;
2. owner membership in `ACTIVE`;
3. onboarding progress;
4. audit record;
5. outbox events.

Failure rolls back every item.

### Create first property and unit

The UI may submit a combined command. The application transaction creates the
property, optional building, first unit, audit records, and outbox events. If the
product later supports creating the property before the unit, readiness remains
false and the incomplete property is recoverable.

### Activate workspace

The transaction:

1. locks onboarding progress for update;
2. verifies expected version/idempotency result;
3. evaluates all readiness requirements;
4. changes organization and onboarding states;
5. records audit entries;
6. stores `WorkspaceActivated` in the outbox.

## 8. Deletion and retention

- Unverified accounts and expired challenges follow a short configurable cleanup
  policy approved before launch.
- Organization data is not hard-deleted through onboarding UI.
- Invitations retain minimal audit metadata after expiry according to the
  approved retention schedule.
- Session and security-event retention balances investigation needs and data
  minimization.
- Exact US retention periods require the compliance control matrix; no period is
  treated as legally universal.

## 9. Row-level security proof of concept

Before schema freeze, implement a test migration for organization-owned tables:

```sql
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY properties_org_isolation ON properties
USING (organization_id = current_setting('app.organization_id')::uuid)
WITH CHECK (organization_id = current_setting('app.organization_id')::uuid);
```

The proof must test connection pooling, transactions, workers, migrations,
platform operations, and fail-closed behavior when context is absent. Adopt RLS
only with a reliable per-transaction context strategy; application scoping and
composite constraints remain mandatory either way.

## 10. Readiness query contract

The readiness service returns requirements, not only a score:

```json
{
  "ready": false,
  "requirements": [
    { "code": "EMAIL_VERIFIED", "complete": true },
    { "code": "ORGANIZATION_VALID", "complete": true },
    { "code": "OWNER_MFA_ENABLED", "complete": false },
    { "code": "FIRST_PROPERTY_CREATED", "complete": true },
    { "code": "FIRST_UNIT_CREATED", "complete": false },
    { "code": "TERMS_ACCEPTED", "complete": true }
  ],
  "evaluatedAt": "2026-06-20T12:00:00Z",
  "version": 4
}
```

The client may visualize completion, but only the activation command decides the
state transition.

## 11. Migration acceptance criteria

- Migrations apply to an empty database and the previous supported schema.
- Roll-forward recovery is documented for irreversible changes.
- Foreign-key tests reject cross-organization property/building/unit links.
- Concurrency tests produce one organization for one idempotent command.
- Activation tests cannot create `ACTIVE` without every readiness invariant.
- Query plans for resume, readiness, membership resolution, and property setup
  meet the pilot latency budget with representative data.
