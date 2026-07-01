"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface Requirement {
  code: string;
  complete: boolean;
  actionPath?: string;
}

interface Readiness {
  ready: boolean;
  requirements: Requirement[];
  evaluatedAt: string;
  version: number;
}

const labels: Record<string, { title: string; detail: string }> = {
  EMAIL_VERIFIED: { title: "Verified identity", detail: "Owner email is confirmed and active." },
  ORGANIZATION_VALID: {
    title: "Workspace configuration",
    detail: "Slug, locale and time zone are valid.",
  },
  OWNER_MFA_ENABLED: {
    title: "Owner MFA",
    detail: "TOTP and recovery acknowledgement are confirmed.",
  },
  FIRST_PROPERTY_CREATED: {
    title: "First property",
    detail: "An active property exists in this organization.",
  },
  FIRST_UNIT_CREATED: {
    title: "First unit",
    detail: "A valid unit belongs to the organization property.",
  },
  TERMS_ACCEPTED: {
    title: "Current terms",
    detail: "The owner accepted the current terms version.",
  },
};

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export default function ReadinessReviewPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const router = useRouter();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activationKey = useRef(crypto.randomUUID());

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/onboarding/readiness`,
        { credentials: "include", cache: "no-store" },
      );
      const payload = (await response.json()) as Readiness & { title?: string };
      if (!response.ok) throw new Error(payload.title ?? "Readiness could not be evaluated.");
      setReadiness(payload);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Readiness could not be evaluated.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function activate() {
    if (!readiness) return;
    const token = csrfToken();
    if (!token) {
      setError("Your secure session expired. Sign in again before activation.");
      return;
    }
    setActivating(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiBaseUrl}/organizations/${organizationId}/onboarding/activate`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Idempotency-Key": activationKey.current,
            "If-Match": `"${readiness.version}"`,
            "X-CSRF-Token": token,
          },
        },
      );
      const payload = (await response.json()) as { nextPath?: string; title?: string };
      if (!response.ok) throw new Error(payload.title ?? "Workspace could not be activated.");
      router.replace(payload.nextPath ?? `/app/${organizationId}/portfolio`);
      router.refresh();
    } catch (activationError) {
      setError(
        activationError instanceof Error
          ? activationError.message
          : "Workspace could not be activated.",
      );
      await load();
    } finally {
      setActivating(false);
    }
  }

  if (loading) {
    return <div className="app-loading">Evaluating authoritative readiness…</div>;
  }
  if (!readiness) {
    return (
      <div className="app-error-state">
        <p>{error ?? "Readiness is unavailable."}</p>
        <button type="button" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="review-heading">
        <div>
          <p className="app-eyebrow">Final onboarding checkpoint</p>
          <h1>Review workspace readiness</h1>
          <p>The server recalculates every requirement from authoritative records.</p>
        </div>
        <span className={readiness.ready ? "readiness-badge" : "review-pending-badge"}>
          {readiness.ready ? "Ready to activate" : "Action required"}
        </span>
      </section>

      <section className="review-grid" aria-label="Workspace activation requirements">
        {readiness.requirements.map((requirement) => {
          const copy = labels[requirement.code] ?? {
            title: requirement.code,
            detail: "Required configuration.",
          };
          return (
            <article className="review-requirement" key={requirement.code}>
              <span
                className={requirement.complete ? "requirement-complete" : "requirement-missing"}
                aria-hidden="true"
              >
                {requirement.complete ? "✓" : "!"}
              </span>
              <div>
                <h2>{copy.title}</h2>
                <p>{copy.detail}</p>
              </div>
              {requirement.complete ? (
                <em>Complete</em>
              ) : requirement.actionPath ? (
                <Link href={requirement.actionPath}>Resolve →</Link>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="activation-panel">
        <div>
          <p className="app-eyebrow">Explicit activation</p>
          <h2>
            {readiness.ready
              ? "Your operational workspace is ready."
              : "Complete every requirement first."}
          </h2>
          <p>Activation is atomic, idempotent and recorded in the organization audit trail.</p>
        </div>
        <button
          className="identity-submit activation-submit"
          type="button"
          disabled={!readiness.ready || activating}
          onClick={() => void activate()}
        >
          {activating ? "Activating workspace…" : "Activate workspace"}
          <span aria-hidden="true">→</span>
        </button>
        {error ? (
          <p className="identity-error activation-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </>
  );
}
