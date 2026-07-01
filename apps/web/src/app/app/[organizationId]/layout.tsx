"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button, TextField } from "../../../components/ui";
import "./layout.css";

type Props = {
  children: ReactNode;
};

interface WorkspaceContext {
  organization: {
    id: string;
    displayName: string;
    slug: string | null;
    status: string;
  };
  membership: {
    role: string;
  };
  user: {
    email: string;
    fullName: string | null;
  };
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

const navigation = [
  { label: "Overview", href: "", icon: "⌂" },
  { label: "Portfolio", href: "portfolio", icon: "▦" },
  { label: "Leasing", href: "leasing", icon: "≡" },
  { label: "Rent", href: "rent", icon: "$" },
  { label: "Maintenance", href: "maintenance", icon: "△" },
  { label: "Settings", href: "settings", icon: "⚙" },
];

async function readCsrfToken(): Promise<string | null> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, { credentials: "include" });
  if (!response.ok) return null;
  const body = (await response.json()) as { csrfToken?: string };
  return body.csrfToken ?? null;
}

export default function OrganizationLayout({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const { organizationId } = useParams<{ organizationId: string }>();
  const [context, setContext] = useState<WorkspaceContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      setError(null);
      try {
        const response = await fetch(
          `${apiBaseUrl}/organizations/${organizationId}/workspace-context`,
          {
            credentials: "include",
          },
        );
        const body = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(body?.title ?? "Authentication required");
        }
        if (!cancelled) setContext(body as WorkspaceContext);
      } catch (reason) {
        if (!cancelled) {
          setContext(null);
          setError(reason instanceof Error ? reason.message : "Authentication required");
        }
      }
    }

    void loadContext();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const initials = useMemo(() => {
    const label = context?.user.fullName ?? context?.user.email ?? "U";
    return label
      .split(/[ @.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [context]);

  async function logout() {
    setLoggingOut(true);
    try {
      const csrf = await readCsrfToken();
      await fetch(`${apiBaseUrl}/auth/sessions/current/logout`, {
        method: "POST",
        credentials: "include",
        ...(csrf ? { headers: { "X-CSRF-Token": csrf } } : {}),
      });
    } finally {
      router.push("/login");
    }
  }

  if (error) {
    return (
      <main className="asset-shell-state">
        <div>
          <p className="asset-eyebrow">Asset Hub</p>
          <h1>Authentication required</h1>
          <p>{error}</p>
          <Link className="ui-button ui-button-primary" href="/login">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (!context) {
    return (
      <main className="asset-shell-state">
        <div>
          <p className="asset-eyebrow">Asset Hub</p>
          <h1>Loading workspace…</h1>
          <p>Reading organization context and membership.</p>
        </div>
      </main>
    );
  }

  return (
    <div className="asset-shell">
      <aside className="asset-sidebar">
        <Link className="asset-brand" href={`/app/${organizationId}`}>
          <span className="asset-logo">A</span>
          <span>
            <strong>Asset Hub</strong>
            <small>Meta Global Vision Holding</small>
          </span>
        </Link>

        <div className="asset-workspace-card">
          <small>Workspace</small>
          <strong>{context.organization.displayName}</strong>
          <span>{context.organization.slug ?? context.organization.status.toLowerCase()}</span>
        </div>

        <nav className="asset-nav" aria-label="Workspace navigation">
          {navigation.map((item) => {
            const href = item.href
              ? `/app/${organizationId}/${item.href}`
              : `/app/${organizationId}`;
            const active = item.href
              ? pathname === href || pathname.startsWith(`${href}/`)
              : pathname === href;

            return (
              <Link key={item.label} href={href} className={active ? "active" : ""}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="asset-sidebar-note">
          <strong>Organization scoped</strong>
          <p>Every workspace request must carry this organization boundary.</p>
        </div>
      </aside>

      <section className="asset-main">
        <header className="asset-header">
          <div>
            <p className="asset-eyebrow">Property operations</p>
            <strong>{context.organization.displayName}</strong>
          </div>

          <TextField placeholder="Search properties, tenants, leases, payments..." />

          <div className="asset-profile">
            <div className="asset-avatar">{initials || "U"}</div>
            <div>
              <strong>{context.user.fullName ?? context.user.email}</strong>
              <span>{context.membership.role}</span>
            </div>
            <Button type="button" disabled={loggingOut} onClick={() => void logout()}>
              {loggingOut ? "..." : "Logout"}
            </Button>
          </div>
        </header>

        <main className="asset-content">{children}</main>
      </section>
    </div>
  );
}
