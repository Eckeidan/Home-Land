-- Add discovery metadata without breaking any development organizations created before this slice.
CREATE TYPE "ApproximateUnitRange" AS ENUM (
  'ONE_TO_NINE',
  'TEN_TO_NINETY_NINE',
  'ONE_HUNDRED_TO_FIVE_HUNDRED',
  'FIVE_HUNDRED_TO_FIVE_THOUSAND',
  'OVER_FIVE_THOUSAND'
);

ALTER TABLE "organizations"
  ADD COLUMN "approximate_unit_range" "ApproximateUnitRange";

UPDATE "organizations"
SET "approximate_unit_range" = 'TEN_TO_NINETY_NINE'
WHERE "approximate_unit_range" IS NULL;

ALTER TABLE "organizations"
  ALTER COLUMN "approximate_unit_range" SET NOT NULL,
  ALTER COLUMN "slug" DROP NOT NULL,
  ALTER COLUMN "time_zone" DROP NOT NULL;

-- Legacy sessions remain readable only for sign-out/cleanup. Authentication rejects sessions
-- without a bound CSRF hash; all newly verified sessions receive one.
ALTER TABLE "user_sessions"
  ADD COLUMN "csrf_token_hash" BYTEA;

CREATE UNIQUE INDEX "user_sessions_csrf_token_hash_key"
  ON "user_sessions"("csrf_token_hash");

CREATE TABLE "idempotency_records" (
  "id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "scope" VARCHAR(120) NOT NULL,
  "key_hash" BYTEA NOT NULL,
  "request_hash" BYTEA NOT NULL,
  "response" JSONB NOT NULL,
  "status_code" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idempotency_records_expires_at_idx"
  ON "idempotency_records"("expires_at");

CREATE UNIQUE INDEX "idempotency_records_actor_user_id_scope_key_hash_key"
  ON "idempotency_records"("actor_user_id", "scope", "key_hash");

ALTER TABLE "idempotency_records"
  ADD CONSTRAINT "idempotency_records_actor_user_id_fkey"
  FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
