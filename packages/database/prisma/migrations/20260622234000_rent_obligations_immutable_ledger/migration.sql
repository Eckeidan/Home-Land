CREATE TYPE "RentObligationStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID');
CREATE TYPE "LedgerDirection" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "LedgerTransactionStatus" AS ENUM ('POSTED', 'REVERSED');

CREATE UNIQUE INDEX "leases_organization_id_id_key" ON "leases"("organization_id", "id");

CREATE TABLE "rent_obligations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "lease_id" UUID NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,
  "due_date" DATE NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
  "status" "RentObligationStatus" NOT NULL DEFAULT 'OPEN',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "rent_obligations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rent_obligations_amount_check" CHECK ("amount_minor" > 0),
  CONSTRAINT "rent_obligations_period_check" CHECK ("period_start" <= "due_date" AND "due_date" <= "period_end")
);

CREATE TABLE "ledger_transactions" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "rent_obligation_id" UUID NOT NULL,
  "status" "LedgerTransactionStatus" NOT NULL DEFAULT 'POSTED',
  "description" VARCHAR(240) NOT NULL,
  "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correlation_id" VARCHAR(128) NOT NULL,
  CONSTRAINT "ledger_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ledger_entries" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "transaction_id" UUID NOT NULL,
  "account_code" VARCHAR(64) NOT NULL,
  "direction" "LedgerDirection" NOT NULL,
  "amount_minor" INTEGER NOT NULL,
  "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ledger_entries_amount_check" CHECK ("amount_minor" > 0)
);

CREATE UNIQUE INDEX "rent_obligations_organization_id_id_key" ON "rent_obligations"("organization_id", "id");
CREATE UNIQUE INDEX "rent_obligations_organization_id_lease_id_period_start_key" ON "rent_obligations"("organization_id", "lease_id", "period_start");
CREATE INDEX "rent_obligations_organization_id_status_due_date_idx" ON "rent_obligations"("organization_id", "status", "due_date");
CREATE UNIQUE INDEX "ledger_transactions_rent_obligation_id_key" ON "ledger_transactions"("rent_obligation_id");
CREATE UNIQUE INDEX "ledger_transactions_organization_id_id_key" ON "ledger_transactions"("organization_id", "id");
CREATE UNIQUE INDEX "ledger_transactions_organization_id_rent_obligation_id_key" ON "ledger_transactions"("organization_id", "rent_obligation_id");
CREATE INDEX "ledger_transactions_organization_id_posted_at_idx" ON "ledger_transactions"("organization_id", "posted_at" DESC);
CREATE INDEX "ledger_entries_organization_id_transaction_id_idx" ON "ledger_entries"("organization_id", "transaction_id");
CREATE INDEX "ledger_entries_organization_id_account_code_created_at_idx" ON "ledger_entries"("organization_id", "account_code", "created_at");

ALTER TABLE "rent_obligations" ADD CONSTRAINT "rent_obligations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rent_obligations" ADD CONSTRAINT "rent_obligations_organization_id_lease_id_fkey" FOREIGN KEY ("organization_id", "lease_id") REFERENCES "leases"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_organization_id_rent_obligation_id_fkey" FOREIGN KEY ("organization_id", "rent_obligation_id") REFERENCES "rent_obligations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_organization_id_transaction_id_fkey" FOREIGN KEY ("organization_id", "transaction_id") REFERENCES "ledger_transactions"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'immutable ledger records cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_transactions_immutable BEFORE UPDATE OR DELETE ON "ledger_transactions" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON "ledger_entries" FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

CREATE FUNCTION enforce_ledger_balance() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ledger_entries"
    WHERE "organization_id" = NEW."organization_id" AND "transaction_id" = NEW."transaction_id"
    GROUP BY "transaction_id", "currency_code"
    HAVING SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount_minor" ELSE -"amount_minor" END) <> 0
  ) THEN
    RAISE EXCEPTION 'ledger transaction is unbalanced';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balance_guard
AFTER INSERT ON "ledger_entries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_balance();
