-- CreateTable
CREATE TABLE "buildings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "units" ADD COLUMN "building_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "buildings_organization_id_property_id_id_key" ON "buildings"("organization_id", "property_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_organization_id_property_id_name_key" ON "buildings"("organization_id", "property_id", "name");

-- CreateIndex
CREATE INDEX "buildings_organization_id_property_id_created_at_idx" ON "buildings"("organization_id", "property_id", "created_at");

-- CreateIndex
CREATE INDEX "units_organization_id_property_id_building_id_idx" ON "units"("organization_id", "property_id", "building_id");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organization_id_property_id_fkey" FOREIGN KEY ("organization_id", "property_id") REFERENCES "properties"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_property_id_building_id_fkey" FOREIGN KEY ("organization_id", "property_id", "building_id") REFERENCES "buildings"("organization_id", "property_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
