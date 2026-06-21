"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const timeZones = [
  ["America/New_York", "Eastern Time"],
  ["America/Chicago", "Central Time"],
  ["America/Denver", "Mountain Time"],
  ["America/Phoenix", "Arizona Time"],
  ["America/Los_Angeles", "Pacific Time"],
  ["America/Anchorage", "Alaska Time"],
  ["Pacific/Honolulu", "Hawaii Time"],
] as const;

const centralStates = new Set([
  "AL",
  "AR",
  "IA",
  "IL",
  "KS",
  "LA",
  "MN",
  "MO",
  "MS",
  "ND",
  "NE",
  "OK",
  "SD",
  "TN",
  "TX",
  "WI",
]);
const mountainStates = new Set(["CO", "ID", "MT", "NM", "UT", "WY"]);
const pacificStates = new Set(["CA", "NV", "OR", "WA"]);

type SubmissionState = "idle" | "submitting" | "success" | "error";

interface WorkspaceConfigured {
  id: string;
  displayName: string;
  slug: string;
  status: "ONBOARDING";
  version: number;
}

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function inferredTimeZone(state: string): string {
  if (state === "AK") return "America/Anchorage";
  if (state === "HI") return "Pacific/Honolulu";
  if (state === "AZ") return "America/Phoenix";
  if (pacificStates.has(state)) return "America/Los_Angeles";
  if (mountainStates.has(state)) return "America/Denver";
  if (centralStates.has(state)) return "America/Chicago";
  return "America/New_York";
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export default function WorkspaceConfigurationPage() {
  const params = useParams<{ organizationId: string }>();
  const searchParams = useSearchParams();
  const expectedVersion = Number(searchParams.get("version") ?? "1");
  const initialTimeZone = useMemo(
    () => inferredTimeZone(searchParams.get("state") ?? "NY"),
    [searchParams],
  );
  const [slug, setSlug] = useState("");
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<WorkspaceConfigured | null>(null);

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
      const response = await fetch(
        `${apiBaseUrl}/organizations/${params.organizationId}/workspace`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "If-Match": `"${expectedVersion}"`,
            "X-CSRF-Token": token,
          },
          body: JSON.stringify({
            slug,
            timeZone: form.get("timeZone"),
            locale: "en-US",
          }),
        },
      );
      const payload = (await response.json()) as WorkspaceConfigured & {
        code?: string;
        message?: string | string[];
        title?: string;
      };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Workspace configuration could not be saved.");
      }
      setConfigured(payload);
      setState("success");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Workspace configuration could not be saved.",
      );
      setState("error");
    }
  }

  if (state === "success" && configured) {
    return (
      <main className="identity-shell">
        <section className="identity-card identity-success" aria-labelledby="workspace-ready-title">
          <span className="identity-success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="identity-eyebrow">Workspace configured</p>
          <h1 id="workspace-ready-title">{configured.displayName} has its address.</h1>
          <p>
            The slug, regional settings, organization version and onboarding state were committed
            together. The workspace is now ready for OWNER MFA enrollment.
          </p>
          <dl className="organization-result">
            <div>
              <dt>Workspace</dt>
              <dd>{configured.slug}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{configured.version}</dd>
            </div>
            <div>
              <dt>Next</dt>
              <dd>Secure account</dd>
            </div>
          </dl>
          <Link
            className="identity-primary-link"
            href={`/onboarding/mfa?organizationId=${configured.id}`}
          >
            Secure owner account <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro" aria-labelledby="workspace-title">
        <Link className="identity-brand" href="/">
          The Home Land
        </Link>
        <p className="identity-eyebrow">Owner workspace · Step 4 of 8</p>
        <h1 id="workspace-title">Give your operation a stable address.</h1>
        <p>
          Your slug becomes the durable workspace identifier. Regional settings establish the time
          semantics used later by leases, rent operations and maintenance SLAs.
        </p>
        <ul className="identity-trust-list">
          <li>
            <span>01</span> Globally unique workspace slug
          </li>
          <li>
            <span>02</span> Canonical IANA time zone
          </li>
          <li>
            <span>03</span> Version-protected transition
          </li>
        </ul>
      </section>

      <form className="identity-card" onSubmit={submit} noValidate>
        <div className="identity-card-heading">
          <p className="identity-eyebrow">Regional foundation</p>
          <h2>Workspace settings</h2>
          <p>
            Review the inferred time zone before saving. Multi-zone states may require adjustment.
          </p>
        </div>
        <label className="identity-field">
          <span>Workspace slug</span>
          <input
            name="slug"
            type="text"
            value={slug}
            onChange={(event) => setSlug(normalizeSlug(event.target.value))}
            minLength={3}
            maxLength={48}
            pattern="[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])?"
            autoComplete="off"
            required
          />
        </label>
        <p className="workspace-slug-preview">
          {slug ? `${slug}.thehomeland.app` : "your-workspace.thehomeland.app"}
        </p>
        <label className="identity-field">
          <span>Operational time zone</span>
          <select name="timeZone" defaultValue={initialTimeZone} required>
            {timeZones.map(([value, label]) => (
              <option key={value} value={value}>
                {label} · {value}
              </option>
            ))}
          </select>
        </label>
        <label className="identity-field">
          <span>Workspace language</span>
          <select name="locale" value="en-US" disabled>
            <option value="en-US">English (United States)</option>
          </select>
        </label>
        <p className="identity-help">
          English is the MVP language. The data model remains locale-ready.
        </p>
        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="identity-submit"
          type="submit"
          disabled={state === "submitting" || slug.length < 3}
        >
          {state === "submitting" ? "Securing workspace settings…" : "Configure workspace"}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </main>
  );
}
