"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { type FormEvent, useRef, useState } from "react";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey.startsWith("pk_test_") ? loadStripe(publishableKey) : null;

type Obligation = {
  id: string;
  tenantName: string;
  period: string;
  outstandingMinor: number;
};

type Props = {
  apiBaseUrl: string;
  organizationId: string;
  obligations: Obligation[];
  csrfToken: () => string | null;
  onSettled: () => Promise<void>;
};

function Checkout({
  amountMinor,
  onSettled,
}: {
  amountMinor: number;
  onSettled: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) {
      setMessage(result.error.message ?? "Stripe could not confirm this payment.");
      setBusy(false);
      return;
    }
    setMessage(
      result.paymentIntent.status === "succeeded"
        ? "Payment confirmed. The signed webhook will finalize the ledger."
        : "Payment processing. The ledger will update after Stripe verification.",
    );
    await onSettled();
    setBusy(false);
  }

  return (
    <form className="stripe-checkout" onSubmit={confirm}>
      <PaymentElement options={{ layout: "tabs" }} />
      {message ? (
        <p className="stripe-status" role="status">
          {message}
        </p>
      ) : null}
      <button className="identity-submit" type="submit" disabled={!stripe || busy}>
        {busy ? "Confirming…" : `Pay $${(amountMinor / 100).toFixed(2)}`} <span>→</span>
      </button>
    </form>
  );
}

export function StripePaymentForm({
  apiBaseUrl,
  organizationId,
  obligations,
  csrfToken,
  onSettled,
}: Props) {
  const idempotencyKey = useRef(crypto.randomUUID());
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!stripePromise) {
    return (
      <div className="portfolio-form stripe-unavailable">
        <p className="app-eyebrow">Stripe test mode</p>
        <h2>Sandbox not configured</h2>
        <p>Add a test publishable key to enable secure card collection.</p>
      </div>
    );
  }

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrfToken();
    if (!token) return setError("Secure session expired.");
    const form = new FormData(event.currentTarget);
    const selected = obligations.find((item) => item.id === form.get("rentObligationId"));
    const requestedMinor = Math.round(Number(form.get("amount")) * 100);
    if (!selected || requestedMinor < 1 || requestedMinor > selected.outstandingMinor) {
      return setError("Choose a valid amount within the outstanding balance.");
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/rent/stripe/payment-intents`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey.current,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({
            allocations: [{ rentObligationId: selected.id, amountMinor: requestedMinor }],
          }),
        },
      );
      const body = (await response.json()) as { clientSecret?: string; title?: string };
      if (!response.ok || !body.clientSecret) {
        throw new Error(body.title ?? "Stripe payment could not be prepared.");
      }
      idempotencyKey.current = crypto.randomUUID();
      setAmountMinor(requestedMinor);
      setClientSecret(body.clientSecret);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Stripe payment could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  if (clientSecret) {
    return (
      <div className="portfolio-form stripe-payment-form">
        <div>
          <p className="app-eyebrow">Encrypted payment details</p>
          <h2>Complete payment</h2>
        </div>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
              variables: { colorPrimary: "#b9f7d5", borderRadius: "9px" },
            },
          }}
        >
          <Checkout amountMinor={amountMinor} onSettled={onSettled} />
        </Elements>
        <button className="stripe-reset" type="button" onClick={() => setClientSecret(null)}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <form className="portfolio-form unit-create-form" onSubmit={prepare}>
      <div>
        <p className="app-eyebrow">Stripe Elements · sandbox</p>
        <h2>Collect online payment</h2>
      </div>
      <label className="identity-field">
        <span>Open obligation</span>
        <select name="rentObligationId" required>
          <option value="">Select obligation</option>
          {obligations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.tenantName} · {item.period} · ${(item.outstandingMinor / 100).toFixed(2)} due
            </option>
          ))}
        </select>
      </label>
      <label className="identity-field">
        <span>Amount USD</span>
        <input name="amount" type="number" min="0.50" step="0.01" required />
      </label>
      {error ? (
        <p className="identity-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="identity-submit" type="submit" disabled={busy || obligations.length === 0}>
        {busy ? "Preparing…" : "Continue to secure payment"} <span>→</span>
      </button>
    </form>
  );
}
