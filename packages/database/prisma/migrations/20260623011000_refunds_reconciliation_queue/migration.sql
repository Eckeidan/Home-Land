CREATE TYPE "RefundStatus" AS ENUM ('POSTED');
CREATE TYPE "ReconciliationStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "ReconciliationKind" AS ENUM ('PAYMENT_REVIEW', 'REFUND_REVIEW');

CREATE TABLE "refunds" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "payment_id" UUID NOT NULL,
  "amount_minor" INTEGER NOT NULL, "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
  "reason" VARCHAR(240) NOT NULL, "status" "RefundStatus" NOT NULL DEFAULT 'POSTED',
  "refunded_at" TIMESTAMPTZ(6) NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"), CONSTRAINT "refunds_amount_check" CHECK ("amount_minor" > 0)
);
CREATE TABLE "refund_allocations" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "refund_id" UUID NOT NULL,
  "payment_allocation_id" UUID NOT NULL, "amount_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_allocations_pkey" PRIMARY KEY ("id"), CONSTRAINT "refund_allocations_amount_check" CHECK ("amount_minor" > 0)
);
CREATE TABLE "reconciliation_items" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "kind" "ReconciliationKind" NOT NULL,
  "status" "ReconciliationStatus" NOT NULL DEFAULT 'OPEN', "payment_id" UUID, "refund_id" UUID,
  "resolved_by" UUID, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMPTZ(6), "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "reconciliation_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reconciliation_items_one_source_check" CHECK (num_nonnulls("payment_id", "refund_id") = 1),
  CONSTRAINT "reconciliation_items_resolution_check" CHECK (("status" = 'OPEN' AND "resolved_at" IS NULL) OR ("status" = 'RESOLVED' AND "resolved_at" IS NOT NULL))
);

CREATE UNIQUE INDEX "payment_allocations_organization_id_id_key" ON "payment_allocations"("organization_id", "id");
CREATE UNIQUE INDEX "refunds_organization_id_id_key" ON "refunds"("organization_id", "id");
CREATE INDEX "refunds_organization_id_payment_id_refunded_at_idx" ON "refunds"("organization_id", "payment_id", "refunded_at" DESC);
CREATE UNIQUE INDEX "refund_allocations_organization_id_refund_id_payment_alloc_key" ON "refund_allocations"("organization_id", "refund_id", "payment_allocation_id");
CREATE INDEX "refund_allocations_organization_id_payment_allocation_id_idx" ON "refund_allocations"("organization_id", "payment_allocation_id");
CREATE INDEX "reconciliation_items_organization_id_status_created_at_idx" ON "reconciliation_items"("organization_id", "status", "created_at");

ALTER TABLE "ledger_transactions" DROP CONSTRAINT "ledger_transactions_one_source_check";
ALTER TABLE "ledger_transactions" ADD COLUMN "refund_id" UUID;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_one_source_check" CHECK (num_nonnulls("rent_obligation_id", "payment_id", "refund_id") = 1);
CREATE UNIQUE INDEX "ledger_transactions_refund_id_key" ON "ledger_transactions"("refund_id");
CREATE UNIQUE INDEX "ledger_transactions_organization_id_refund_id_key" ON "ledger_transactions"("organization_id", "refund_id");

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_organization_id_payment_id_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_allocations" ADD CONSTRAINT "refund_allocations_organization_id_refund_id_fkey" FOREIGN KEY ("organization_id", "refund_id") REFERENCES "refunds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_allocations" ADD CONSTRAINT "refund_allocations_organization_id_payment_allocation_id_fkey" FOREIGN KEY ("organization_id", "payment_allocation_id") REFERENCES "payment_allocations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_organization_id_refund_id_fkey" FOREIGN KEY ("organization_id", "refund_id") REFERENCES "refunds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_organization_id_payment_id_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_organization_id_refund_id_fkey" FOREIGN KEY ("organization_id", "refund_id") REFERENCES "refunds"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TRIGGER refunds_immutable BEFORE UPDATE OR DELETE ON "refunds" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER refund_allocations_immutable BEFORE UPDATE OR DELETE ON "refund_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
