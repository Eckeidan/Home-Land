"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard.css";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type Portfolio = {
  organization: { displayName: string; slug: string | null };
  properties: Array<{ id?: string; name?: string; unitCount: number; occupiedUnits: number }>;
};

type Leasing = {
  tenants: Array<{ id?: string; status?: string }>;
  leases: Array<{ id?: string; tenantName?: string; unitCode?: string; status: string }>;
};

type Rent = {
  obligations: Array<{
    id?: string;
    tenantName?: string;
    unitCode?: string;
    amountMinor?: number;
    outstandingMinor: number;
    status: string;
  }>;
  reconciliationItems: Array<{ id?: string; kind?: string }>;
};

type Maintenance = {
  requests: Array<{ id?: string; title?: string; priority: string; status: string }>;
};

type DashboardData = {
  portfolio: Portfolio;
  leasing: Leasing;
  rent: Rent;
  maintenance: Maintenance;
};

async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  const body = await response.json().catch(() => null);

  if (!response.ok) throw new Error(body?.title ?? body?.message ?? "Request failed");

  return body as T;
}

function usd(minor: number) {
  return `$${(minor / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const revenueTrend = [
  ["Jul", 36],
  ["Aug", 44],
  ["Sep", 39],
  ["Oct", 47],
  ["Nov", 58],
  ["Dec", 52],
  ["Jan", 64],
  ["Feb", 68],
  ["Mar", 83],
  ["Apr", 76],
  ["May", 88],
  ["Jun", 92],
] as const;

const heatMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

const heatRows = [
  ["Sunset Apartments", "24", ["good", "good", "good", "good", "good", "warn"]],
  ["Maple Grove Homes", "18", ["good", "good", "good", "good", "good", "good"]],
  ["Riverside Condos", "32", ["good", "good", "good", "good", "bad", "good"]],
  ["Hillview Townhomes", "16", ["good", "warn", "good", "good", "good", "good"]],
  ["Bayside Villas", "20", ["good", "good", "good", "good", "good", "good"]],
] as const;

const tasks = [
  "Review rent exceptions",
  "Approve lease renewal",
  "Check maintenance SLA",
  "Invite new tenant",
  "Review Stripe reconciliation",
] as const;

export default function DashboardPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    setBusy(true);

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
      setError(reason instanceof Error ? reason.message : "Dashboard API unavailable.");
    } finally {
      setBusy(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const model = useMemo(() => {
    if (!data) return null;

    const totalUnits = data.portfolio.properties.reduce(
      (sum, property) => sum + Number(property.unitCount ?? 0),
      0,
    );

    const occupiedUnits = data.portfolio.properties.reduce(
      (sum, property) => sum + Number(property.occupiedUnits ?? 0),
      0,
    );

    const occupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 1000) / 10 : 0;

    const openRentMinor = data.rent.obligations
      .filter((item) => ["OPEN", "PARTIALLY_PAID"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.outstandingMinor ?? 0), 0);

    const expectedRent = data.rent.obligations.reduce(
      (sum, item) => sum + Number(item.amountMinor ?? item.outstandingMinor ?? 0),
      0,
    );

    const rentCollection =
      expectedRent > 0
        ? Math.round(((expectedRent - openRentMinor) / expectedRent) * 1000) / 10
        : 98.3;

    const activeLeases = data.leasing.leases.filter((lease) => lease.status === "ACTIVE").length;

    const openMaintenance = data.maintenance.requests.filter(
      (request) => !["COMPLETED", "VERIFIED", "CLOSED", "CANCELLED"].includes(request.status),
    ).length;

    const emergency = data.maintenance.requests.filter(
      (request) => request.priority === "EMERGENCY",
    ).length;

    const aiScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            data.rent.reconciliationItems.length * 7 -
            data.rent.obligations.filter((item) => item.outstandingMinor > 0).length * 4 -
            emergency * 12,
        ),
      ),
    );

    return {
      totalUnits,
      occupiedUnits,
      occupancy,
      openRentMinor,
      rentCollection,
      activeLeases,
      openMaintenance,
      emergency,
      aiScore,
    };
  }, [data]);

  if (busy) {
    return (
      <section className="dashboard-state">
        <strong>Loading Asset Hub dashboard...</strong>
        <span>Connecting portfolio, leasing, rent, and maintenance data.</span>
      </section>
    );
  }

  if (error || !data || !model) {
    return (
      <section className="dashboard-state error">
        <strong>Dashboard unavailable</strong>
        <span>{error ?? "No dashboard data."}</span>
        <button type="button" onClick={() => void load()}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="dashboard-head">
        <div>
          <p>Real estate command center</p>
          <h1>Good morning, Chris 👋</h1>
          <span>
            Here’s what’s happening with <strong>{data.portfolio.organization.displayName}</strong>{" "}
            today.
          </span>
        </div>

        <div className="dashboard-actions">
          <Link href={`/app/${organizationId}/portfolio`}>Add property</Link>
          <Link href={`/app/${organizationId}/leasing`}>Create lease</Link>
          <Link href={`/app/${organizationId}/settings`}>Settings</Link>
        </div>
      </section>

      <section className="kpi-grid">
        <article>
          <i>🏢</i>
          <span>Portfolio Value</span>
          <strong>$3.42M</strong>
          <small>↑ 12.4% vs last month</small>
        </article>

        <article>
          <i>👥</i>
          <span>Occupancy Rate</span>
          <strong>{model.occupancy}%</strong>
          <small>
            {model.occupiedUnits}/{model.totalUnits} units occupied
          </small>
        </article>

        <article>
          <i>$</i>
          <span>Open Rent</span>
          <strong>{usd(model.openRentMinor)}</strong>
          <small>{data.rent.reconciliationItems.length} exception(s)</small>
        </article>

        <article>
          <i>📄</i>
          <span>Active Leases</span>
          <strong>{model.activeLeases}</strong>
          <small>{data.leasing.tenants.length} tenant profile(s)</small>
        </article>

        <article>
          <i>🔧</i>
          <span>Maintenance SLA</span>
          <strong>{model.openMaintenance}</strong>
          <small>{model.emergency} emergency signal(s)</small>
        </article>

        <article className="ai">
          <i>✦</i>
          <span>AI Portfolio Score</span>
          <strong>{model.aiScore}</strong>
          <small>{model.aiScore >= 85 ? "Excellent" : "Needs attention"}</small>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dash-card revenue-card">
          <div className="card-head">
            <div>
              <h2>Revenue Trend</h2>
              <p>Projected collection trend across active leases.</p>
            </div>
            <strong>$702,450</strong>
          </div>

          <div className="bar-chart">
            {revenueTrend.map(([month, value]) => (
              <div key={month}>
                <span style={{ height: `${value}%` }} />
                <small>{month}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="dash-card rent-card">
          <div className="card-head compact">
            <div>
              <h2>Rent Collection</h2>
              <p>Current period</p>
            </div>
          </div>

          <div className="donut">
            <b>{model.rentCollection}%</b>
            <span>collected</span>
          </div>

          <ul className="legend">
            <li>
              <i className="good" /> Collected
            </li>
            <li>
              <i className="warn" /> Pending
            </li>
            <li>
              <i className="bad" /> Overdue
            </li>
          </ul>
        </article>

        <article className="dash-card tasks-card">
          <div className="card-head compact">
            <div>
              <h2>Today’s Tasks</h2>
              <p>Operational queue</p>
            </div>
            <strong>{tasks.length}</strong>
          </div>

          <div className="task-list">
            {tasks.map((task) => (
              <label key={task}>
                <input type="checkbox" />
                <span>{task}</span>
              </label>
            ))}
          </div>

          <Link href={`/app/${organizationId}/settings`}>Configure notifications →</Link>
        </article>

        <article className="dash-card heatmap-card">
          <div className="card-head">
            <div>
              <h2>Occupancy Heat Map</h2>
              <p>Property occupancy status by month.</p>
            </div>
          </div>

          <table className="heat-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Units</th>
                {heatMonths.map((month) => (
                  <th key={month}>{month}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {heatRows.map(([property, units, cells]) => (
                <tr key={property}>
                  <td>{property}</td>
                  <td>{units}</td>
                  {heatMonths.map((month, index) => (
                    <td key={`${property}-${month}`}>
                      <i className={cells[index]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="dash-card pipeline-card">
          <div className="card-head compact">
            <div>
              <h2>Maintenance Pipeline</h2>
              <p>Work order lifecycle</p>
            </div>
          </div>

          {[
            [
              "Submitted",
              86,
              data.maintenance.requests.filter((x) => x.status === "SUBMITTED").length,
            ],
            [
              "Assigned",
              58,
              data.maintenance.requests.filter((x) => x.status === "ASSIGNED").length,
            ],
            [
              "In Progress",
              42,
              data.maintenance.requests.filter((x) => x.status === "IN_PROGRESS").length,
            ],
            ["Closed", 76, data.maintenance.requests.filter((x) => x.status === "CLOSED").length],
          ].map(([label, width, count]) => (
            <div className="progress-row" key={label}>
              <span>{label}</span>
              <b>
                <i style={{ width: `${width}%` }} />
              </b>
              <strong>{count}</strong>
            </div>
          ))}
        </article>

        <article className="dash-card insights-card">
          <div className="card-head compact">
            <div>
              <h2>AI Insights</h2>
              <p>Decision signals</p>
            </div>
            <strong>{model.aiScore}</strong>
          </div>

          <div className="insights-list">
            <p>
              ✦{" "}
              {model.aiScore >= 85
                ? "Portfolio is operationally healthy."
                : "Portfolio needs attention."}
            </p>
            <p>✦ {data.rent.reconciliationItems.length} financial exception(s) require review.</p>
            <p>✦ {model.emergency} emergency maintenance signal(s).</p>
            <p>✦ Occupancy is {model.occupancy >= 94 ? "above target." : "below target."}</p>
          </div>
        </article>
      </section>
    </>
  );
}
