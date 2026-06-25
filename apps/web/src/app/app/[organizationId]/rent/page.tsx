"use client";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../../../../components/app-shell";
import { StripePaymentForm } from "../../../../components/stripe-payment-form";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
type Snapshot = {
  organization: { displayName: string; slug: string | null };
  activeLeases: Array<{
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    monthlyRentMinor: number;
  }>;
  obligations: Array<{
    id: string;
    tenantName: string;
    unitCode: string;
    period: string;
    dueDate: string;
    amountMinor: number;
    status: string;
    ledgerTransactionId: string | null;
    ledgerBalanced: boolean;
    allocatedMinor: number;
    outstandingMinor: number;
  }>;
  payments: Array<{
    id: string;
    tenantName: string;
    amountMinor: number;
    method: string;
    receivedAt: string;
    receiptNumber: string | null;
    refundableAllocations: Array<{
      paymentAllocationId: string;
      rentObligationId: string;
      refundableMinor: number;
    }>;
  }>;
  reconciliationItems: Array<{
    id: string;
    kind: string;
    paymentId: string | null;
    refundId: string | null;
    createdAt: string;
    version: number;
  }>;
};

type TrialBalance = {
  lines: Array<{
    accountCode: string;
    debitMinor: number;
    creditMinor: number;
    balanceMinor: number;
  }>;
  debitTotalMinor: number;
  creditTotalMinor: number;
  balanced: boolean;
};

type AccountingSummary = {
  cashMinor: number;
  receivableMinor: number;
  revenueMinor: number;
  openObligationsMinor: number;
  paidMinor: number;
  refundedMinor: number;
  trialBalanceBalanced: boolean;
};

const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

function csrf() {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}
export default function RentPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const paymentKey = useRef(crypto.randomUUID());
  const refundKey = useRef(crypto.randomUUID());
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [accountingSummary, setAccountingSummary] = useState<AccountingSummary | null>(null);
  const load = useCallback(async () => {
    try {
      const [rentResponse, trialResponse, summaryResponse] = await Promise.all([
        fetch(`${api}/organizations/${organizationId}/rent`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${api}/organizations/${organizationId}/rent/trial-balance`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`${api}/organizations/${organizationId}/rent/accounting-summary`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      const [rentBody, trialBody, summaryBody] = await Promise.all([
        rentResponse.json(),
        trialResponse.json(),
        summaryResponse.json(),
      ]);

      if (!rentResponse.ok) throw new Error(rentBody.title);
      if (!trialResponse.ok) throw new Error(trialBody.title);
      if (!summaryResponse.ok) throw new Error(summaryBody.title);

      setData(rentBody);
      setTrialBalance(trialBody);
      setAccountingSummary(summaryBody);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Rent operations unavailable.");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/rent/obligations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({ leaseId: form.get("leaseId"), period: form.get("period") }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Obligation could not be created.");
      key.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Obligation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/rent/payments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": paymentKey.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          method: form.get("method"),
          receivedAt: new Date(String(form.get("receivedAt"))).toISOString(),
          externalReference: form.get("externalReference") || undefined,
          allocations: [
            {
              rentObligationId: form.get("rentObligationId"),
              amountMinor: Math.round(Number(form.get("amount")) * 100),
            },
          ],
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Payment could not be recorded.");
      paymentKey.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  }
  async function recordRefund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const [paymentId, paymentAllocationId] = String(form.get("allocation")).split("|");
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/rent/refunds`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": refundKey.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          paymentId,
          reason: form.get("reason"),
          refundedAt: new Date(String(form.get("refundedAt"))).toISOString(),
          allocations: [
            { paymentAllocationId, amountMinor: Math.round(Number(form.get("amount")) * 100) },
          ],
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Refund failed.");
      refundKey.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refund failed.");
    } finally {
      setBusy(false);
    }
  }
  async function resolveItem(item: Snapshot["reconciliationItems"][number]) {
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `${api}/organizations/${organizationId}/rent/reconciliation/${item.id}/resolve`,
        {
          method: "POST",
          credentials: "include",
          headers: { "If-Match": `"${item.version}"`, "X-CSRF-Token": token },
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Resolution failed.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Resolution failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <div className="app-loading">{error ?? "Loading immutable ledger…"}</div>;
  const openMinor = data.obligations
    .filter((item) => item.status === "OPEN" || item.status === "PARTIALLY_PAID")
    .reduce((sum, item) => sum + item.outstandingMinor, 0);
  return (
    <AppShell
      organizationId={organizationId}
      organizationName={data.organization.displayName}
      workspaceSlug={data.organization.slug}
      activeSection="Rent"
    >
      <section className="portfolio-heading">
        <div>
          <p className="app-eyebrow">Rent operations</p>
          <h1>Obligations & ledger</h1>
          <p>Every obligation posts one balanced, immutable accounting transaction.</p>
        </div>
        <span className="readiness-badge">${(openMinor / 100).toFixed(2)} open</span>
      </section>

      {accountingSummary && trialBalance ? (
        <section className="leasing-grid rent-payment-grid">
          <div className="unit-inventory">
            <div className="unit-inventory-heading">
              <div>
                <p className="app-eyebrow">Accounting summary</p>
                <h2>Financial position</h2>
              </div>
              <strong>{accountingSummary.trialBalanceBalanced ? "OK" : "FAIL"}</strong>
            </div>
            <article className="unit-row">
              <span className="unit-mark">$</span>
              <div>
                <h3>Cash</h3>
                <p>{usd(accountingSummary.cashMinor)}</p>
              </div>
            </article>
            <article className="unit-row">
              <span className="unit-mark">$</span>
              <div>
                <h3>Receivable</h3>
                <p>{usd(accountingSummary.receivableMinor)}</p>
              </div>
            </article>
            <article className="unit-row">
              <span className="unit-mark">$</span>
              <div>
                <h3>Revenue</h3>
                <p>{usd(accountingSummary.revenueMinor)}</p>
              </div>
            </article>
            <article className="unit-row">
              <span className="unit-mark">↩</span>
              <div>
                <h3>Refunded</h3>
                <p>{usd(accountingSummary.refundedMinor)}</p>
              </div>
            </article>
          </div>

          <div className="unit-inventory">
            <div className="unit-inventory-heading">
              <div>
                <p className="app-eyebrow">Trial balance</p>
                <h2>Debit = Credit</h2>
              </div>
              <strong>{trialBalance.balanced ? "BALANCED" : "EXCEPTION"}</strong>
            </div>
            {trialBalance.lines.map((line) => (
              <article className="unit-row" key={line.accountCode}>
                <span className="unit-mark">=</span>
                <div>
                  <h3>{line.accountCode}</h3>
                  <p>
                    Debit {usd(line.debitMinor)} · Credit {usd(line.creditMinor)} · Balance{" "}
                    {usd(line.balanceMinor)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="leasing-grid rent-payment-grid">
        <div className="unit-inventory stripe-summary">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Online collection</p>
              <h2>Stripe sandbox</h2>
            </div>
            <strong>TEST</strong>
          </div>
          <p>
            Card details go directly to Stripe Elements. Only a signed webhook can post the
            immutable payment and receipt.
          </p>
          <p className="rent-ledger-rule">Browser confirmation ≠ accounting confirmation</p>
        </div>
        <StripePaymentForm
          apiBaseUrl={api}
          organizationId={organizationId}
          obligations={data.obligations.filter((item) => item.outstandingMinor > 0)}
          csrfToken={csrf}
          onSettled={load}
        />
      </section>
      <section className="leasing-grid rent-payment-grid">
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Accounting control</p>
              <h2>Reconciliation queue</h2>
            </div>
            <strong>{data.reconciliationItems.length}</strong>
          </div>
          {data.reconciliationItems.map((item) => (
            <article className="unit-row" key={item.id}>
              <span className="unit-mark">!</span>
              <div>
                <h3>{item.kind}</h3>
                <p>{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <button
                className="reconciliation-resolve"
                type="button"
                disabled={busy}
                onClick={() => void resolveItem(item)}
              >
                Resolve
              </button>
            </article>
          ))}
        </div>
        <form className="portfolio-form unit-create-form" onSubmit={recordRefund}>
          <div>
            <p className="app-eyebrow">Reversing entry</p>
            <h2>Record refund</h2>
          </div>
          <label className="identity-field">
            <span>Refundable allocation</span>
            <select name="allocation" required>
              <option value="">Select allocation</option>
              {data.payments.flatMap((payment) =>
                payment.refundableAllocations.map((allocation) => (
                  <option
                    key={allocation.paymentAllocationId}
                    value={`${payment.id}|${allocation.paymentAllocationId}`}
                  >
                    {payment.tenantName} · {payment.receiptNumber} · $
                    {(allocation.refundableMinor / 100).toFixed(2)} max
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="identity-field">
            <span>Amount USD</span>
            <input name="amount" type="number" min="0.01" step="0.01" required />
          </label>
          <label className="identity-field">
            <span>Refunded at</span>
            <input name="refundedAt" type="datetime-local" required />
          </label>
          <label className="identity-field">
            <span>Reason</span>
            <input name="reason" minLength={3} maxLength={240} required />
          </label>
          <p className="rent-ledger-rule">Debit RENT_RECEIVABLE = Credit CASH</p>
          <button className="identity-submit" type="submit" disabled={busy}>
            Post reversing refund <span>→</span>
          </button>
        </form>
      </section>
      <section className="leasing-grid">
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Receivables</p>
              <h2>Rent obligations</h2>
            </div>
            <strong>{data.obligations.length}</strong>
          </div>
          {data.obligations.map((item) => (
            <article className="unit-row" key={item.id}>
              <span className="unit-mark">$</span>
              <div>
                <h3>
                  {item.tenantName} · Unit {item.unitCode}
                </h3>
                <p>
                  {item.period} · due {item.dueDate} · ${(item.amountMinor / 100).toFixed(2)}
                  {item.allocatedMinor > 0
                    ? ` · ${(item.outstandingMinor / 100).toFixed(2)} remaining`
                    : ""}
                </p>
              </div>
              <div className="lease-row-action">
                <em>{item.status}</em>
                <small>{item.ledgerBalanced ? "Ledger balanced" : "Ledger exception"}</small>
              </div>
            </article>
          ))}
        </div>
        <form className="portfolio-form unit-create-form" onSubmit={create}>
          <div>
            <p className="app-eyebrow">Double-entry command</p>
            <h2>Post monthly obligation</h2>
          </div>
          <label className="identity-field">
            <span>Active lease</span>
            <select name="leaseId" required>
              <option value="">Select lease</option>
              {data.activeLeases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.label} · ${(lease.monthlyRentMinor / 100).toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label className="identity-field">
            <span>Rent period</span>
            <input name="period" type="month" required />
          </label>
          <p className="rent-ledger-rule">Debit RENT_RECEIVABLE = Credit RENT_REVENUE</p>
          <button className="identity-submit" type="submit" disabled={busy}>
            Post obligation <span>→</span>
          </button>
        </form>
      </section>
      <section className="leasing-grid rent-payment-grid">
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Immutable evidence</p>
              <h2>Payments & receipts</h2>
            </div>
            <strong>{data.payments.length}</strong>
          </div>
          {data.payments.map((payment) => (
            <article className="unit-row" key={payment.id}>
              <span className="unit-mark">✓</span>
              <div>
                <h3>{payment.tenantName}</h3>
                <p>
                  ${(payment.amountMinor / 100).toFixed(2)} · {payment.method} ·{" "}
                  {new Date(payment.receivedAt).toLocaleDateString()}
                </p>
              </div>
              <em>{payment.receiptNumber ?? "Receipt pending"}</em>
            </article>
          ))}
        </div>
        <form className="portfolio-form unit-create-form" onSubmit={recordPayment}>
          <div>
            <p className="app-eyebrow">Allocation command</p>
            <h2>Record payment</h2>
          </div>
          <label className="identity-field">
            <span>Open obligation</span>
            <select name="rentObligationId" required>
              <option value="">Select obligation</option>
              {data.obligations
                .filter((item) => item.outstandingMinor > 0)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tenantName} · {item.period} · ${(item.outstandingMinor / 100).toFixed(2)}{" "}
                    due
                  </option>
                ))}
            </select>
          </label>
          <div className="identity-field-grid">
            <label className="identity-field">
              <span>Amount USD</span>
              <input name="amount" type="number" min="0.01" step="0.01" required />
            </label>
            <label className="identity-field">
              <span>Method</span>
              <select name="method" defaultValue="ACH">
                <option value="ACH">ACH</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </label>
          </div>
          <label className="identity-field">
            <span>Received at</span>
            <input name="receivedAt" type="datetime-local" required />
          </label>
          <label className="identity-field">
            <span>External reference · optional</span>
            <input name="externalReference" maxLength={120} />
          </label>
          <p className="rent-ledger-rule">Debit CASH = Credit RENT_RECEIVABLE</p>
          <button className="identity-submit" type="submit" disabled={busy}>
            Record and issue receipt <span>→</span>
          </button>
        </form>
      </section>
      {error ? <p className="identity-error">{error}</p> : null}
    </AppShell>
  );
}
