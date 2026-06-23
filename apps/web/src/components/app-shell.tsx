"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

interface AppShellProps {
  organizationId: string;
  organizationName: string;
  workspaceSlug: string | null;
  activeSection?: "Overview" | "Portfolio" | "Leasing" | "Rent" | "Maintenance";
  children: ReactNode;
}

const navigation = [
  ["Overview", "⌂", ""],
  ["Portfolio", "◇", "portfolio"],
  ["Leasing", "≡", "leasing"],
  ["Rent", "$", "rent"],
  ["Maintenance", "△", "maintenance"],
] as const;

export function AppShell({
  organizationId,
  organizationName,
  workspaceSlug,
  activeSection = "Portfolio",
  children,
}: AppShellProps) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("thl_theme") === "light" ? "light" : "dark";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("thl_theme", next);
    document.documentElement.dataset.theme = next;
  }

  async function logout() {
    const cookieName = process.env.NODE_ENV === "production" ? "__Host-thl_csrf=" : "thl_csrf=";
    const csrf = document.cookie
      .split("; ")
      .find((value) => value.startsWith(cookieName))
      ?.slice(cookieName.length);
    await fetch(`${api}/auth/sessions/current/logout`, {
      method: "POST",
      credentials: "include",
      headers: csrf ? { "X-CSRF-Token": decodeURIComponent(csrf) } : {},
    }).catch(() => undefined);
    window.location.href = "/";
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Link className="app-logo" href="/">
          <span className="app-logo-mark" aria-hidden="true">
            H
          </span>
          <strong>Asset Hub</strong>
        </Link>
        <div className="workspace-switcher">
          <small>Workspace</small>
          <strong>{organizationName}</strong>
          <span className="workspace-slug">{workspaceSlug ?? "setup"}</span>
        </div>
        <nav className="app-navigation" aria-label="Primary navigation">
          {navigation.map(([label, icon, path]) =>
            path !== null ? (
              <Link
                key={label}
                className={`app-nav-item${activeSection === label ? " is-active" : ""}`}
                href={path ? `/app/${organizationId}/${path}` : `/app/${organizationId}`}
                aria-current={activeSection === label ? "page" : undefined}
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
          <div className="app-topbar-actions">
            <button className="theme-toggle" type="button" onClick={toggleTheme}>
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button className="logout-button" type="button" onClick={() => void logout()}>
              Logout
            </button>
            <div className="app-avatar" role="img" aria-label="Owner account">
              O
            </div>
          </div>
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
