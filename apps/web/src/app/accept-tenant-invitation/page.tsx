"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

function AcceptTenantInvitationContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept() {
    if (!token) {
      setStatus("Invitation token is missing.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`${api}/tenant-invitations/acceptances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const body = await response.json();

      setStatus(
        response.ok
          ? "Invitation accepted. Your tenant profile is active."
          : (body.title ?? "Invitation is invalid or expired."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="identity-shell">
      <section className="identity-card">
        <p className="app-eyebrow">Secure tenant invitation</p>
        <h1>Confirm your invitation</h1>
        <p>The link is single-use and expires after 72 hours.</p>

        <button
          className="identity-submit"
          type="button"
          disabled={busy || !token}
          onClick={() => void accept()}
        >
          {busy ? "Confirming…" : "Accept invitation"}
          <span>→</span>
        </button>

        {status ? <p className="identity-status">{status}</p> : null}
      </section>
    </main>
  );
}

export default function AcceptTenantInvitationPage() {
  return (
    <Suspense fallback={<main className="identity-shell">Loading invitation...</main>}>
      <AcceptTenantInvitationContent />
    </Suspense>
  );
}
