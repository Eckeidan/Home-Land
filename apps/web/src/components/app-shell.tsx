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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("thl_theme") === "light" ? "light" : "dark";
    const savedSidebar = window.localStorage.getItem("asset_sidebar") === "collapsed";

    setTheme(savedTheme);
    setCollapsed(savedSidebar);
    document.documentElement.dataset.theme = savedTheme;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("thl_theme", next);
    document.documentElement.dataset.theme = next;
  }

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("asset_sidebar", next ? "collapsed" : "expanded");
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
    <div className={`app-frame${collapsed ? " is-sidebar-collapsed" : ""}`}>
      <aside className="app-sidebar">
        <button
          className="sidebar-toggle"
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {collapsed ? "→" : "←"}
        </button>

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
          {navigation.map(([label, icon, path]) => (
            <Link
              key={label}
              className={`app-nav-item${activeSection === label ? " is-active" : ""}`}
              href={path ? `/app/${organizationId}/${path}` : `/app/${organizationId}`}
              aria-current={activeSection === label ? "page" : undefined}
              title={label}
            >
              <span className="app-nav-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="app-nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="app-sidebar-foot">
          <span className="security-dot" />
          <span>Secure owner session</span>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-brand">
            <span className="app-mobile-mark">H</span>
            <div>
              <strong>Asset Hub</strong>
              <p>Property operations command layer</p>
            </div>
          </div>

          <button className="command-trigger" type="button" disabled>
            <span>Search portfolio, tenants, payments…</span>
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
