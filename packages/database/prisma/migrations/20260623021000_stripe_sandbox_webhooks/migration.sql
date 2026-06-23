CREATE TYPE "StripeIntentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'PROCESSING', 'SUCCEEDED', 'CANCELED');
ALTER TYPE "PaymentMethod" ADD VALUE 'STRIPE';
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

CREATE TABLE "stripe_payment_intents" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "tenant_profile_id" UUID NOT NULL,
  "payment_id" UUID, "stripe_payment_intent_id" VARCHAR(255) NOT NULL,
  "amount_minor" INTEGER NOT NULL, "status" "StripeIntentStatus" NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL, "version" BIGINT NOT NULL DEFAULT 1,
  CONSTRAINT "stripe_payment_intents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stripe_payment_intents_amount_check" CHECK ("amount_minor" > 0)
);
CREATE TABLE "stripe_payment_intent_allocations" (
  "id" UUID NOT NULL, "organization_id" UUID NOT NULL, "stripe_payment_intent_id" UUID NOT NULL,
  "rent_obligation_id" UUID NOT NULL, "amount_minor" INTEGER NOT NULL,
  CONSTRAINT "stripe_payment_intent_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stripe_payment_intent_allocations_amount_check" CHECK ("amount_minor" > 0)
);
CREATE TABLE "stripe_webhook_events" (
  "id" UUID NOT NULL, "stripe_event_id" VARCHAR(255) NOT NULL, "event_type" VARCHAR(120) NOT NULL,
  "payload_hash" BYTEA NOT NULL, "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMPTZ(6), "error_code" VARCHAR(120),
  CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_payment_intents_payment_id_key" ON "stripe_payment_intents"("payment_id");
CREATE UNIQUE INDEX "stripe_payment_intents_stripe_payment_intent_id_key" ON "stripe_payment_intents"("stripe_payment_intent_id");
CREATE UNIQUE INDEX "stripe_payment_intents_organization_id_id_key" ON "stripe_payment_intents"("organization_id", "id");
CREATE UNIQUE INDEX "stripe_payment_intents_organization_id_payment_id_key" ON "stripe_payment_intents"("organization_id", "payment_id");
CREATE INDEX "stripe_payment_intents_organization_id_status_created_at_idx" ON "stripe_payment_intents"("organization_id", "status", "created_at");
CREATE UNIQUE INDEX "stripe_intent_allocations_org_intent_obligation_key" ON "stripe_payment_intent_allocations"("organization_id", "stripe_payment_intent_id", "rent_obligation_id");
CREATE UNIQUE INDEX "stripe_webhook_events_stripe_event_id_key" ON "stripe_webhook_events"("stripe_event_id");
CREATE INDEX "stripe_webhook_events_status_received_at_idx" ON "stripe_webhook_events"("status", "received_at");

ALTER TABLE "stripe_payment_intents" ADD CONSTRAINT "stripe_payment_intents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stripe_payment_intents" ADD CONSTRAINT "stripe_payment_intents_org_tenant_fkey" FOREIGN KEY ("organization_id", "tenant_profile_id") REFERENCES "tenant_profiles"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stripe_payment_intents" ADD CONSTRAINT "stripe_payment_intents_org_payment_fkey" FOREIGN KEY ("organization_id", "payment_id") REFERENCES "payments"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stripe_payment_intent_allocations" ADD CONSTRAINT "stripe_intent_allocations_org_intent_fkey" FOREIGN KEY ("organization_id", "stripe_payment_intent_id") REFERENCES "stripe_payment_intents"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stripe_payment_intent_allocations" ADD CONSTRAINT "stripe_intent_allocations_org_obligation_fkey" FOREIGN KEY ("organization_id", "rent_obligation_id") REFERENCES "rent_obligations"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
