CREATE TYPE "PaymentMethod" AS ENUM ('ACH', 'CHECK', 'CASH', 'OTHER');
CREATE TYPE "PaymentStatus" AS ENUM ('POSTED');

CREATE TABLE "payments" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "tenant_profile_id" UUID NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
  "method" "PaymentMethod" NOT NULL,
  "external_reference" VARCHAR(120),
  "status" "PaymentStatus" NOT NULL DEFAULT 'POSTED',
  "received_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_amount_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "payment_allocations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "rent_obligation_id" UUID NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_allocations_amount_check" CHECK ("amount_minor" > 0)
);

CREATE TABLE "receipts" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "receipt_number" VARCHAR(40) NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ledger_transactions" ALTER COLUMN "rent_obligation_id" DROP NOT NULL;
ALTER TABLE "ledger_transactions" ADD COLUMN "payment_id" UUID;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_one_source_check" CHECK (num_nonnulls("rent_obligation_id", "payment_id") = 1);

CREATE UNIQUE INDEX "payments_organization_id_id_key" ON "payments"("organization_id", "id");
CREATE INDEX "payments_organization_id_tenant_profile_id_received_at_idx" ON "payments"("organization_id", "tenant_profile_id", "received_at" DESC);
CREATE UNIQUE INDEX "payment_allocations_organization_id_payment_id_rent_obligation_id_key" ON "payment_allocations"("organization_id", "payment_id", "rent_obligation_id");
CREATE INDEX "payment_allocations_organization_id_rent_obligation_id_idx" ON "payment_allocations"("organization_id", "rent_obligation_id");
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "receipts"("payment_id");
CREATE UNIQUE INDEX "receipts_organization_id_receipt_number_key" ON "receipts"("organization_id", "receipt_number");
CREATE UNIQUE INDEX "receipts_organization_id_payment_id_key" ON "receipts"("organization_id", "payment_id");
CREATE UNIQUE INDEX "ledger_transactions_payment_id_key" ON "ledger_transactions"("payment_id");
CREATE UNIQUE INDEX "ledger_transactions_organization_id_payment_id_key" ON "ledger_transactions"("organization_id", "payment_id");

ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_organization_id_tenant_profile_id_fkey" FOREIGN KEY ("organization_id", "tenant_profile_id") REFERENCES "tenant_profiles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_organization_id_payment_id_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_organization_id_rent_obligation_id_fkey" FOREIGN KEY ("organization_id", "rent_obligation_id") REFERENCES "rent_obligations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_organization_id_payment_id_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_organization_id_payment_id_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER payments_immutable BEFORE UPDATE OR DELETE ON "payments" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER payment_allocations_immutable BEFORE UPDATE OR DELETE ON "payment_allocations" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER receipts_immutable BEFORE UPDATE OR DELETE ON "receipts" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
