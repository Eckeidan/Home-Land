"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const isFrench = language === "fr";

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
    <main className="login-page">
      <div className="energy-field" aria-hidden="true">
        <span className="energy-line line-a" />
        <span className="energy-line line-b" />
        <span className="energy-line line-c" />
        <span className="energy-line line-d" />
        <span className="energy-line line-e" />
        <span className="energy-line line-f" />
      </div>
      <div className="energy-grid" aria-hidden="true" />

      <section className="login-left">
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
            {isFrench ? "Centre de commande immobilier sécurisé" : "Secure property command center"}
          </p>
          <h1>Asset Hub</h1>
          <p>
            {isFrench
              ? "Revenez dans un hub opérationnel unique pour loyers, locataires, baux, maintenance, appartements, bâtiments et exceptions financières."
              : "Return to one operational hub for rent, tenants, leases, maintenance, apartments, buildings, and financial exceptions."}
          </p>
        </div>

        <div className="trust-grid">
          <article>
            <strong>24/7</strong>
            <span>{isFrench ? "Accès propriétaire" : "Owner access"}</span>
          </article>
          <article>
            <strong>{isFrench ? "Sécurisé" : "Bank-grade"}</strong>
            <span>{isFrench ? "Sessions protégées" : "Secure sessions"}</span>
          </article>
          <article>
            <strong>{isFrench ? "Temps réel" : "Real-time"}</strong>
            <span>{isFrench ? "Vue portefeuille" : "Portfolio view"}</span>
          </article>
        </div>
      </section>

      <section className="login-right">
        <form className="login-card" onSubmit={submit} noValidate>
          <div className="login-card-top">
            <Image className="login-logo" src="/logo.png" alt="Asset Hub" width={82} height={82} />
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

          <div className="card-head">
            <p className="eyebrow login-word">{isFrench ? "Connexion" : "Login"}</p>
            <h2>{isFrench ? "Connectez-vous pour continuer" : "Sign in to continue"}</h2>
            <p>
              {isFrench
                ? "Utilisez votre compte propriétaire ou gestionnaire vérifié."
                : "Use your verified owner or manager account."}
            </p>
          </div>

          <label>
            <span>{isFrench ? "Adresse email" : "Email address"}</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <label>
            <span>{isFrench ? "Mot de passe" : "Password"}</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy}>
            {busy
              ? isFrench
                ? "Connexion..."
                : "Signing in..."
              : isFrench
                ? "Se connecter"
                : "Sign in"}
            <span>→</span>
          </button>

          <div className="footer-links">
            <Link href="/register">
              {isFrench ? "Créer une nouvelle organisation" : "Create a new organization"}
            </Link>
            <Link href="/">{isFrench ? "Retour au site" : "Back to website"}</Link>
          </div>
        </form>
      </section>

      <style jsx>{`
        .login-page {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(420px, 0.9fr);
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

        .energy-grid {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            linear-gradient(to right, rgba(255, 255, 255, 0.032) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.024) 1px, transparent 1px);
          background-size: 48px 48px;
          opacity: 0.72;
          pointer-events: none;
        }

        .energy-field {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
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

        .line-a {
          left: 8%;
          top: -35%;
          transform: rotate(48deg);
          animation-duration: 9s;
        }

        .line-b {
          left: 30%;
          top: -48%;
          transform: rotate(-34deg);
          animation-duration: 12s;
          animation-delay: -4s;
        }

        .line-c {
          left: 58%;
          top: -42%;
          transform: rotate(68deg);
          animation-duration: 11s;
          animation-delay: -2s;
        }

        .line-d {
          left: 82%;
          top: -36%;
          transform: rotate(-58deg);
          animation-duration: 13s;
          animation-delay: -6s;
        }

        .line-e {
          left: 14%;
          top: -62%;
          transform: rotate(88deg);
          animation-duration: 15s;
          animation-delay: -8s;
        }

        .line-f {
          left: 72%;
          top: -58%;
          transform: rotate(24deg);
          animation-duration: 10s;
          animation-delay: -5s;
        }

        @keyframes energy-drift {
          0% {
            translate: -22vw -18vh;
            opacity: 0;
          }

          12%,
          82% {
            opacity: 1;
          }

          100% {
            translate: 28vw 34vh;
            opacity: 0;
          }
        }

        .login-left,
        .login-right {
          position: relative;
          z-index: 1;
          padding: clamp(28px, 5vw, 72px);
        }

        .login-left {
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
          box-shadow: none;
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

        .brand-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .brand strong {
          display: block;
          font-size: 24px;
          font-weight: 950;
          color: #ffffff;
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

        .login-right {
          display: grid;
          place-items: center;
        }

        .login-card {
          width: min(100%, 520px);
          padding: clamp(28px, 4vw, 38px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.965);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(24px);
        }

        .login-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 22px;
        }

        .login-logo {
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
          margin-bottom: 30px;
        }

        h2 {
          margin: 0;
          color: #020617;
          font-size: 31px;
          font-weight: 700;
          line-height: 1.12;
          letter-spacing: -0.025em;
        }

        .card-head > p:last-child {
          margin: 12px 0 0;
          color: #64748b;
          font-size: 14px;
          font-weight: 700;
        }

        .login-word {
          color: #2f6fe6;
          font-size: 15px;
          letter-spacing: 0.22em;
        }

        label {
          display: grid;
          gap: 9px;
          margin-bottom: 18px;
          color: #334155;
          font-size: 13px;
          font-weight: 850;
        }

        input {
          width: 100%;
          height: 56px;
          padding: 0 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          color: #020617;
          background: #ffffff;
          font: inherit;
          font-size: 16px;
          font-weight: 750;
          outline: none;
        }

        input:focus {
          border-color: #2f6fe6;
          box-shadow: 0 0 0 4px rgba(47, 111, 230, 0.14);
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

        button {
          display: flex;
          width: 100%;
          height: 58px;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border: 0;
          border-radius: 10px;
          color: #fff;
          background: #071a3d;
          box-shadow: 0 18px 38px rgba(47, 111, 230, 0.24);
          font: inherit;
          font-size: 16px;
          font-weight: 950;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.65;
          cursor: wait;
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

        .footer-links {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          margin-top: 22px;
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

        @media (max-width: 980px) {
          .login-page {
            grid-template-columns: 1fr;
          }

          .trust-grid {
            grid-template-columns: 1fr;
          }

          .login-right {
            padding-top: 0;
          }
        }

        @media (max-width: 560px) {
          .login-left,
          .login-right {
            padding: 22px;
          }

          .hero-copy {
            padding-left: 18px;
          }

          .hero-copy h1 {
            font-size: 52px;
          }

          h2 {
            font-size: 34px;
          }

          .footer-links {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
