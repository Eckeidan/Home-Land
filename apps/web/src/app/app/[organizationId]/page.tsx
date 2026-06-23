"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "../../../components/app-shell";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type Portfolio = {
  organization: { displayName: string; slug: string | null; status: string };
  properties: Array<{ id: string; name: string; unitCount: number; availableUnitCount: number }>;
};
type Leasing = {
  tenants: unknown[];
  leases: Array<{
    status: string;
    tenantName?: string;
    unitCode?: string;
    startDate?: string;
    endDate?: string;
  }>;
};
type Rent = {
  obligations: Array<{
    tenantName?: string;
    unitCode?: string;
    period?: string;
    dueDate?: string;
    outstandingMinor: number;
    status: string;
  }>;
  reconciliationItems: unknown[];
};
type Maintenance = {
  requests: Array<{
    title?: string;
    status: string;
    priority: string;
    propertyName?: string;
    unitCode?: string | null;
    createdAt?: string;
  }>;
};

type Overview = {
  portfolio: Portfolio;
  leasing: Leasing;
  rent: Rent;
  maintenance: Maintenance;
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.title ?? "Workspace unavailable.");
  return body as T;
}

export default function WorkspaceOverviewPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOrganizationId, setLastOrganizationId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [portfolio, leasing, rent, maintenance] = await Promise.all([
        loadJson<Portfolio>(`${api}/organizations/${organizationId}/portfolio`),
        loadJson<Leasing>(`${api}/organizations/${organizationId}/leasing`),
        loadJson<Rent>(`${api}/organizations/${organizationId}/rent`),
        loadJson<Maintenance>(`${api}/organizations/${organizationId}/maintenance`),
      ]);
      setData({ portfolio, leasing, rent, maintenance });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Workspace unavailable.");
    }
  }, [organizationId]);

  useEffect(() => {
    setLastOrganizationId(window.localStorage.getItem("thl_last_organization_id"));
    void load();
  }, [load]);

  if (!data) {
    const isPlaceholder = organizationId === "TON_ORGANIZATION_ID";
    return (
      <main className="identity-shell">
        <section className="identity-card identity-success">
          <span className="identity-error-mark" aria-hidden="true">
            !
          </span>
          <p className="identity-eyebrow">Workspace access</p>
          <h1>{isPlaceholder ? "Use a real workspace ID." : "Authentication required."}</h1>
          <p>
            {isPlaceholder
              ? "TON_ORGANIZATION_ID is only an example. Open the workspace created during onboarding."
              : (error ?? "Your secure session is missing or expired.")}
          </p>
          {lastOrganizationId ? (
            <Link className="identity-primary-link" href={`/app/${lastOrganizationId}`}>
              Open last workspace <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link className="identity-primary-link" href="/register">
              Start registration <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link className="identity-secondary-link" href="/onboarding/organization">
            Continue onboarding
          </Link>
        </section>
      </main>
    );
  }

  const properties = data.portfolio.properties.length;
  const units = data.portfolio.properties.reduce((sum, item) => sum + item.unitCount, 0);
  const activeLeases = data.leasing.leases.filter((lease) => lease.status === "ACTIVE").length;
  const openRentMinor = data.rent.obligations.reduce(
    (sum, item) => sum + Math.max(0, item.outstandingMinor),
    0,
  );
  const openMaintenance = data.maintenance.requests.filter(
    (item) => !["CLOSED", "CANCELLED"].includes(item.status),
  ).length;
  const emergencies = data.maintenance.requests.filter(
    (item) => item.priority === "EMERGENCY" && !["CLOSED", "CANCELLED"].includes(item.status),
  ).length;
  const priorityExceptions = [
    ...data.maintenance.requests
      .filter(
        (item) =>
          item.priority === "EMERGENCY" &&
          !["CLOSED", "CANCELLED", "VERIFIED"].includes(item.status),
      )
      .map((item) => ({
        label: item.title ?? "Emergency maintenance",
        detail: `${item.propertyName ?? "Property"}${item.unitCode ? ` · Unit ${item.unitCode}` : ""}`,
        tone: "critical" as const,
        href: `/app/${organizationId}/maintenance`,
      })),
    ...data.rent.obligations
      .filter((item) => item.outstandingMinor > 0)
      .slice(0, 3)
      .map((item) => ({
        label: `${item.tenantName ?? "Tenant"} · $${(item.outstandingMinor / 100).toFixed(2)} open`,
        detail: `Unit ${item.unitCode ?? "—"} · Due ${item.dueDate ?? item.period ?? "pending"}`,
        tone: "warning" as const,
        href: `/app/${organizationId}/rent`,
      })),
    ...data.rent.reconciliationItems.slice(0, 2).map((_, index) => ({
      label: "Reconciliation item requires review",
      detail: `Financial exception #${index + 1}`,
      tone: "warning" as const,
      href: `/app/${organizationId}/rent`,
    })),
  ].slice(0, 6);
  const recentActivity = [
    ...data.maintenance.requests.slice(0, 4).map((item) => ({
      label: item.title ?? "Maintenance request",
      detail: `${item.status} · ${item.priority}`,
      href: `/app/${organizationId}/maintenance`,
    })),
    ...data.rent.obligations.slice(0, 4).map((item) => ({
      label: `${item.tenantName ?? "Tenant"} rent obligation`,
      detail: `${item.status} · $${(item.outstandingMinor / 100).toFixed(2)} open`,
      href: `/app/${organizationId}/rent`,
    })),
    ...data.leasing.leases.slice(0, 4).map((lease) => ({
      label: `${lease.tenantName ?? "Lease"} ${lease.status.toLowerCase()}`,
      detail: lease.unitCode ? `Unit ${lease.unitCode}` : "Lease workflow",
      href: `/app/${organizationId}/leasing`,
    })),
  ].slice(0, 8);
  const operationalScore = Math.max(
    0,
    100 -
      emergencies * 18 -
      data.rent.reconciliationItems.length * 10 -
      data.rent.obligations.filter((item) => item.outstandingMinor > 0).length * 4,
  );

  return (
    <AppShell
      organizationId={organizationId}
      organizationName={data.portfolio.organization.displayName}
      workspaceSlug={data.portfolio.organization.slug}
      activeSection="Overview"
    >
      <section className="portfolio-heading">
        <div>
          <p className="app-eyebrow">Operational overview</p>
          <h1>Live workspace command surface</h1>
          <p>One view for portfolio, leasing, rent, and maintenance progress.</p>
        </div>
        <span className="readiness-badge">{data.portfolio.organization.status}</span>
      </section>

      <section className="portfolio-metrics" aria-label="Workspace metrics">
        <article>
          <span className="metric-label">Properties</span>
          <strong>{properties}</strong>
          <small>{units} units</small>
        </article>
        <article>
          <span className="metric-label">Active leases</span>
          <strong>{activeLeases}</strong>
          <small>{data.leasing.tenants.length} tenants</small>
        </article>
        <article>
          <span className="metric-label">Open rent</span>
          <strong>${(openRentMinor / 100).toFixed(2)}</strong>
          <small>{data.rent.reconciliationItems.length} exceptions</small>
        </article>
        <article>
          <span className="metric-label">Maintenance</span>
          <strong>{openMaintenance}</strong>
          <small>{emergencies} emergency</small>
        </article>
      </section>

      <section className="command-center-grid">
        <article className="command-hero-card">
          <div>
            <p className="app-eyebrow">Portfolio health</p>
            <h2>{operationalScore}</h2>
            <p>
              Derived from open rent, reconciliation exceptions, and emergency maintenance. This is
              a manager signal, not an automated decision.
            </p>
          </div>
          <div
            className="command-ring"
            style={{ "--score": `${operationalScore}%` } as CSSProperties}
          >
            <span className="command-ring-value">{operationalScore}%</span>
          </div>
        </article>

        <article className="command-panel">
          <div className="command-panel-heading">
            <p className="app-eyebrow">Priority exceptions</p>
            <strong>{priorityExceptions.length}</strong>
          </div>
          {priorityExceptions.length === 0 ? (
            <p className="command-empty">
              No critical exceptions in the current workspace snapshot.
            </p>
          ) : (
            priorityExceptions.map((item) => (
              <Link
                className={`command-exception is-${item.tone}`}
                href={item.href}
                key={`${item.label}-${item.detail}`}
              >
                <span className="command-exception-dot" />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </Link>
            ))
          )}
        </article>

        <article className="command-panel">
          <div className="command-panel-heading">
            <p className="app-eyebrow">Actions rapides</p>
            <strong>4</strong>
          </div>
          <div className="quick-action-grid">
            <Link href={`/app/${organizationId}/portfolio`}>Add units</Link>
            <Link href={`/app/${organizationId}/leasing`}>Create lease</Link>
            <Link href={`/app/${organizationId}/rent`}>Post rent</Link>
            <Link href={`/app/${organizationId}/maintenance`}>Open request</Link>
          </div>
        </article>

        <article className="command-panel command-activity">
          <div className="command-panel-heading">
            <p className="app-eyebrow">Recent activity</p>
            <strong>{recentActivity.length}</strong>
          </div>
          {recentActivity.length === 0 ? (
            <p className="command-empty">
              Activity will appear after portfolio, lease, rent, or maintenance actions.
            </p>
          ) : (
            recentActivity.map((item) => (
              <Link className="activity-row" href={item.href} key={`${item.label}-${item.detail}`}>
                <span className="activity-dot" />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
              </Link>
            ))
          )}
        </article>
      </section>
    </AppShell>
  );
}
