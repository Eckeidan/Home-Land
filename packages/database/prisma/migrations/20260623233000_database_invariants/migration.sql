ALTER TABLE leases
  ADD CONSTRAINT leases_date_order_chk
  CHECK (start_date < end_date);

ALTER TABLE leases
  ADD CONSTRAINT leases_monthly_rent_positive_chk
  CHECK (monthly_rent_minor > 0);

ALTER TABLE leases
  ADD CONSTRAINT leases_security_deposit_non_negative_chk
  CHECK (security_deposit_minor >= 0);

ALTER TABLE leases
  ADD CONSTRAINT leases_rent_due_day_range_chk
  CHECK (rent_due_day BETWEEN 1 AND 31);

ALTER TABLE rent_obligations
  ADD CONSTRAINT rent_obligations_period_order_chk
  CHECK (period_start < period_end);

ALTER TABLE rent_obligations
  ADD CONSTRAINT rent_obligations_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE payment_allocations
  ADD CONSTRAINT payment_allocations_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE refunds
  ADD CONSTRAINT refunds_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE refund_allocations
  ADD CONSTRAINT refund_allocations_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE stripe_payment_intents
  ADD CONSTRAINT stripe_payment_intents_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE stripe_payment_intent_allocations
  ADD CONSTRAINT stripe_payment_intent_allocations_amount_positive_chk
  CHECK (amount_minor > 0);

ALTER TABLE ledger_entries
  ADD CONSTRAINT ledger_entries_amount_positive_chk
  CHECK (amount_minor > 0);