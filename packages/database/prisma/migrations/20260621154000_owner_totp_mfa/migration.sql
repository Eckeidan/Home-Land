CREATE TYPE "MfaFactorStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TABLE "user_sessions"
  ADD COLUMN "primary_authenticated_at" TIMESTAMPTZ(6);

UPDATE "user_sessions"
SET "primary_authenticated_at" = "created_at"
WHERE "primary_authenticated_at" IS NULL;

ALTER TABLE "user_sessions"
  ALTER COLUMN "primary_authenticated_at" SET NOT NULL,
  ALTER COLUMN "primary_authenticated_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "mfa_enrollments" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "secret_ciphertext" BYTEA NOT NULL,
  "secret_iv" BYTEA NOT NULL,
  "secret_auth_tag" BYTEA NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "mfa_enrollments_attempts_check" CHECK ("attempts" BETWEEN 0 AND 5)
);

CREATE TABLE "mfa_factors" (
  "id" UUID NOT NULL,
  "enrollment_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" "MfaFactorStatus" NOT NULL DEFAULT 'ACTIVE',
  "secret_ciphertext" BYTEA NOT NULL,
  "secret_iv" BYTEA NOT NULL,
  "secret_auth_tag" BYTEA NOT NULL,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recovery_acknowledged_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mfa_recovery_codes" (
  "id" UUID NOT NULL,
  "factor_id" UUID NOT NULL,
  "code_hash" VARCHAR(255) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mfa_enrollments_user_id_organization_id_expires_at_idx"
  ON "mfa_enrollments"("user_id", "organization_id", "expires_at" DESC);
CREATE UNIQUE INDEX "mfa_factors_enrollment_id_key" ON "mfa_factors"("enrollment_id");
CREATE INDEX "mfa_factors_user_id_status_idx" ON "mfa_factors"("user_id", "status");
CREATE UNIQUE INDEX "mfa_factors_one_active_per_user"
  ON "mfa_factors"("user_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "mfa_recovery_codes_factor_id_consumed_at_idx"
  ON "mfa_recovery_codes"("factor_id", "consumed_at");

ALTER TABLE "mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_enrollments" ADD CONSTRAINT "mfa_enrollments_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_enrollment_id_fkey"
  FOREIGN KEY ("enrollment_id") REFERENCES "mfa_enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_factor_id_fkey"
  FOREIGN KEY ("factor_id") REFERENCES "mfa_factors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
