"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type VerificationState = "verifying" | "verified" | "invalid";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>("verifying");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = searchParams.get("token");
    if (!token) {
      setState("invalid");
      return;
    }

    void fetch(`${apiBaseUrl}/auth/email-verifications`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).then((response) => setState(response.ok ? "verified" : "invalid"));
  }, [searchParams]);

  return (
    <main className="identity-shell">
      <section className="identity-card identity-success" aria-live="polite">
        {state === "verifying" ? (
          <>
            <span className="identity-progress-mark" aria-hidden="true" />
            <p className="identity-eyebrow">Verifying identity</p>
            <h1>Securing your account…</h1>
            <p>The verification link is being validated and consumed exactly once.</p>
          </>
        ) : null}
        {state === "verified" ? (
          <>
            <span className="identity-success-mark" aria-hidden="true">
              ✓
            </span>
            <p className="identity-eyebrow">Identity verified</p>
            <h1>Your account is secure.</h1>
            <p>
              A protected session has been created. Organization setup is the next bounded step.
            </p>
            <Link className="identity-primary-link" href="/onboarding/organization">
              Continue to organization <span aria-hidden="true">→</span>
            </Link>
          </>
        ) : null}
        {state === "invalid" ? (
          <>
            <span className="identity-error-mark" aria-hidden="true">
              ×
            </span>
            <p className="identity-eyebrow">Verification unavailable</p>
            <h1>This link is invalid or expired.</h1>
            <p>
              For security, used, revoked, expired, and unknown links receive the same response.
            </p>
            <Link className="identity-primary-link" href="/register">
              Return to registration
            </Link>
          </>
        ) : null}
      </section>
    </main>
  );
}
