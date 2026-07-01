"use client";

import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type RequestItem = {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "EMERGENCY";
  status: string;
  propertyName: string;
  unitCode: string | null;
  tenantName: string | null;
  assignedVendorName: string | null;
  assignedVendorEmail: string | null;
  createdAt: string;
  version: number;
};

type Snapshot = {
  organization: { displayName: string; slug: string | null };
  properties: Array<{ id: string; name: string; units: Array<{ id: string; label: string }> }>;
  tenants: Array<{ id: string; label: string; email: string }>;
  requests: RequestItem[];
};

function csrf() {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const item = document.cookie.split("; ").find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}

export default function MaintenancePage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const createKey = useRef(crypto.randomUUID());

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/maintenance`, {
        credentials: "include",
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Maintenance unavailable.");
      setData(body);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Maintenance unavailable.");
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    const form = new FormData(event.currentTarget);
    const [propertyId, unitId] = String(form.get("location")).split("|");
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${api}/organizations/${organizationId}/maintenance/requests`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": createKey.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          propertyId,
          unitId: unitId || undefined,
          tenantProfileId: form.get("tenantProfileId") || undefined,
          title: form.get("title"),
          description: form.get("description"),
          priority: form.get("priority"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Request could not be created.");
      createKey.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function transition(
    item: RequestItem,
    action: "triage" | "assign" | "complete" | "verify" | "close",
  ) {
    const token = csrf();
    if (!token) return setError("Secure session expired.");
    setBusy(true);
    setError(null);
    try {
      const body =
        action === "assign"
          ? {
              assignedVendorName: window.prompt("Vendor name") ?? undefined,
              assignedVendorEmail: window.prompt("Vendor email") ?? undefined,
            }
          : {};
      const response = await fetch(
        `${api}/organizations/${organizationId}/maintenance/requests/${item.id}/${action}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": crypto.randomUUID(),
            "If-Match": `"${item.version}"`,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.title ?? "Transition failed.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Transition failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="app-loading">{error ?? "Loading maintenance operations…"}</div>;

  const open = data.requests.filter((request) => !["CLOSED", "CANCELLED"].includes(request.status));
  const emergency = open.filter((request) => request.priority === "EMERGENCY").length;

  return (
    <>
      <section className="portfolio-heading">
        <div>
          <p className="app-eyebrow">Maintenance operations</p>
          <h1>Requests, vendors & closure</h1>
          <p>Move work from tenant signal to verified completion inside one tenant boundary.</p>
        </div>
        <span className="readiness-badge">{open.length} open</span>
      </section>

      {error ? <p className="app-error-banner">{error}</p> : null}

      <section className="portfolio-metrics" aria-label="Maintenance metrics">
        <article>
          <span className="metric-label">Open</span>
          <strong>{open.length}</strong>
          <small>Not closed</small>
        </article>
        <article>
          <span className="metric-label">Emergency</span>
          <strong>{emergency}</strong>
          <small>Immediate attention</small>
        </article>
        <article>
          <span className="metric-label">Vendors</span>
          <strong>
            {new Set(open.map((item) => item.assignedVendorEmail).filter(Boolean)).size}
          </strong>
          <small>Assigned active work</small>
        </article>
      </section>

      <section className="leasing-grid">
        <form className="portfolio-form unit-create-form" onSubmit={create}>
          <div>
            <p className="app-eyebrow">Intake</p>
            <h2>Create request</h2>
          </div>
          <label className="identity-field">
            <span>Location</span>
            <select name="location" required>
              <option value="">Select location</option>
              {data.properties.flatMap((property) => [
                <option key={property.id} value={`${property.id}|`}>
                  {property.name}
                </option>,
                ...property.units.map((unit) => (
                  <option key={unit.id} value={`${property.id}|${unit.id}`}>
                    {property.name} · {unit.label}
                  </option>
                )),
              ])}
            </select>
          </label>
          <label className="identity-field">
            <span>Tenant · optional</span>
            <select name="tenantProfileId">
              <option value="">Manager-created request</option>
              {data.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.label} · {tenant.email}
                </option>
              ))}
            </select>
          </label>
          <label className="identity-field">
            <span>Priority</span>
            <select name="priority" defaultValue="NORMAL">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </label>
          <label className="identity-field">
            <span>Title</span>
            <input name="title" minLength={3} maxLength={160} required />
          </label>
          <label className="identity-field">
            <span>Description</span>
            <textarea name="description" minLength={10} maxLength={2000} required />
          </label>
          <button className="identity-submit" type="submit" disabled={busy}>
            Submit request <span>→</span>
          </button>
        </form>

        <div className="unit-inventory maintenance-board">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Operational queue</p>
              <h2>Requests</h2>
            </div>
            <strong>{data.requests.length}</strong>
          </div>
          {data.requests.length === 0 ? (
            <p className="rent-ledger-rule">No maintenance requests yet.</p>
          ) : (
            data.requests.map((item) => (
              <article className="maintenance-card" key={item.id}>
                <div>
                  <span className={`maintenance-priority priority-${item.priority.toLowerCase()}`}>
                    {item.priority}
                  </span>
                  <h3>{item.title}</h3>
                  <p>
                    {item.propertyName}
                    {item.unitCode ? ` · Unit ${item.unitCode}` : ""}
                  </p>
                  <small>
                    {item.tenantName ?? "Manager request"} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                  </small>
                </div>
                <p>{item.description}</p>
                <div className="maintenance-state-row">
                  <strong>{item.status}</strong>
                  {item.assignedVendorName ? (
                    <span className="maintenance-vendor">{item.assignedVendorName}</span>
                  ) : null}
                </div>
                <div className="maintenance-actions">
                  {item.status === "SUBMITTED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(item, "triage")}
                    >
                      Triage
                    </button>
                  ) : null}
                  {["SUBMITTED", "TRIAGED"].includes(item.status) ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(item, "assign")}
                    >
                      Assign
                    </button>
                  ) : null}
                  {["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(item.status) ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(item, "complete")}
                    >
                      Complete
                    </button>
                  ) : null}
                  {item.status === "COMPLETED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(item, "verify")}
                    >
                      Verify
                    </button>
                  ) : null}
                  {item.status === "VERIFIED" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(item, "close")}
                    >
                      Close
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}
