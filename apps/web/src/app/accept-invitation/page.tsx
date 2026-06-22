"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function InvitationAcceptanceContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "submitting" | "accepted">("idle");
  const [result, setResult] = useState<{ organizationName: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const invitationToken = searchParams.get("token");
    setToken(invitationToken);
    if (invitationToken) window.history.replaceState({}, "", "/accept-invitation");
  }, [searchParams]);

  async function accept() {
    const csrf = csrfToken();
    if (!token || !csrf) {
      setError(
        "Sign in with the verified email that received this invitation, then reopen the link.",
      );
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/organization-invitations/acceptances`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify({ token }),
      });
      const payload = (await response.json()) as {
        organizationName?: string;
        role?: string;
        title?: string;
        message?: string | string[];
      };
      if (!response.ok) {
        const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
        throw new Error(message ?? payload.title ?? "Invitation could not be accepted.");
      }
      setResult({
        organizationName: payload.organizationName ?? "Workspace",
        role: payload.role ?? "MEMBER",
      });
      setState("accepted");
    } catch (acceptanceError) {
      setError(
        acceptanceError instanceof Error
          ? acceptanceError.message
          : "Invitation could not be accepted.",
      );
      setState("idle");
    }
  }

  if (state === "accepted" && result) {
    return (
      <main className="identity-shell">
        <section className="identity-card identity-success">
          <span className="identity-success-mark">✓</span>
          <p className="identity-eyebrow">Membership activated</p>
          <h1>You joined {result.organizationName}.</h1>
          <p>Your server-authorized role is {result.role.replaceAll("_", " ")}.</p>
        </section>
      </main>
    );
  }
  return (
    <main className="identity-shell">
      <section className="identity-card identity-success">
        <p className="identity-eyebrow">Secure team invitation</p>
        <h1>Accept workspace access.</h1>
        <p>The signed-in verified email must match this single-use invitation.</p>
        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="identity-submit"
          type="button"
          onClick={accept}
          disabled={state === "submitting" || !token}
        >
          {state === "submitting" ? "Activating membership…" : "Accept invitation"}
          <span>→</span>
        </button>
        <Link className="identity-secondary-link" href="/register">
          Need an account? Register, verify, then reopen this link.
        </Link>
      </section>
    </main>
  );
}

export default function InvitationAcceptancePage() {
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
      <InvitationAcceptanceContent />
    </Suspense>
  );
}
