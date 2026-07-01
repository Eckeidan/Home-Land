"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
const acceptedRegistrationKey = "asset_hub_registration_accepted_email";

type SubmissionState = "idle" | "submitting" | "accepted" | "error";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function RegisterPage() {
  const [state, setState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const isFrench = language === "fr";

  useEffect(() => {
    if (window.localStorage.getItem(acceptedRegistrationKey)) {
      setState("accepted");
    }
  }, []);

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const termsAccepted = form.get("terms") === "on";

    if (fullName.length < 2) {
      setError(isFrench ? "Le nom complet est obligatoire." : "Full name is required.");
      setState("error");
      return;
    }
    if (!isValidEmail(email)) {
      setError(isFrench ? "Entrez une adresse email valide." : "Enter a valid email address.");
      setState("error");
      return;
    }
    if (!termsAccepted) {
      setError(
        isFrench
          ? "Vous devez accepter les conditions avant de créer le compte."
          : "You must accept the terms before creating the account.",
      );
      setState("error");
      return;
    }

    if (window.localStorage.getItem(acceptedRegistrationKey) === email) {
      setState("accepted");
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/auth/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          acceptedTermsVersion: "2026-06-20",
        }),
      });

      if (!response.ok) {
        const problem = (await response.json()) as { message?: string | string[] };
        const message = Array.isArray(problem.message) ? problem.message[0] : problem.message;
        throw new Error(message ?? "Registration could not be completed.");
      }

      window.localStorage.setItem(acceptedRegistrationKey, email);
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

  return (
    <main className="register-page">
      <div className="energy-field" aria-hidden="true">
        <span className="energy-line line-a" />
        <span className="energy-line line-b" />
        <span className="energy-line line-c" />
        <span className="energy-line line-d" />
        <span className="energy-line line-e" />
        <span className="energy-line line-f" />
      </div>
      <div className="energy-grid" aria-hidden="true" />

      <section className="register-left">
        <Link href="/" className="brand">
          <span className="brand-logo">
            <Image src="/logo.png" alt="" width={58} height={58} priority />
          </span>
          <div>
            <strong>Asset Hub</strong>
            <small>by Meta Global Vision Holding</small>
          </div>
        </Link>

        <div className="hero-copy">
          <p className="eyebrow">
            {isFrench ? "Fondation propriétaire sécurisée" : "Secure owner foundation"}
          </p>
          <h1>{isFrench ? "Créez votre accès." : "Create your access."}</h1>
          <p>
            {isFrench
              ? "Votre compte devient l’identité responsable qui créera l’organisation, les propriétés, les unités et les opérations."
              : "Your account becomes the accountable identity that creates the organization, properties, units, and operations."}
          </p>
        </div>

        <div className="trust-grid">
          <article>
            <strong>01</strong>
            <span>{isFrench ? "Identité vérifiée" : "Verified identity"}</span>
          </article>
          <article>
            <strong>02</strong>
            <span>{isFrench ? "Organisation isolée" : "Scoped organization"}</span>
          </article>
          <article>
            <strong>03</strong>
            <span>{isFrench ? "Audit prêt" : "Audit-ready"}</span>
          </article>
        </div>
      </section>

      <section className="register-right">
        <section className="register-card" aria-labelledby="register-title">
          <div className="register-card-top">
            <Image
              className="register-logo"
              src="/logo.png"
              alt="Asset Hub"
              width={82}
              height={82}
            />
            <fieldset className="language-switch">
              <legend>Language selector</legend>
              <button
                type="button"
                className={language === "en" ? "active" : ""}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={language === "fr" ? "active" : ""}
                onClick={() => setLanguage("fr")}
              >
                FR
              </button>
            </fieldset>
          </div>

          {state === "accepted" ? (
            <div className="accepted-state">
              <p className="eyebrow register-word">
                {isFrench ? "Inscription acceptée" : "Registration accepted"}
              </p>
              <h2 id="register-title">
                {isFrench ? "Vérifiez votre email." : "Check your email."}
              </h2>
              <p>
                {isFrench
                  ? "Nous avons envoyé le lien de vérification et le mot de passe temporaire. Cliquez d’abord sur Verify account dans l’email; cela ouvre automatiquement l’onboarding."
                  : "We sent the verification link and temporary password. Click Verify account in the email first; it automatically opens onboarding."}
              </p>
              <div className="footer-links accepted-links">
                <Link className="accepted-login-button" href="/login">
                  {isFrench ? "Connexion après vérification" : "Sign in after verification"}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submitRegistration} noValidate>
              <div className="card-head">
                <p className="eyebrow register-word">{isFrench ? "Créer un compte" : "Register"}</p>
                <h2 id="register-title">
                  {isFrench ? "Créez votre identité." : "Create your identity."}
                </h2>
                <p>
                  {isFrench
                    ? "Entrez votre nom et votre email. Asset Hub enverra automatiquement votre mot de passe temporaire."
                    : "Enter your name and email. Asset Hub will automatically send your temporary password."}
                </p>
              </div>

              <label>
                <span>{isFrench ? "Nom complet" : "Full name"}</span>
                <input
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={160}
                  required
                />
              </label>

              <label>
                <span>{isFrench ? "Email professionnel" : "Professional email"}</span>
                <input name="email" type="email" autoComplete="email" maxLength={320} required />
              </label>

              <div className="password-delivery-note">
                <strong>{isFrench ? "Mot de passe automatique" : "Automatic password"}</strong>
                <span>
                  {isFrench
                    ? "Un mot de passe temporaire sécurisé sera envoyé à cette adresse email."
                    : "A secure temporary password will be sent to this email address."}
                </span>
              </div>

              <label className="consent">
                <input name="terms" type="checkbox" required />
                <span>
                  {isFrench
                    ? "J’accepte les conditions et la notice de confidentialité de cet espace."
                    : "I agree to the current Terms and Privacy Notice for this workspace."}
                </span>
              </label>

              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" disabled={state === "submitting"}>
                {state === "submitting"
                  ? isFrench
                    ? "Création..."
                    : "Creating..."
                  : isFrench
                    ? "Créer le compte"
                    : "Create account"}
                <span aria-hidden="true">→</span>
              </button>

              <div className="footer-links">
                <Link href="/login">
                  {isFrench ? "J’ai déjà un compte" : "Already have an account"}
                </Link>
                <Link href="/">{isFrench ? "Retour au site" : "Back to website"}</Link>
              </div>
            </form>
          )}
        </section>
      </section>

      <style jsx>{`
        .register-page {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(440px, 0.9fr);
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 18% 18%, rgba(56, 189, 248, 0.15), transparent 28%),
            radial-gradient(circle at 78% 42%, rgba(47, 111, 230, 0.24), transparent 34%),
            radial-gradient(circle at 68% 88%, rgba(37, 99, 235, 0.16), transparent 30%),
            linear-gradient(90deg, rgba(2, 6, 23, 0.62), rgba(2, 6, 23, 0.34) 46%, rgba(2, 6, 23, 0.86)),
            #020617;
          color: #ffffff;
        }

        .energy-grid,
        .energy-field {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .energy-grid {
          background:
            linear-gradient(to right, rgba(255, 255, 255, 0.032) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.024) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.72;
        }

        .energy-field {
          overflow: hidden;
        }

        .energy-field::before,
        .energy-field::after {
          position: absolute;
          width: 46rem;
          height: 46rem;
          border-radius: 999px;
          filter: blur(100px);
          content: "";
          opacity: 0.34;
        }

        .energy-field::before {
          top: -12rem;
          left: -8rem;
          background: rgba(14, 165, 233, 0.55);
        }

        .energy-field::after {
          right: -14rem;
          bottom: -16rem;
          background: rgba(47, 111, 230, 0.5);
        }

        .energy-line {
          position: absolute;
          width: 1px;
          height: 150vh;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(96, 165, 250, 0.08),
            rgba(47, 111, 230, 0.78),
            rgba(147, 197, 253, 0.18),
            transparent
          );
          box-shadow: 0 0 26px rgba(56, 189, 248, 0.48);
          transform-origin: center;
          animation: energy-drift 10s linear infinite;
        }

        .line-a { left: 8%; top: -35%; transform: rotate(48deg); animation-duration: 9s; }
        .line-b { left: 30%; top: -48%; transform: rotate(-34deg); animation-duration: 12s; animation-delay: -4s; }
        .line-c { left: 58%; top: -42%; transform: rotate(68deg); animation-duration: 11s; animation-delay: -2s; }
        .line-d { left: 82%; top: -36%; transform: rotate(-58deg); animation-duration: 13s; animation-delay: -6s; }
        .line-e { left: 14%; top: -62%; transform: rotate(88deg); animation-duration: 15s; animation-delay: -8s; }
        .line-f { left: 72%; top: -58%; transform: rotate(24deg); animation-duration: 10s; animation-delay: -5s; }

        @keyframes energy-drift {
          0% { translate: -22vw -18vh; opacity: 0; }
          12%, 82% { opacity: 1; }
          100% { translate: 28vw 34vh; opacity: 0; }
        }

        .register-left,
        .register-right {
          position: relative;
          z-index: 1;
          padding: clamp(28px, 5vw, 72px);
        }

        .register-left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 48px;
        }

        .brand {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 18px;
          padding: 16px 22px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          backdrop-filter: blur(22px);
        }

        .brand-logo {
          display: grid;
          width: 58px;
          height: 58px;
          place-items: center;
          border-radius: 12px;
          background: #ffffff;
          overflow: hidden;
        }

        .brand-logo :global(img) {
          object-fit: contain;
        }

        .brand strong {
          display: block;
          color: #ffffff;
          font-size: 24px;
          font-weight: 950;
        }

        .brand small {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 13px;
          font-weight: 750;
        }

        .hero-copy {
          max-width: 720px;
        }

        .eyebrow {
          margin: 0 0 16px;
          color: #93c5fd;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(54px, 6vw, 92px);
          font-weight: 720;
          line-height: 0.96;
          letter-spacing: -0.04em;
        }

        .hero-copy > p:last-child {
          max-width: 620px;
          margin: 26px 0 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 18px;
          line-height: 1.65;
        }

        .trust-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          max-width: 760px;
        }

        .trust-grid article {
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.075);
          backdrop-filter: blur(12px);
        }

        .trust-grid strong {
          display: block;
          color: #fde68a;
          font-size: 23px;
          font-weight: 950;
        }

        .trust-grid span {
          display: block;
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 13px;
          font-weight: 750;
        }

        .register-right {
          display: grid;
          place-items: center;
        }

        .register-card {
          width: min(100%, 560px);
          padding: clamp(28px, 4vw, 38px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.965);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(24px);
        }

        .register-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .register-logo {
          width: 82px;
          height: 82px;
          border-radius: 12px;
          object-fit: contain;
          box-shadow: 0 12px 34px rgba(47, 111, 230, 0.2);
        }

        .language-switch {
          display: inline-flex;
          gap: 4px;
          margin: 0;
          padding: 4px;
          border: 1px solid #dbeafe;
          border-radius: 999px;
          background: #eff6ff;
        }

        .language-switch legend {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .language-switch button {
          display: inline-flex;
          width: auto;
          height: 32px;
          align-items: center;
          justify-content: center;
          padding: 0 11px;
          border: 0;
          border-radius: 999px;
          color: #1e3a8a;
          background: transparent;
          box-shadow: none;
          font-size: 12px;
          font-weight: 950;
        }

        .language-switch button.active {
          color: #ffffff;
          background: #2f6fe6;
        }

        .card-head {
          margin-bottom: 24px;
        }

        .register-word {
          color: #2f6fe6;
          font-size: 15px;
          letter-spacing: 0.22em;
        }

        h2 {
          margin: 0;
          color: #020617;
          font-size: 31px;
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.025em;
        }

        .card-head > p:last-child,
        .accepted-state > p {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.6;
        }

        label {
          display: grid;
          gap: 8px;
          margin-bottom: 15px;
          color: #334155;
          font-size: 13px;
          font-weight: 850;
        }

        input {
          width: 100%;
          height: 50px;
          padding: 0 14px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #020617;
          background: #ffffff;
          font: inherit;
          font-size: 15px;
          font-weight: 750;
          outline: none;
        }

        input:focus {
          border-color: #2f6fe6;
          box-shadow: 0 0 0 4px rgba(47, 111, 230, 0.14);
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .password-delivery-note {
          display: grid;
          gap: 6px;
          margin: 2px 0 16px;
          padding: 14px 15px;
          border: 1px solid #bfdbfe;
          border-radius: 12px;
          background: linear-gradient(135deg, #eff6ff, #ffffff);
        }

        .password-delivery-note strong {
          color: #071a3d;
          font-size: 13px;
          font-weight: 950;
        }

        .password-delivery-note span {
          color: #475569;
          font-size: 12px;
          font-weight: 750;
          line-height: 1.5;
        }

        .consent {
          grid-template-columns: 18px 1fr;
          align-items: start;
          gap: 10px;
          margin-top: 4px;
          color: #475569;
          font-size: 12px;
          line-height: 1.45;
        }

        .consent input {
          width: 18px;
          height: 18px;
          margin-top: 1px;
        }

        .error {
          margin: 4px 0 18px;
          padding: 13px 15px;
          border: 1px solid rgba(200, 40, 40, 0.18);
          border-radius: 10px;
          color: #9d1d1d;
          background: rgba(200, 40, 40, 0.06);
          font-size: 13px;
          font-weight: 750;
        }

        form > button {
          display: flex;
          width: 100%;
          height: 56px;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border: 0;
          border-radius: 10px;
          color: #ffffff;
          background: #071a3d;
          box-shadow: 0 18px 38px rgba(47, 111, 230, 0.24);
          font: inherit;
          font-size: 16px;
          font-weight: 950;
          cursor: pointer;
        }

        form > button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .footer-links {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-top: 20px;
          font-size: 13px;
          font-weight: 850;
        }

        .footer-links a {
          color: #1d4ed8 !important;
          text-decoration: none;
        }

        .footer-links a:hover {
          color: #071a3d !important;
          text-decoration: underline;
        }

        .accepted-state {
          padding-bottom: 8px;
        }

        .accepted-links {
          margin-top: 28px;
        }

        .accepted-login-button {
          display: flex;
          width: 100%;
          min-height: 54px;
          align-items: center;
          justify-content: space-between;
          border-radius: 12px;
          padding: 0 18px;
          color: #ffffff !important;
          background: linear-gradient(135deg, #071a3d, #2f6fe6);
          box-shadow: 0 18px 38px rgba(47, 111, 230, 0.24);
          font-size: 15px;
          font-weight: 950;
          text-decoration: none;
        }

        .accepted-login-button:hover {
          color: #ffffff !important;
          background: linear-gradient(135deg, #0b2454, #60a5fa);
          text-decoration: none;
        }

        @media (max-width: 980px) {
          .register-page {
            grid-template-columns: 1fr;
          }

          .trust-grid,
          .field-grid {
            grid-template-columns: 1fr;
          }

          .register-right {
            padding-top: 0;
          }
        }

        @media (max-width: 560px) {
          .register-left,
          .register-right {
            padding: 22px;
          }

          .hero-copy h1 {
            font-size: 52px;
          }

          h2 {
            font-size: 28px;
          }

          .footer-links {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
