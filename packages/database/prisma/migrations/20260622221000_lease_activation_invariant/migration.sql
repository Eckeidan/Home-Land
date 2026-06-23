-- Defense in depth: at most one active lease may occupy a unit.
CREATE UNIQUE INDEX "leases_one_active_per_unit_key"
ON "leases"("organization_id", "unit_id")
WHERE "status" = 'ACTIVE';
