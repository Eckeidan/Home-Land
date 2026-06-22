import Link from "next/link";

export default function PortfolioNextPage() {
  return (
    <main className="identity-shell">
      <section className="identity-card identity-success">
        <p className="identity-eyebrow">Team step complete or skipped</p>
        <h1>Your first property and unit are next.</h1>
        <p>
          The invitation step does not block onboarding. Portfolio creation will be the next atomic
          vertical slice.
        </p>
        <Link className="identity-secondary-link" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
