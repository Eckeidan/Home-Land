"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface InvitationSummary {
  id: string;
  email: string;
  role: string;
  status: "PENDING";
  expiresAt: string;
}

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function TeamInvitationContent() {
  const organizationId = useSearchParams().get("organizationId");
  const [invitations, setInvitations] = useState<InvitationSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestKey = useRef(crypto.randomUUID());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const token = csrfToken();
    if (!token || !organizationId) {
      setError("Your organization session is missing or expired.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const form = new FormData(formElement);
    try {
      const response = await fetch(`${apiBaseUrl}/organizations/${organizationId}/invitations`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
      });
      const payload = (await response.json()) as InvitationSummary & {
        title?: string;
        message?: string | string[];
      };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Invitation could not be created.");
      }
      setInvitations((current) =>
        current.some((item) => item.id === payload.id) ? current : [...current, payload],
      );
      requestKey.current = crypto.randomUUID();
      formElement.reset();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Invitation could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro">
        <Link className="identity-brand" href="/">
          The Home Land
        </Link>
        <p className="identity-eyebrow">Optional collaboration · Step 6 of 8</p>
        <h1>Bring only the people who need access.</h1>
        <p>
          Every invitation is bound to this organization, one approved role and one verified email.
          OWNER access cannot be delegated here.
        </p>
        <ul className="identity-trust-list">
          <li>
            <span>01</span> Single-use 72-hour link
          </li>
          <li>
            <span>02</span> Non-owner role allowlist
          </li>
          <li>
            <span>03</span> Idempotent delivery command
          </li>
        </ul>
      </section>

      <section className="identity-card">
        <div className="identity-card-heading">
          <p className="identity-eyebrow">Team access</p>
          <h2>Invite a collaborator</h2>
          <p>You may skip this step and return after the first property is configured.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="identity-field">
            <span>Professional email</span>
            <input name="email" type="email" autoComplete="email" maxLength={320} required />
          </label>
          <label className="identity-field">
            <span>Role</span>
            <select name="role" defaultValue="PROPERTY_MANAGER" required>
              <option value="PROPERTY_MANAGER">Property manager</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="MAINTENANCE_MANAGER">Maintenance manager</option>
            </select>
          </label>
          {error ? (
            <p className="identity-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="identity-submit" type="submit" disabled={submitting}>
            {submitting ? "Creating secure invitation…" : "Send invitation"}
            <span aria-hidden="true">→</span>
          </button>
        </form>
        {invitations.length > 0 ? (
          <ul className="invitation-list">
            {invitations.map((invitation) => (
              <li key={invitation.id}>
                <span className="invitation-identity">
                  <strong>{invitation.email}</strong>
                  <small>{invitation.role.replaceAll("_", " ")}</small>
                </span>
                <em>{invitation.status}</em>
              </li>
            ))}
          </ul>
        ) : (
          <p className="identity-disclosure">No invitations sent in this session.</p>
        )}
        <Link
          className="identity-secondary-link"
          href={`/onboarding/portfolio?organizationId=${organizationId ?? ""}`}
        >
          {invitations.length > 0 ? "Continue to portfolio" : "Skip for now and continue"} →
        </Link>
      </section>
    </main>
  );
}

export default function TeamInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="identity-shell">
          <section className="identity-card identity-success">
            <span className="identity-progress-mark" />
          </section>
        </main>
      }
    >
      <TeamInvitationContent />
    </Suspense>
  );
}
