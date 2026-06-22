"use client";

import { useParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "../../../../components/app-shell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface PortfolioSnapshot {
  organization: {
    id: string;
    displayName: string;
    slug: string | null;
    status: string;
    version: number;
  };
  properties: Array<{
    id: string;
    name: string;
    propertyType: string;
    status: string;
    city: string;
    stateCode: string;
    unitCount: number;
    availableUnitCount: number;
  }>;
  onboardingState: string;
}

const timeZones = [
  ["America/New_York", "Eastern Time"],
  ["America/Chicago", "Central Time"],
  ["America/Denver", "Mountain Time"],
  ["America/Phoenix", "Arizona Time"],
  ["America/Los_Angeles", "Pacific Time"],
  ["America/Anchorage", "Alaska Time"],
  ["Pacific/Honolulu", "Hawaii Time"],
] as const;

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export default function PortfolioPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());

  const loadPortfolio = useCallback(async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/organizations/${organizationId}/portfolio`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = (await response.json()) as PortfolioSnapshot & { title?: string };
      if (!response.ok) throw new Error(payload.title ?? "Portfolio could not be loaded.");
      setSnapshot(payload);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Portfolio could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  async function createFoundation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = csrfToken();
    if (!token) {
      setError("Your secure session expired. Verify your identity again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/portfolio/foundation`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey.current,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({
            propertyName: form.get("propertyName"),
            propertyType: form.get("propertyType"),
            address: {
              line1: form.get("line1"),
              line2: form.get("line2") || undefined,
              city: form.get("city"),
              stateCode: form.get("stateCode"),
              postalCode: form.get("postalCode"),
              countryCode: "US",
            },
            timeZone: form.get("timeZone"),
            unitCode: form.get("unitCode"),
          }),
        },
      );
      const payload = (await response.json()) as { title?: string; message?: string | string[] };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Property and unit could not be created.");
      }
      await loadPortfolio();
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : "Property and unit could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span className="identity-progress-mark" />
        <p>Loading authorized portfolio…</p>
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="app-error-state">
        <p>{error ?? "Portfolio is unavailable."}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadPortfolio();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const totalUnits = snapshot.properties.reduce((sum, property) => sum + property.unitCount, 0);
  const availableUnits = snapshot.properties.reduce(
    (sum, property) => sum + property.availableUnitCount,
    0,
  );

  return (
    <AppShell
      organizationId={organizationId}
      organizationName={snapshot.organization.displayName}
      workspaceSlug={snapshot.organization.slug}
    >
      <section className="portfolio-heading">
        <div>
          <p className="app-eyebrow">Portfolio system of record</p>
          <h1>Properties</h1>
          <p>Physical structure, availability and operational context in one tenant boundary.</p>
        </div>
        {snapshot.properties.length > 0 ? (
          <span className="readiness-badge">Ready for review</span>
        ) : null}
      </section>

      <section className="portfolio-metrics" aria-label="Portfolio metrics">
        <article>
          <span className="metric-label">Properties</span>
          <strong>{snapshot.properties.length}</strong>
          <small>Active records</small>
        </article>
        <article>
          <span className="metric-label">Total units</span>
          <strong>{totalUnits}</strong>
          <small>Across portfolio</small>
        </article>
        <article>
          <span className="metric-label">Available</span>
          <strong>{availableUnits}</strong>
          <small>Derived from units</small>
        </article>
      </section>

      {snapshot.properties.length === 0 ? (
        <section className="portfolio-foundation-grid">
          <div className="portfolio-empty-copy">
            <span className="empty-orbit" aria-hidden="true">
              ◇
            </span>
            <p className="app-eyebrow">First operational record</p>
            <h2>Build your portfolio foundation.</h2>
            <p>
              A property and its first unit are committed together. If either fails, neither record
              exists.
            </p>
            <ul>
              <li>Structured US address</li>
              <li>Canonical property time zone</li>
              <li>Available unit created automatically</li>
            </ul>
          </div>
          <form className="portfolio-form" onSubmit={createFoundation} noValidate>
            <div className="form-section-title">
              <span className="form-step-number">01</span>
              <div>
                <strong>Property identity</strong>
                <small>Name and residential type</small>
              </div>
            </div>
            <div className="identity-field-grid">
              <label className="identity-field">
                <span>Property name</span>
                <input name="propertyName" minLength={2} maxLength={160} required />
              </label>
              <label className="identity-field">
                <span>Property type</span>
                <select name="propertyType" defaultValue="MULTIFAMILY">
                  <option value="SINGLE_FAMILY">Single family</option>
                  <option value="MULTIFAMILY">Multifamily</option>
                  <option value="APARTMENT_COMPLEX">Apartment complex</option>
                </select>
              </label>
            </div>
            <div className="form-section-title">
              <span className="form-step-number">02</span>
              <div>
                <strong>US address</strong>
                <small>Operational and legal location</small>
              </div>
            </div>
            <label className="identity-field">
              <span>Address line 1</span>
              <input name="line1" maxLength={160} autoComplete="address-line1" required />
            </label>
            <label className="identity-field">
              <span>Address line 2 · optional</span>
              <input name="line2" maxLength={160} autoComplete="address-line2" />
            </label>
            <div className="portfolio-address-grid">
              <label className="identity-field">
                <span>City</span>
                <input name="city" maxLength={100} autoComplete="address-level2" required />
              </label>
              <label className="identity-field">
                <span>State</span>
                <input
                  name="stateCode"
                  pattern="[A-Z]{2}"
                  minLength={2}
                  maxLength={2}
                  autoComplete="address-level1"
                  placeholder="TX"
                  required
                />
              </label>
              <label className="identity-field">
                <span>ZIP code</span>
                <input
                  name="postalCode"
                  pattern="[0-9]{5}(-[0-9]{4})?"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  required
                />
              </label>
            </div>
            <label className="identity-field">
              <span>Property time zone</span>
              <select name="timeZone" defaultValue="America/Chicago">
                {timeZones.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} · {value}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-section-title">
              <span className="form-step-number">03</span>
              <div>
                <strong>First unit</strong>
                <small>Availability starts from a real unit</small>
              </div>
            </div>
            <label className="identity-field">
              <span>Unit name or number</span>
              <input name="unitCode" maxLength={80} placeholder="101 or Main House" required />
            </label>
            {error ? (
              <p className="identity-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="identity-submit" type="submit" disabled={submitting}>
              {submitting ? "Creating atomic foundation…" : "Create property and first unit"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </section>
      ) : (
        <section className="property-grid">
          {snapshot.properties.map((property) => (
            <article className="property-card" key={property.id}>
              <div className="property-visual">
                <span className="property-icon">
                  {property.propertyType === "SINGLE_FAMILY" ? "⌂" : "▦"}
                </span>
                <em>{property.status}</em>
              </div>
              <div className="property-card-body">
                <p>
                  {property.city}, {property.stateCode}
                </p>
                <h2>{property.name}</h2>
                <div>
                  <span>
                    <strong>{property.unitCount}</strong> units
                  </span>
                  <span>
                    <strong>{property.availableUnitCount}</strong> available
                  </span>
                </div>
              </div>
            </article>
          ))}
          <article className="readiness-card">
            <p className="app-eyebrow">Onboarding state</p>
            <h2>Portfolio foundation complete.</h2>
            <p>
              The server reports {snapshot.onboardingState}. Readiness review and workspace
              activation come next.
            </p>
            <button type="button" disabled>
              Review readiness →
            </button>
          </article>
        </section>
      )}
    </AppShell>
  );
}
