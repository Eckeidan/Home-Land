"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type SubmissionState = "idle" | "submitting" | "accepted" | "error";

export default function RegisterPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(form.get("passwordConfirmation") ?? "");
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      setState("error");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password,
          acceptedTermsVersion: "2026-06-20",
        }),
      });

      if (!response.ok) {
        const problem = (await response.json()) as { message?: string | string[] };
        const message = Array.isArray(problem.message) ? problem.message[0] : problem.message;
        throw new Error(message ?? "Registration could not be completed.");
      }

      setState("accepted");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Registration could not be completed.",
      );
      setState("error");
    }
  }

  if (state === "accepted") {
    return (
      <main className="identity-shell">
        <section className="identity-card identity-success" aria-labelledby="check-email-title">
          <span className="identity-success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="identity-eyebrow">Registration accepted</p>
          <h1 id="check-email-title">Check your email.</h1>
          <p>
            If the address can receive a verification, we sent a secure link. The response is
            intentionally identical for new and existing accounts.
          </p>
          {process.env.NODE_ENV === "development" ? (
            <a
              className="identity-primary-link"
              href="http://localhost:8025"
              target="_blank"
              rel="noreferrer"
            >
              Open local Mailpit inbox <span aria-hidden="true">→</span>
            </a>
          ) : null}
          <Link className="identity-secondary-link" href="/">
            Return home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro" aria-labelledby="registration-title">
        <Link className="identity-brand" href="/">
          Asset Hub
        </Link>
        <p className="identity-eyebrow">Secure account foundation</p>
        <h1 id="registration-title">Create your owner identity.</h1>
        <p>
          This account will become the accountable creator of your organization workspace. Your
          organization and properties come next.
        </p>
        <ul className="identity-trust-list">
          <li>
            <span>01</span> Argon2id password protection
          </li>
          <li>
            <span>02</span> Single-use email verification
          </li>
          <li>
            <span>03</span> Auditable identity lifecycle
          </li>
        </ul>
      </section>

      <form className="identity-card" onSubmit={submitRegistration} noValidate>
        <div className="identity-card-heading">
          <p className="identity-eyebrow">Step 1 of 8</p>
          <h2>Your account</h2>
          <p>Use a professional email address you control.</p>
        </div>

        <label className="identity-field">
          <span>Full name</span>
          <input
            name="fullName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={160}
            required
          />
        </label>
        <label className="identity-field">
          <span>Professional email</span>
          <input name="email" type="email" autoComplete="email" maxLength={320} required />
        </label>
        <div className="identity-field-grid">
          <label className="identity-field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <label className="identity-field">
            <span>Confirm password</span>
            <input
              name="passwordConfirmation"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        </div>
        <p className="identity-help">
          Use at least 12 characters. A password manager is recommended.
        </p>

        <label className="identity-consent">
          <input name="terms" type="checkbox" required />
          <span>
            I agree to the current Terms and Privacy Notice for this development workspace.
          </span>
        </label>

        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="identity-submit" type="submit" disabled={state === "submitting"}>
          {state === "submitting" ? "Creating secure account…" : "Create account"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="identity-disclosure">
          We never reveal whether an email already has an account.
        </p>
      </form>
    </main>
  );
}
