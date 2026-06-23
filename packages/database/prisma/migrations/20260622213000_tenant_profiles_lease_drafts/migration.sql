CREATE TYPE "TenantStatus" AS ENUM ('PROSPECT', 'INVITED', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'READY_FOR_ACTIVATION', 'ACTIVE', 'TERMINATED', 'CANCELLED');

CREATE TABLE "tenant_profiles" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "user_id" UUID,
  "first_name" VARCHAR(80) NOT NULL,
  "last_name" VARCHAR(80) NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "phone" VARCHAR(32),
  "status" "TenantStatus" NOT NULL DEFAULT 'PROSPECT',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "tenant_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_invitations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "tenant_profile_id" UUID NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "token_hash" BYTEA NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "invited_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leases" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "tenant_profile_id" UUID NOT NULL,
  "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "monthly_rent_minor" INTEGER NOT NULL,
  "security_deposit_minor" INTEGER NOT NULL DEFAULT 0,
  "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
  "rent_due_day" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "leases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "leases_dates_check" CHECK ("start_date" < "end_date"),
  CONSTRAINT "leases_rent_check" CHECK ("monthly_rent_minor" > 0 AND "security_deposit_minor" >= 0),
  CONSTRAINT "leases_due_day_check" CHECK ("rent_due_day" BETWEEN 1 AND 28)
);

CREATE UNIQUE INDEX "tenant_profiles_organization_id_id_key" ON "tenant_profiles"("organization_id", "id");
CREATE UNIQUE INDEX "tenant_profiles_organization_id_email_key" ON "tenant_profiles"("organization_id", "email");
CREATE INDEX "tenant_profiles_organization_id_status_created_at_idx" ON "tenant_profiles"("organization_id", "status", "created_at" DESC);
CREATE UNIQUE INDEX "tenant_invitations_token_hash_key" ON "tenant_invitations"("token_hash");
CREATE INDEX "tenant_invitations_organization_id_email_created_at_idx" ON "tenant_invitations"("organization_id", "email", "created_at" DESC);
CREATE INDEX "leases_organization_id_status_start_date_idx" ON "leases"("organization_id", "status", "start_date");
CREATE INDEX "leases_organization_id_unit_id_status_idx" ON "leases"("organization_id", "unit_id", "status");
CREATE INDEX "leases_organization_id_tenant_profile_id_status_idx" ON "leases"("organization_id", "tenant_profile_id", "status");
CREATE UNIQUE INDEX "units_organization_id_property_id_id_key" ON "units"("organization_id", "property_id", "id");

ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_profiles" ADD CONSTRAINT "tenant_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_organization_id_tenant_profile_id_fkey" FOREIGN KEY ("organization_id", "tenant_profile_id") REFERENCES "tenant_profiles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_organization_id_property_id_unit_id_fkey" FOREIGN KEY ("organization_id", "property_id", "unit_id") REFERENCES "units"("organization_id", "property_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_organization_id_tenant_profile_id_fkey" FOREIGN KEY ("organization_id", "tenant_profile_id") REFERENCES "tenant_profiles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
