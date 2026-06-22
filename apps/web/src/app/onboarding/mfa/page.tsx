"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

type Stage =
  | "intro"
  | "starting"
  | "challenge"
  | "confirming"
  | "recovery"
  | "acknowledging"
  | "success";

interface EnrollmentChallenge {
  enrollmentId: string;
  provisioningUri: string;
  qrCodeDataUrl: string;
  manualSecret: string;
  expiresAt: string;
}

function csrfToken(): string | null {
  const prefix = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function MfaEnrollmentContent() {
  const organizationId = useSearchParams().get("organizationId");
  const [stage, setStage] = useState<Stage>("intro");
  const [challenge, setChallenge] = useState<EnrollmentChallenge | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(path: string, body: object) {
    const token = csrfToken();
    if (!token) throw new Error("Your verified session is missing or expired.");
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { title?: string; message?: string | string[] };
    if (!response.ok) {
      const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
      throw new Error(message ?? payload.title ?? "MFA enrollment could not be completed.");
    }
    return payload;
  }

  async function begin() {
    if (!organizationId) {
      setError("Organization context is missing.");
      return;
    }
    setStage("starting");
    setError(null);
    try {
      const payload = (await request("/auth/mfa/enrollments", {
        organizationId,
      })) as EnrollmentChallenge;
      setChallenge(payload);
      setStage("challenge");
    } catch (beginError) {
      setError(
        beginError instanceof Error ? beginError.message : "MFA enrollment could not start.",
      );
      setStage("intro");
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setStage("confirming");
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const payload = (await request(`/auth/mfa/enrollments/${challenge.enrollmentId}/confirm`, {
        code: form.get("code"),
      })) as { recoveryCodes: string[] };
      setRecoveryCodes(payload.recoveryCodes);
      setStage("recovery");
    } catch (confirmationError) {
      setError(
        confirmationError instanceof Error
          ? confirmationError.message
          : "The authenticator code was rejected.",
      );
      setStage("challenge");
    }
  }

  async function acknowledge() {
    if (!challenge || !acknowledged) return;
    setStage("acknowledging");
    setError(null);
    try {
      await request(
        `/auth/mfa/enrollments/${challenge.enrollmentId}/recovery-codes/acknowledgements`,
        {
          acknowledged: true,
        },
      );
      setRecoveryCodes([]);
      setStage("success");
    } catch (acknowledgementError) {
      setError(
        acknowledgementError instanceof Error
          ? acknowledgementError.message
          : "Acknowledgement failed.",
      );
      setStage("recovery");
    }
  }

  if (stage === "success") {
    return (
      <main className="identity-shell">
        <section className="identity-card identity-success">
          <span className="identity-success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="identity-eyebrow">Owner MFA enabled</p>
          <h1>Your privileged account is protected.</h1>
          <p>
            The factor is active, recovery custody is acknowledged, and onboarding can proceed to
            the first portfolio records.
          </p>
          <Link
            className="identity-primary-link"
            href={`/onboarding/team?organizationId=${organizationId ?? ""}`}
          >
            Invite your team <span aria-hidden="true">→</span>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="identity-shell">
      <section className="identity-intro">
        <Link className="identity-brand" href="/">
          The Home Land
        </Link>
        <p className="identity-eyebrow">Privileged owner · Step 5 of 8</p>
        <h1>Secure the person behind the workspace.</h1>
        <p>
          TOTP adds an independent proof from your authenticator. The secret is encrypted at rest
          and recovery codes are never recoverable after this screen.
        </p>
        <ul className="identity-trust-list">
          <li>
            <span>01</span> AES-256-GCM secret protection
          </li>
          <li>
            <span>02</span> Five-attempt enrollment limit
          </li>
          <li>
            <span>03</span> One-time recovery display
          </li>
        </ul>
      </section>

      <section className="identity-card">
        {stage === "intro" || stage === "starting" ? (
          <>
            <div className="identity-card-heading">
              <p className="identity-eyebrow">Authenticator setup</p>
              <h2>Add a security factor</h2>
              <p>
                Have 1Password, Google Authenticator, Microsoft Authenticator, or another TOTP app
                ready.
              </p>
            </div>
            {error ? (
              <p className="identity-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="identity-submit"
              type="button"
              onClick={begin}
              disabled={stage === "starting"}
            >
              {stage === "starting" ? "Creating encrypted challenge…" : "Begin secure enrollment"}
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : null}

        {(stage === "challenge" || stage === "confirming") && challenge ? (
          <form onSubmit={confirm} noValidate>
            <div className="identity-card-heading">
              <p className="identity-eyebrow">Scan and verify</p>
              <h2>Connect your authenticator</h2>
              <p>This challenge expires at {new Date(challenge.expiresAt).toLocaleTimeString()}.</p>
            </div>
            <Image
              className="mfa-qr"
              src={challenge.qrCodeDataUrl}
              alt="TOTP enrollment QR code"
              width={220}
              height={220}
              unoptimized
            />
            <p className="mfa-manual-secret">
              <span className="mfa-secret-label">Manual setup key</span>
              {challenge.manualSecret}
            </p>
            <label className="identity-field">
              <span>Six-digit authenticator code</span>
              <input
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
              />
            </label>
            {error ? (
              <p className="identity-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="identity-submit" type="submit" disabled={stage === "confirming"}>
              {stage === "confirming" ? "Verifying factor…" : "Verify authenticator"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
        ) : null}

        {(stage === "recovery" || stage === "acknowledging") && recoveryCodes.length > 0 ? (
          <>
            <div className="identity-card-heading">
              <p className="identity-eyebrow">Shown once</p>
              <h2>Save recovery codes</h2>
              <p>Store these outside The Home Land. Each code can recover access exactly once.</p>
            </div>
            <div className="recovery-code-grid">
              {recoveryCodes.map((code) => (
                <code key={code}>{code}</code>
              ))}
            </div>
            <label className="identity-consent">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>I saved these recovery codes in a secure location.</span>
            </label>
            {error ? (
              <p className="identity-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="identity-submit"
              type="button"
              onClick={acknowledge}
              disabled={!acknowledged || stage === "acknowledging"}
            >
              {stage === "acknowledging" ? "Recording acknowledgement…" : "Confirm secure storage"}
              <span aria-hidden="true">→</span>
            </button>
          </>
        ) : null}
      </section>
    </main>
  );
}

export default function MfaEnrollmentPage() {
  return (
    <Suspense
      fallback={
        <main className="identity-shell">
          <section className="identity-card identity-success">
            <span className="identity-progress-mark" aria-hidden="true" />
            <p className="identity-eyebrow">Loading security context</p>
          </section>
        </main>
      }
    >
      <MfaEnrollmentContent />
    </Suspense>
  );
}
