const foundations = [
  ["Identity", "Secure sessions and MFA-ready ownership"],
  ["Isolation", "Organization context on every business operation"],
  ["Readiness", "Activation based on authoritative records"],
] as const;

export default function HomePage() {
  return (
    <main className="foundation-page">
      <div className="ambient ambient-primary" aria-hidden="true" />
      <div className="ambient ambient-secondary" aria-hidden="true" />

      <header className="site-header">
        <a className="brand" href="/" aria-label="The Home Land home">
          <span className="brand-mark" aria-hidden="true">
            <i />
          </span>
          The Home Land
        </a>
        <span className="environment-pill">
          <i aria-hidden="true" /> Foundation environment
        </span>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">Property operations · Reimagined</p>
        <h1 id="hero-title">A secure foundation for every property decision.</h1>
        <p className="hero-copy">
          The Home Land is becoming an operational workspace where portfolios, leases, rent,
          maintenance, and intelligence remain connected and accountable.
        </p>

        <div className="status-card">
          <div>
            <span className="status-icon" aria-hidden="true">
              ✓
            </span>
            <p>
              <strong>Walking skeleton initialized</strong>
              <small>Next.js · NestJS · PostgreSQL · Prisma</small>
            </p>
          </div>
          <a href="/register">
            Start secure registration <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="foundation-grid">
          {foundations.map(([title, description], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>Phase 1</span>
        <p className="phase-name">Onboarding walking skeleton</p>
      </footer>
    </main>
  );
}
