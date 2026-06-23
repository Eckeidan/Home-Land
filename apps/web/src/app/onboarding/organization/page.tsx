"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const usStates = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
] as const;

type SubmissionState = "idle" | "submitting" | "success" | "error";

interface OrganizationCreated {
  organization: { id: string; displayName: string; status: string; version: number };
  membershipRole: "OWNER";
  onboarding: { state: string; nextAction: string };
  primaryStateCode?: string;
}

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export default function OrganizationPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OrganizationCreated | null>(null);
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    const token = csrfToken();
    if (!token) {
      setError("Your verified session is missing or expired. Verify your email again.");
      setState("error");
      return;
    }

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiBaseUrl}/organizations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          legalName: form.get("legalName"),
          displayName: form.get("displayName"),
          organizationType: form.get("organizationType"),
          primaryStateCode: form.get("primaryStateCode"),
          approximateUnitRange: form.get("approximateUnitRange"),
        }),
      });
      const payload = (await response.json()) as OrganizationCreated & {
        message?: string | string[];
        title?: string;
      };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Organization could not be created.");
      }
      window.localStorage.setItem("thl_last_organization_id", payload.organization.id);
      setCreated({ ...payload, primaryStateCode: String(form.get("primaryStateCode") ?? "") });
      setState("success");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Organization could not be created.",
      );
      setState("error");
    }
  }

  if (state === "success" && created) {
    return (
      <main className="identity-shell">
        <section
          className="identity-card identity-success"
          aria-labelledby="organization-created-title"
        >
          <span className="identity-success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="identity-eyebrow">Owner workspace established</p>
          <h1 id="organization-created-title">{created.organization.displayName} is secured.</h1>
          <p>
            The organization, OWNER membership, onboarding state, audit event, and outbox message
            were committed as one transaction.
          </p>
          <dl className="organization-result">
            <div>
              <dt>Role</dt>
              <dd>{created.membershipRole}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{created.organization.status}</dd>
            </div>
            <div>
              <dt>Next</dt>
              <dd>Configure workspace</dd>
            </div>
          </dl>
          <Link
            className="identity-primary-link"
            href={`/onboarding/workspace/${created.organization.id}?version=${created.organization.version}&state=${created.primaryStateCode ?? "NY"}`}
          >
            Configure workspace <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro" aria-labelledby="organization-title">
        <Link className="identity-brand" href="/">
          The Home Land
        </Link>
        <p className="identity-eyebrow">Verified owner · Step 3 of 8</p>
        <h1 id="organization-title">Establish your operating entity.</h1>
        <p>
          This creates the permanent tenant boundary for your portfolio. You become its first
          accountable OWNER; workspace settings remain a separate controlled transition.
        </p>
        <ul className="identity-trust-list">
          <li>
            <span>01</span> Atomic ownership creation
          </li>
          <li>
            <span>02</span> Retry-safe command
          </li>
          <li>
            <span>03</span> Audited tenant boundary
          </li>
        </ul>
      </section>

      <form className="identity-card" onSubmit={submit} noValidate>
        <div className="identity-card-heading">
          <p className="identity-eyebrow">Organization foundation</p>
          <h2>Your US operation</h2>
          <p>Use the legal entity name where available. You can refine branding later.</p>
        </div>
        <label className="identity-field">
          <span>Legal name</span>
          <input name="legalName" type="text" minLength={2} maxLength={200} required />
        </label>
        <label className="identity-field">
          <span>Display name</span>
          <input name="displayName" type="text" minLength={2} maxLength={120} required />
        </label>
        <div className="identity-field-grid">
          <label className="identity-field">
            <span>Organization type</span>
            <select name="organizationType" defaultValue="" required>
              <option value="" disabled>
                Select type
              </option>
              <option value="INDIVIDUAL_LANDLORD">Individual landlord</option>
              <option value="PROPERTY_MANAGEMENT_COMPANY">Property management company</option>
              <option value="REAL_ESTATE_AGENCY">Real estate agency</option>
              <option value="INVESTMENT_GROUP">Investment group</option>
            </select>
          </label>
          <label className="identity-field">
            <span>Primary state</span>
            <select name="primaryStateCode" defaultValue="" required>
              <option value="" disabled>
                Select state
              </option>
              {usStates.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="identity-field">
          <span>Approximate portfolio size</span>
          <select name="approximateUnitRange" defaultValue="" required>
            <option value="" disabled>
              Select range
            </option>
            <option value="ONE_TO_NINE">1–9 units</option>
            <option value="TEN_TO_NINETY_NINE">10–99 units</option>
            <option value="ONE_HUNDRED_TO_FIVE_HUNDRED">100–500 units</option>
            <option value="FIVE_HUNDRED_TO_FIVE_THOUSAND">500–5,000 units</option>
            <option value="OVER_FIVE_THOUSAND">More than 5,000 units</option>
          </select>
        </label>
        <p className="identity-help">
          Portfolio size is segmentation metadata, never an access or plan limit.
        </p>
        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="identity-submit" type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Establishing organization…" : "Create secure organization"}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </main>
  );
}
