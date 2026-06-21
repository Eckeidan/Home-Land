import Link from "next/link";

export default function OrganizationPlaceholderPage() {
  return (
    <main className="identity-shell">
      <section className="identity-card identity-success">
        <span className="identity-success-mark" aria-hidden="true">
          ✓
        </span>
        <p className="identity-eyebrow">Identity foundation complete</p>
        <h1>Organization setup is next.</h1>
        <p>
          This boundary is intentionally not implemented in the identity slice. Your verified
          session is ready for the next domain command.
        </p>
        <Link className="identity-secondary-link" href="/">
          Return to foundation
        </Link>
      </section>
    </main>
  );
}
