-- AlterTable
ALTER TABLE "maintenance_requests" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "maintenance_requests" RENAME CONSTRAINT "maintenance_requests_org_fk" TO "maintenance_requests_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "maintenance_requests" RENAME CONSTRAINT "maintenance_requests_property_fk" TO "maintenance_requests_organization_id_property_id_fkey";

-- RenameForeignKey
ALTER TABLE "maintenance_requests" RENAME CONSTRAINT "maintenance_requests_tenant_fk" TO "maintenance_requests_organization_id_tenant_profile_id_fkey";

-- RenameForeignKey
ALTER TABLE "maintenance_requests" RENAME CONSTRAINT "maintenance_requests_unit_fk" TO "maintenance_requests_organization_id_property_id_unit_id_fkey";

-- RenameIndex
ALTER INDEX "maintenance_requests_org_id_unique" RENAME TO "maintenance_requests_organization_id_id_key";

-- RenameIndex
ALTER INDEX "maintenance_requests_property_status_idx" RENAME TO "maintenance_requests_organization_id_property_id_status_idx";

-- RenameIndex
ALTER INDEX "maintenance_requests_status_priority_created_idx" RENAME TO "maintenance_requests_organization_id_status_priority_create_idx";

-- RenameIndex
ALTER INDEX "maintenance_requests_tenant_created_idx" RENAME TO "maintenance_requests_organization_id_tenant_profile_id_crea_idx";
