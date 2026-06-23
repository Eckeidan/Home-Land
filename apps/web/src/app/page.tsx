const assetTypes = [
  ["Apartments", "Units, leases, rent, maintenance, occupancy."],
  ["Homes", "Single-family rentals with accountable records."],
  ["Buildings", "Multi-unit operations with one source of truth."],
  ["Commercial shops", "Storefronts, commercial spaces, and mixed-use assets."],
] as const;

const outcomes = [
  ["Create your organization", "Open a secure owner account and establish your operating entity."],
  ["Add properties and units", "Represent every house, apartment, building, shop, and unit."],
  ["Operate daily work", "Track tenants, leases, rent, maintenance, exceptions, and activity."],
] as const;

export default function HomePage() {
  return (
    <main className="foundation-page marketing-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Asset Hub home">
          <span className="brand-mark" aria-hidden="true">
            <i />
          </span>
          <span>
            Asset Hub
            <small>by Meta Global Vision Holding</small>
          </span>
        </a>
        <nav className="marketing-nav" aria-label="Public navigation">
          <a href="/login">Sign in</a>
          <a className="marketing-nav-primary" href="/register">
            Create account
          </a>
        </nav>
      </header>

      <section className="hero marketing-hero" aria-labelledby="hero-title">
        <p className="eyebrow">Property and asset operations platform</p>
        <h1 className="marketing-title" id="hero-title">
          Manage apartments, homes, buildings, and commercial units from one hub.
        </h1>
        <p className="hero-copy">
          Asset Hub helps landlords, property managers, and real-estate operators create an
          organization, add units, manage tenants, prepare leases, follow rent, and resolve
          maintenance work without losing operational control.
        </p>

        <div className="marketing-cta-row">
          <a className="marketing-primary-cta" href="/register">
            Register your organization <span aria-hidden="true">→</span>
          </a>
          <a className="marketing-secondary-cta" href="/login">
            I already have an account
          </a>
        </div>

        <section className="marketing-showcase" aria-label="Asset Hub overview">
          <div className="marketing-photo-grid">
            <article className="property-photo photo-apartment">
              <span>Apartment portfolio</span>
              <strong>Leases, rent, units</strong>
            </article>
            <article className="property-photo photo-house">
              <span>Homes</span>
              <strong>Single-family rentals</strong>
            </article>
            <article className="property-photo photo-building">
              <span>Buildings</span>
              <strong>Multi-unit operations</strong>
            </article>
            <article className="property-photo photo-commercial">
              <span>Commercial</span>
              <strong>Shops and mixed-use spaces</strong>
            </article>
          </div>
          <div className="marketing-copy-card">
            <p className="eyebrow">Built for operators</p>
            <h2>Give every landlord a clean place to start.</h2>
            <p>
              Anyone can create an owner account, create an organization, then add properties,
              buildings, units, apartments, and commercial spaces with tenant-safe boundaries.
            </p>
            <div className="marketing-stats">
              <span>
                <strong>248</strong>
                Units tracked
              </span>
              <span>
                <strong>96%</strong>
                Occupied
              </span>
              <span>
                <strong>7</strong>
                Open maintenance
              </span>
            </div>
          </div>
        </section>

        <div className="foundation-grid marketing-grid">
          {assetTypes.map(([title, description], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>

        <div className="foundation-grid marketing-grid compact">
          {outcomes.map(([title, description], index) => (
            <article key={title}>
              <span>Step 0{index + 1}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>Meta Global Vision Holding</span>
        <p className="phase-name">Asset Hub · Property operations SaaS</p>
      </footer>
    </main>
  );
}
