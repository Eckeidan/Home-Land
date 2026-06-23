"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/auth/sessions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.title ?? "Sign in failed.");
      if (body.organizations?.[0]?.id) {
        window.localStorage.setItem("thl_last_organization_id", body.organizations[0].id);
      }
      window.location.href = body.nextPath ?? "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro" aria-labelledby="login-title">
        <Link className="identity-brand" href="/">
          Asset Hub
        </Link>
        <p className="identity-eyebrow">Secure session</p>
        <h1 id="login-title">Return to your workspace.</h1>
        <p>Sign in with the owner account you already verified. No new organization is created.</p>
      </section>

      <form className="identity-card" onSubmit={submit} noValidate>
        <div className="identity-card-heading">
          <p className="identity-eyebrow">Login</p>
          <h2>Existing account</h2>
          <p>Use your verified email and password.</p>
        </div>
        <label className="identity-field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label className="identity-field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {error ? (
          <p className="identity-error" role="alert">
            {error}
          </p>
        ) : null}
        <button className="identity-submit" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
          <span>→</span>
        </button>
        <Link className="identity-secondary-link" href="/register">
          Create a new account
        </Link>
      </form>
    </main>
  );
}
