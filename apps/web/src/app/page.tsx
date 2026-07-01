"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const copy = {
  en: {
    navPlatform: "Platform",
    navRelief: "Landlord relief",
    navContact: "Contact",
    signIn: "Sign in",
    createAccount: "Create account",
    eyebrow: "Property operations command center",
    heroTitle: "Manage apartments, buildings, tenants, payments, and maintenance without stress.",
    heroCopy:
      "Asset Hub gives landlords and property operators one professional workspace to manage apartments, homes, buildings, commercial units, rent collection, tenant communication, maintenance, reminders, and AI-assisted support.",
    start: "Start your organization →",
    existing: "I already have an account",
    live: "Live operating system",
    units: "units under control",
    paymentReceived: "Rent payment received",
    reminderScheduled: "Tenant reminder scheduled",
    maintenanceAssigned: "Maintenance request assigned",
    aiDrafted: "AI tenant response drafted",
    platformEyebrow: "Complete real estate management",
    platformTitle: "One application for the whole property lifecycle.",
    platformCopy:
      "From the first unit to rent payment, from tenant questions to maintenance resolution, Asset Hub keeps every operational action inside one secured organization.",
    reliefEyebrow: "Landlord peace of mind",
    reliefTitle: "The landlord enters a calm workspace. Tenants no longer create chaos.",
    reliefCopy:
      "Asset Hub is designed to reduce daily pressure: tenants have channels, rent has status, maintenance has workflow, reminders are scheduled, and the landlord sees priorities clearly instead of chasing everything manually.",
    finalTitle:
      "Build the professional operating center for your apartments and real estate assets.",
    contactEyebrow: "Contact",
    contactTitle: "Talk to Asset Hub.",
    contactCopy:
      "We are preparing a professional property management platform for landlords, tenants, apartments, buildings, and real estate operations.",
    contactFormTitle: "Send us a message",
    nameLabel: "Full name",
    subjectLabel: "Subject",
    messageLabel: "Message",
    sendMessage: "Send message",
    sending: "Sending...",
    sent: "Message sent. We will reply by email.",
    contactError: "Message could not be sent.",
    email: "Email",
    phone: "Mobile / WhatsApp",
    address: "Address",
    addressValue: "Not fixed yet",
    copyright: "All rights reserved.",
  },
  fr: {
    navPlatform: "Plateforme",
    navRelief: "Repos landlord",
    navContact: "Contact",
    signIn: "Connexion",
    createAccount: "Créer un compte",
    eyebrow: "Centre de commande immobilier",
    heroTitle: "Gérez appartements, buildings, tenants, paiements et maintenance sans stress.",
    heroCopy:
      "Asset Hub donne aux landlords et opérateurs immobiliers un espace professionnel unique pour gérer appartements, maisons, buildings, magasins commerciaux, loyers, communication tenant, maintenance, rappels et support IA.",
    start: "Créer votre organisation →",
    existing: "J’ai déjà un compte",
    live: "Système opérationnel live",
    units: "unités sous contrôle",
    paymentReceived: "Paiement de loyer reçu",
    reminderScheduled: "Rappel tenant planifié",
    maintenanceAssigned: "Maintenance assignée",
    aiDrafted: "Réponse IA au tenant préparée",
    platformEyebrow: "Gestion immobilière complète",
    platformTitle: "Une application pour tout le cycle immobilier.",
    platformCopy:
      "De la première unité au paiement du loyer, des questions tenants à la maintenance, Asset Hub garde chaque action dans une organisation sécurisée.",
    reliefEyebrow: "Repos du landlord",
    reliefTitle: "Le landlord entre dans un espace calme. Les tenants ne créent plus le chaos.",
    reliefCopy:
      "Asset Hub réduit la pression quotidienne : les tenants ont un canal, le loyer a un statut, la maintenance a un workflow, les rappels sont planifiés, et le landlord voit clairement les priorités.",
    finalTitle:
      "Construisez le centre opérationnel professionnel de vos appartements et actifs immobiliers.",
    contactEyebrow: "Contact",
    contactTitle: "Parlez avec Asset Hub.",
    contactCopy:
      "Nous préparons une plateforme professionnelle de gestion immobilière pour landlords, tenants, appartements, buildings et opérations immobilières.",
    contactFormTitle: "Écrivez-nous directement",
    nameLabel: "Nom complet",
    subjectLabel: "Sujet",
    messageLabel: "Message",
    sendMessage: "Envoyer le message",
    sending: "Envoi...",
    sent: "Message envoyé. Nous répondrons par email.",
    contactError: "Le message n’a pas pu être envoyé.",
    email: "Mail",
    phone: "Mobile / WhatsApp",
    address: "Adresse",
    addressValue: "Pas encore fixe",
    copyright: "Tous droits réservés.",
  },
} as const;

const platformFeatures = {
  en: [
    {
      title: "Direct rent payment",
      copy: "Collect rent, track obligations, allocate payments, and keep receipts connected to each tenant and unit.",
    },
    {
      title: "Automatic maintenance flow",
      copy: "Tenants report issues, managers triage work, vendors are assigned, and every request stays auditable.",
    },
    {
      title: "Smart tenant communication",
      copy: "Prepare a tenant contact layer with AI assistance, reminders, guided answers, and less repeated landlord stress.",
    },
    {
      title: "Email reminders",
      copy: "Send lease, rent, maintenance, invitation, and operational reminders from the workspace email identity.",
    },
  ],
  fr: [
    {
      title: "Paiement direct du loyer",
      copy: "Collectez les loyers, suivez les obligations, allouez les paiements et gardez les reçus liés au tenant et à l’unité.",
    },
    {
      title: "Maintenance automatique",
      copy: "Les tenants signalent les problèmes, le manager trie, les vendors sont assignés, et chaque requête reste auditable.",
    },
    {
      title: "Communication tenant avec IA",
      copy: "Préparez une couche de contact tenant avec assistance IA, rappels, réponses guidées et moins de stress répétitif.",
    },
    {
      title: "Rappels email",
      copy: "Envoyez les rappels de bail, loyer, maintenance, invitation et opérations depuis l’identité email du workspace.",
    },
  ],
} as const;

const reliefPoints = {
  en: [
    "No more scattered tenant messages",
    "No more missing rent follow-up",
    "No more invisible maintenance work",
    "No more confusion between units, leases, and payments",
  ],
  fr: [
    "Plus de messages tenants dispersés",
    "Plus de suivi loyer oublié",
    "Plus de maintenance invisible",
    "Plus de confusion entre unités, baux et paiements",
  ],
} as const;

const propertyTypes = {
  en: ["Apartments", "Buildings", "Homes", "Commercial shops", "Mixed-use assets"],
  fr: ["Appartements", "Buildings", "Maisons", "Magasins commerciaux", "Actifs mixtes"],
} as const;

const photoSlides = {
  en: [
    ["Apartment operations", "Payments, tenants, leases", "photo-apartments"],
    ["Building management", "Units, maintenance, occupancy", "photo-building"],
    ["Commercial spaces", "Shops and mixed-use assets", "photo-commercial"],
    ["Tenant support", "AI-guided contact layer", "photo-tenant"],
  ],
  fr: [
    ["Gestion appartements", "Paiements, tenants, baux", "photo-apartments"],
    ["Gestion buildings", "Unités, maintenance, occupation", "photo-building"],
    ["Espaces commerciaux", "Magasins et actifs mixtes", "photo-commercial"],
    ["Support tenant", "Contact guidé par IA", "photo-tenant"],
  ],
} as const;

export default function HomePage() {
  const [language, setLanguage] = useState<"en" | "fr">("en");
  const [contactState, setContactState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [contactError, setContactError] = useState<string | null>(null);
  const t = copy[language];

  async function submitContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContactState("sending");
    setContactError(null);

    const contactForm = event.currentTarget;
    const form = new FormData(contactForm);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (fullName.length < 2 || !email.includes("@") || subject.length < 3 || message.length < 5) {
      setContactState("error");
      setContactError(
        language === "fr"
          ? "Complétez correctement tous les champs."
          : "Complete all fields correctly.",
      );
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, subject, message }),
      });
      if (!response.ok) throw new Error(t.contactError);
      contactForm.reset();
      setContactState("sent");
    } catch (reason) {
      setContactState("error");
      setContactError(reason instanceof Error ? reason.message : t.contactError);
    }
  }

  return (
    <main className="home-page">
      <div className="home-energy-field" aria-hidden="true">
        <span className="home-energy-line line-a" />
        <span className="home-energy-line line-b" />
        <span className="home-energy-line line-c" />
        <span className="home-energy-line line-d" />
        <span className="home-energy-line line-e" />
      </div>
      <div className="home-grid" aria-hidden="true" />

      <header className="home-header">
        <Link href="/" className="home-brand">
          <span>
            <Image src="/logo.png" alt="" width={58} height={58} priority />
          </span>
          <div>
            <strong>Asset Hub</strong>
            <small>by Meta Global Vision Holding</small>
          </div>
        </Link>

        <div className="home-header-actions">
          <fieldset className="home-language-switch">
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

          <nav className="home-nav" aria-label="Primary navigation">
            <a href="#platform">{t.navPlatform}</a>
            <a href="#relief">{t.navRelief}</a>
            <a href="#contact">{t.navContact}</a>
            <Link className="home-signin-link" href="/login">
              {t.signIn}
            </Link>
            <Link className="home-nav-primary" href="/register">
              {t.createAccount}
            </Link>
          </nav>
        </div>
      </header>

      <section className="home-slider" aria-label="Asset Hub highlights">
        <div>
          {photoSlides[language].map(([title, subtitle, className]) => (
            <article className={`home-photo-slide ${className}`} key={title}>
              <span>{title}</span>
              <strong>{subtitle}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{t.eyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroCopy}</p>

          <div className="home-actions">
            <Link href="/register">{t.start}</Link>
            <Link href="/login">{t.existing}</Link>
          </div>
        </div>

        <aside className="home-command-card" aria-label="Asset Hub operations preview">
          <div className="home-command-top">
            <Image src="/logo.png" alt="Asset Hub" width={76} height={76} />
            <span>{t.live}</span>
          </div>
          <div className="home-command-metric">
            <strong>124</strong>
            <span>{t.units}</span>
          </div>
          <div className="home-command-list">
            <p>
              <span>✓</span> {t.paymentReceived}
            </p>
            <p>
              <span>✓</span> {t.reminderScheduled}
            </p>
            <p>
              <span>✓</span> {t.maintenanceAssigned}
            </p>
            <p>
              <span>✓</span> {t.aiDrafted}
            </p>
          </div>
          <div className="home-logo-block">
            <Image src="/img.jpeg" alt="Asset Hub" width={270} height={300} />
          </div>
        </aside>
      </section>

      <section className="home-property-strip" aria-label="Supported real estate assets">
        {propertyTypes[language].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </section>

      <section className="home-section" id="platform">
        <div className="home-section-heading">
          <p className="home-eyebrow">{t.platformEyebrow}</p>
          <h2>{t.platformTitle}</h2>
          <p>{t.platformCopy}</p>
        </div>

        <div className="home-feature-grid">
          {platformFeatures[language].map((feature, index) => (
            <article key={feature.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-relief" id="relief">
        <div>
          <p className="home-eyebrow">{t.reliefEyebrow}</p>
          <h2>{t.reliefTitle}</h2>
          <p>{t.reliefCopy}</p>
        </div>

        <div className="home-relief-list">
          {reliefPoints[language].map((item) => (
            <p key={item}>
              <span>✓</span>
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="home-contact" id="contact">
        <div>
          <p className="home-eyebrow">{t.contactEyebrow}</p>
          <h2>{t.contactTitle}</h2>
          <p>{t.contactCopy}</p>
        </div>
        <div className="home-contact-grid">
          <article>
            <span>{t.email}</span>
            <a href="mailto:chrismonga11@outlook.com">chrismonga11@outlook.com</a>
          </article>
          <article>
            <span>{t.phone}</span>
            <a href="https://wa.me/243971966536">+243 971 966 536</a>
          </article>
          <article>
            <span>{t.address}</span>
            <strong>{t.addressValue}</strong>
          </article>
        </div>
        <form className="home-contact-form" onSubmit={submitContact} noValidate>
          <h3>{t.contactFormTitle}</h3>
          <label>
            <span>{t.nameLabel}</span>
            <input name="fullName" minLength={2} maxLength={160} required />
          </label>
          <label>
            <span>{t.email}</span>
            <input name="email" type="email" maxLength={320} required />
          </label>
          <label>
            <span>{t.subjectLabel}</span>
            <input name="subject" minLength={3} maxLength={160} required />
          </label>
          <label>
            <span>{t.messageLabel}</span>
            <textarea name="message" minLength={5} maxLength={3000} rows={5} required />
          </label>
          {contactState === "sent" ? <p className="home-contact-success">{t.sent}</p> : null}
          {contactState === "error" ? (
            <p className="home-contact-error">{contactError ?? t.contactError}</p>
          ) : null}
          <button type="submit" disabled={contactState === "sending"}>
            {contactState === "sending" ? t.sending : t.sendMessage}
            <span>→</span>
          </button>
        </form>
      </section>

      <section className="home-final">
        <p className="home-eyebrow">Asset Hub</p>
        <h2>{t.finalTitle}</h2>
        <div className="home-actions">
          <Link href="/register">{t.start}</Link>
          <Link href="/login">{t.signIn}</Link>
        </div>
      </section>

      <footer className="home-footer">
        <span>© {new Date().getFullYear()} Meta Global Vision Holding</span>
        <span>Asset Hub — {t.copyright}</span>
      </footer>
    </main>
  );
}
