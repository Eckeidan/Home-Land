import Link from "next/link";
import type { ReactNode } from "react";

interface AppShellProps {
  organizationId: string;
  organizationName: string;
  workspaceSlug: string | null;
  children: ReactNode;
}

const navigation = [
  ["Overview", "⌂", false],
  ["Portfolio", "◇", true],
  ["Leasing", "≡", false],
  ["Rent", "$", false],
  ["Maintenance", "△", false],
] as const;

export function AppShell({
  organizationId,
  organizationName,
  workspaceSlug,
  children,
}: AppShellProps) {
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="app-logo" href="/">
          <span className="app-logo-mark" aria-hidden="true">
            H
          </span>
          <strong>The Home Land</strong>
        </Link>
        <div className="workspace-switcher">
          <small>Workspace</small>
          <strong>{organizationName}</strong>
          <span className="workspace-slug">{workspaceSlug ?? "setup"}</span>
        </div>
        <nav className="app-navigation" aria-label="Primary navigation">
          {navigation.map(([label, icon, active]) =>
            active ? (
              <Link
                key={label}
                className="app-nav-item is-active"
                href={`/app/${organizationId}/portfolio`}
                aria-current="page"
              >
                <span className="app-nav-icon" aria-hidden="true">
                  {icon}
                </span>
                {label}
              </Link>
            ) : (
              <span key={label} className="app-nav-item is-disabled" aria-disabled="true">
                <span className="app-nav-icon" aria-hidden="true">
                  {icon}
                </span>
                {label}
                <small>soon</small>
              </span>
            ),
          )}
        </nav>
        <div className="app-sidebar-foot">
          <span className="security-dot" />
          Secure owner session
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div>
            <span className="app-mobile-mark">H</span>
            <p>Property operations</p>
          </div>
          <button className="command-trigger" type="button" disabled>
            <span>Search or command</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="app-avatar" role="img" aria-label="Owner account">
            O
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
