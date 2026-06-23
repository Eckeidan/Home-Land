CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'EMERGENCY');

CREATE TYPE "MaintenanceRequestStatus" AS ENUM (
  'SUBMITTED',
  'TRIAGED',
  'ASSIGNED',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
  'CLOSED',
  'CANCELLED'
);

CREATE TABLE "maintenance_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "unit_id" UUID,
  "tenant_profile_id" UUID,
  "title" VARCHAR(160) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'NORMAL',
  "status" "MaintenanceRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "assigned_vendor_name" VARCHAR(160),
  "assigned_vendor_email" VARCHAR(320),
  "scheduled_for" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "verified_at" TIMESTAMPTZ(6),
  "closed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" BIGINT NOT NULL DEFAULT 1,

  CONSTRAINT "maintenance_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "maintenance_requests_org_id_unique" UNIQUE ("organization_id", "id"),
  CONSTRAINT "maintenance_requests_org_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "maintenance_requests_property_fk" FOREIGN KEY ("organization_id", "property_id") REFERENCES "properties"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "maintenance_requests_unit_fk" FOREIGN KEY ("organization_id", "property_id", "unit_id") REFERENCES "units"("organization_id", "property_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "maintenance_requests_tenant_fk" FOREIGN KEY ("organization_id", "tenant_profile_id") REFERENCES "tenant_profiles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "maintenance_requests_status_priority_created_idx" ON "maintenance_requests"("organization_id", "status", "priority", "created_at" DESC);
CREATE INDEX "maintenance_requests_property_status_idx" ON "maintenance_requests"("organization_id", "property_id", "status");
CREATE INDEX "maintenance_requests_tenant_created_idx" ON "maintenance_requests"("organization_id", "tenant_profile_id", "created_at" DESC);
