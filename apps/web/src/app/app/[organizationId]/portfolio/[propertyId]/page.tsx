"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface PropertyWorkspace {
  organization: { id: string; displayName: string; slug: string | null };
  property: {
    id: string;
    name: string;
    propertyType: string;
    status: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    stateCode: string;
    postalCode: string;
    timeZone: string;
  };
  buildings: Array<{ id: string; name: string; unitCount: number }>;
  units: Array<{
    id: string;
    unitCode: string;
    status: string;
    bedrooms: number | null;
    bathrooms: string | null;
    buildingId: string | null;
    buildingName: string | null;
  }>;
}

interface ImportReport {
  mode: "DRY_RUN" | "COMMIT";
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdCount: number;
  errors: Array<{ rowNumber: number; code: string; field: string }>;
}

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export default function PropertyWorkspacePage() {
  const { organizationId, propertyId } = useParams<{
    organizationId: string;
    propertyId: string;
  }>();
  const [workspace, setWorkspace] = useState<PropertyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csv, setCsv] = useState("unit_code,building_name,bedrooms,bathrooms\n");
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const requestKey = useRef(crypto.randomUUID());
  const buildingKey = useRef(crypto.randomUUID());
  const importKey = useRef(crypto.randomUUID());

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/properties/${propertyId}`,
        { credentials: "include", cache: "no-store" },
      );
      const payload = (await response.json()) as PropertyWorkspace & { title?: string };
      if (!response.ok) throw new Error(payload.title ?? "Property could not be loaded.");
      setWorkspace(payload);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Property could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrfToken();
    if (!token) {
      setError("Your secure session expired.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const bedrooms = form.get("bedrooms");
    const bathrooms = form.get("bathrooms");
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/properties/${propertyId}/units`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey.current,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({
            unitCode: form.get("unitCode"),
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
            bathrooms: bathrooms ? Number(bathrooms) : undefined,
            buildingId: form.get("buildingId") || undefined,
          }),
        },
      );
      const payload = (await response.json()) as { title?: string; message?: string | string[] };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Unit could not be created.");
      }
      requestKey.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (creationError) {
      setError(
        creationError instanceof Error ? creationError.message : "Unit could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function addBuilding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrfToken();
    if (!token) return setError("Your secure session expired.");
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/properties/${propertyId}/buildings`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": buildingKey.current,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({ name: form.get("name") }),
        },
      );
      const payload = (await response.json()) as { title?: string };
      if (!response.ok) throw new Error(payload.title ?? "Building could not be created.");
      buildingKey.current = crypto.randomUUID();
      event.currentTarget.reset();
      await load();
    } catch (buildingError) {
      setError(
        buildingError instanceof Error ? buildingError.message : "Building could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function runImport(mode: "DRY_RUN" | "COMMIT") {
    const token = csrfToken();
    if (!token) return setError("Your secure session expired.");
    setImporting(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/properties/${propertyId}/units/import`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(mode === "COMMIT" ? { "Idempotency-Key": importKey.current } : {}),
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({ mode, csv }),
        },
      );
      const payload = (await response.json()) as ImportReport & { title?: string };
      if (!response.ok) throw new Error(payload.title ?? "CSV could not be processed.");
      setImportReport(payload);
      if (mode === "COMMIT" && payload.createdCount > 0) {
        importKey.current = crypto.randomUUID();
        await load();
      }
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "CSV could not be processed.");
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <div className="app-loading">Loading property workspace…</div>;
  if (!workspace) {
    return (
      <div className="app-error-state">
        <p>{error ?? "Property is unavailable."}</p>
        <button type="button" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <Link className="property-back-link" href={`/app/${organizationId}/portfolio`}>
        ← Portfolio
      </Link>
      <section className="property-workspace-heading">
        <div>
          <p className="app-eyebrow">Property workspace</p>
          <h1>{workspace.property.name}</h1>
          <p>
            {workspace.property.addressLine1}, {workspace.property.city},{" "}
            {workspace.property.stateCode} {workspace.property.postalCode}
          </p>
        </div>
        <span className="readiness-badge">{workspace.property.status}</span>
      </section>

      <section className="property-workspace-grid">
        <div className="unit-inventory">
          <div className="unit-inventory-heading">
            <div>
              <p className="app-eyebrow">Inventory</p>
              <h2>Units</h2>
            </div>
            <strong>{workspace.units.length}</strong>
          </div>
          {workspace.units.map((unit) => (
            <article className="unit-row" key={unit.id}>
              <span className="unit-mark">{unit.unitCode.slice(0, 2).toUpperCase()}</span>
              <div>
                <h3>Unit {unit.unitCode}</h3>
                <p>
                  {unit.bedrooms ?? "—"} bed · {unit.bathrooms ?? "—"} bath
                  {unit.buildingName ? ` · ${unit.buildingName}` : ""}
                </p>
              </div>
              <em>{unit.status}</em>
            </article>
          ))}
        </div>

        <div className="property-actions-stack">
          <form className="portfolio-form unit-create-form" onSubmit={addBuilding} noValidate>
            <div>
              <p className="app-eyebrow">Optional structure</p>
              <h2>Add a building</h2>
            </div>
            <label className="identity-field">
              <span>Building name</span>
              <input name="name" maxLength={120} required />
            </label>
            <button className="identity-submit" type="submit" disabled={submitting}>
              Create building <span aria-hidden="true">→</span>
            </button>
          </form>

          <form className="portfolio-form unit-create-form" onSubmit={addUnit} noValidate>
            <div>
              <p className="app-eyebrow">Expand inventory</p>
              <h2>Add a unit</h2>
            </div>
            <label className="identity-field">
              <span>Unit name or number</span>
              <input name="unitCode" maxLength={80} required />
            </label>
            <label className="identity-field">
              <span>Building · optional</span>
              <select name="buildingId" defaultValue="">
                <option value="">No building</option>
                {workspace.buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="identity-field-grid">
              <label className="identity-field">
                <span>Bedrooms</span>
                <input name="bedrooms" type="number" min="0" max="20" step="1" />
              </label>
              <label className="identity-field">
                <span>Bathrooms</span>
                <input name="bathrooms" type="number" min="0" max="20" step="0.5" />
              </label>
            </div>
            <button className="identity-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create available unit"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>

      <section className="csv-import-panel">
        <div>
          <p className="app-eyebrow">Repeat-safe bulk operation</p>
          <h2>Import units from CSV</h2>
          <p>Required header: unit_code,building_name,bedrooms,bathrooms. Maximum 500 rows.</p>
        </div>
        <textarea
          value={csv}
          onChange={(event) => {
            setCsv(event.target.value);
            setImportReport(null);
          }}
          spellCheck={false}
          aria-label="Units CSV"
        />
        <div className="csv-import-actions">
          <button type="button" disabled={importing} onClick={() => void runImport("DRY_RUN")}>
            Validate dry run
          </button>
          <button
            type="button"
            disabled={importing || importReport?.errorRows !== 0}
            onClick={() => void runImport("COMMIT")}
          >
            Commit valid import
          </button>
        </div>
        {importReport ? (
          <p className="csv-report">
            {importReport.validRows} valid · {importReport.errorRows} errors ·{" "}
            {importReport.createdCount} created
          </p>
        ) : null}
        {importReport?.errors.map((item) => (
          <p className="identity-error" key={`${item.rowNumber}-${item.code}`}>
            Row {item.rowNumber}: {item.code}
          </p>
        ))}
        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </>
  );
}
