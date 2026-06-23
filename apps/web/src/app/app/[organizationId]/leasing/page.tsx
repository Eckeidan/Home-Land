"use client";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../../../../components/app-shell";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
type Snapshot = {
  organization: { displayName: string; slug: string | null };
  tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    version: number;
  }>;
  leases: Array<{
    id: string;
    tenantName: string;
    unitCode: string;
    startDate: string;
    endDate: string;
    monthlyRentMinor: number;
    status: string;
    version: number;
    renewalMarkedAt: string | null;
  }>;
  availableUnits: Array<{ id: string; propertyId: string; unitCode: string; propertyName: string }>;
};
function csrf() {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const value = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

export default function LeasingPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const tenantKey = useRef(crypto.randomUUID());
  const leaseKey = useRef(crypto.randomUUID());
  const transitionKeys = useRef(new Map<string, string>());
  const load = useCallback(async () => {
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/leasing`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title);
      setData(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Leasing could not be loaded.");
    }
  }, [organizationId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(path: string, key: string, body: object) {
    const token = csrf();
    if (!token) throw new Error("Secure session expired.");
    const response = await fetch(`${api}/organizations/${organizationId}/leasing/${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        "X-CSRF-Token": token,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.title ?? "Request failed.");
  }
  async function tenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError(null);
    const form = new FormData(formElement);
    try {
      await submit("tenants", tenantKey.current, {
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone") || undefined,
        sendInvitation: form.get("invite") === "on",
      });
      tenantKey.current = crypto.randomUUID();
      formElement.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tenant failed.");
    } finally {
      setBusy(false);
    }
  }
  async function lease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError(null);
    const form = new FormData(formElement);
    const unit = data?.availableUnits.find((item) => item.id === form.get("unitId"));
    try {
      if (!unit) throw new Error("Select an available unit.");
      await submit("leases", leaseKey.current, {
        propertyId: unit.propertyId,
        unitId: unit.id,
        tenantProfileId: form.get("tenantProfileId"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        monthlyRentMinor: Math.round(Number(form.get("rent")) * 100),
        securityDepositMinor: Math.round(Number(form.get("deposit") || 0) * 100),
        rentDueDay: Number(form.get("dueDay")),
      });
      leaseKey.current = crypto.randomUUID();
      formElement.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lease draft failed.");
    } finally {
      setBusy(false);
    }
  }
  async function transitionLease(
    lease: Snapshot["leases"][number],
    requestedAction?: "renewal-marker" | "terminate",
  ) {
    const action = requestedAction ?? (lease.status === "DRAFT" ? "validate" : "activate");
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    const keyName = `${lease.id}:${action}`;
    const key = transitionKeys.current.get(keyName) ?? crypto.randomUUID();
    transitionKeys.current.set(keyName, key);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `${api}/organizations/${organizationId}/leasing/leases/${lease.id}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Idempotency-Key": key,
            "If-Match": `"${lease.version}"`,
            "X-CSRF-Token": token,
          },
        },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Lease transition failed.");
      transitionKeys.current.delete(keyName);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lease transition failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <div className="app-loading">{error ?? "Loading leasing workspace…"}</div>;
  return (
    <AppShell
      organizationId={organizationId}
      organizationName={data.organization.displayName}
      workspaceSlug={data.organization.slug}
      activeSection="Leasing"
    >
      <section className="portfolio-heading">
        <div>
          <p className="app-eyebrow">Leasing system</p>
          <h1>Tenants & leases</h1>
          <p>Identity, invitations and lease preparation inside one organization boundary.</p>
        </div>
      </section>
      <section className="leasing-grid">
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">People</p>
              <h2>Tenant profiles</h2>
            </div>
            <strong>{data.tenants.length}</strong>
          </div>
          {data.tenants.map((item) => (
            <article className="unit-row" key={item.id}>
              <span className="unit-mark">
                {item.firstName[0]}
                {item.lastName[0]}
              </span>
              <div>
                <h3>
                  {item.firstName} {item.lastName}
                </h3>
                <p>{item.email}</p>
              </div>
              <em>{item.status}</em>
            </article>
          ))}
        </div>
        <form className="portfolio-form unit-create-form" onSubmit={tenant}>
          <div>
            <p className="app-eyebrow">Tenant identity</p>
            <h2>Create and invite</h2>
          </div>
          <div className="identity-field-grid">
            <label className="identity-field">
              <span>First name</span>
              <input name="firstName" required />
            </label>
            <label className="identity-field">
              <span>Last name</span>
              <input name="lastName" required />
            </label>
          </div>
          <label className="identity-field">
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <label className="identity-field">
            <span>Phone · optional</span>
            <input name="phone" />
          </label>
          <label className="leasing-check">
            <input name="invite" type="checkbox" defaultChecked /> Send secure invitation
          </label>
          <button className="identity-submit" type="submit" disabled={busy}>
            Create tenant <span>→</span>
          </button>
        </form>
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Preparation</p>
              <h2>Lease drafts</h2>
            </div>
            <strong>{data.leases.length}</strong>
          </div>
          {data.leases.map((item) => (
            <article className="unit-row" key={item.id}>
              <span className="unit-mark">≡</span>
              <div>
                <h3>
                  {item.tenantName} · Unit {item.unitCode}
                </h3>
                <p>
                  {item.startDate} → {item.endDate} · ${(item.monthlyRentMinor / 100).toFixed(2)}
                  {item.renewalMarkedAt ? " · Renewal marked" : ""}
                </p>
              </div>
              <div className="lease-row-action">
                <em>{item.status}</em>
                {item.status === "DRAFT" || item.status === "READY_FOR_ACTIVATION" ? (
                  <button type="button" disabled={busy} onClick={() => void transitionLease(item)}>
                    {item.status === "DRAFT" ? "Validate" : "Activate"}
                  </button>
                ) : null}
                {item.status === "ACTIVE" ? (
                  <span className="lease-lifecycle-actions">
                    {!item.renewalMarkedAt ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void transitionLease(item, "renewal-marker")}
                      >
                        Mark renewal
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transitionLease(item, "terminate")}
                    >
                      Terminate
                    </button>
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        <form className="portfolio-form unit-create-form" onSubmit={lease}>
          <div>
            <p className="app-eyebrow">Explicit state</p>
            <h2>Prepare lease draft</h2>
          </div>
          <label className="identity-field">
            <span>Tenant</span>
            <select name="tenantProfileId" required>
              <option value="">Select tenant</option>
              {data.tenants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </label>
          <label className="identity-field">
            <span>Available unit</span>
            <select name="unitId" required>
              <option value="">Select unit</option>
              {data.availableUnits.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.propertyName} · {item.unitCode}
                </option>
              ))}
            </select>
          </label>
          <div className="identity-field-grid">
            <label className="identity-field">
              <span>Start</span>
              <input name="startDate" type="date" required />
            </label>
            <label className="identity-field">
              <span>End</span>
              <input name="endDate" type="date" required />
            </label>
          </div>
          <div className="identity-field-grid">
            <label className="identity-field">
              <span>Monthly rent USD</span>
              <input name="rent" type="number" min="1" step="0.01" required />
            </label>
            <label className="identity-field">
              <span>Deposit USD</span>
              <input name="deposit" type="number" min="0" step="0.01" />
            </label>
          </div>
          <label className="identity-field">
            <span>Rent due day</span>
            <input name="dueDay" type="number" min="1" max="28" defaultValue="1" required />
          </label>
          <button className="identity-submit" type="submit" disabled={busy}>
            Create lease draft <span>→</span>
          </button>
        </form>
      </section>
      {error ? (
        <div className="app-error-banner" role="alert">
          <strong>Action blocked</strong>
          <span className="app-error-message">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      ) : null}
    </AppShell>
  );
}
