"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Seal from "./Seal";
import { SCHOOL } from "@/lib/school";
import { initials } from "@/lib/format";
import { api, errorMessage } from "@/lib/api";

const NAV = {
  admin: [
    {
      heading: "Administration",
      items: [
        { href: "/admin", label: "Dashboard", tamil: "முகப்பு", icon: "▦", exact: true },
        { href: "/admin/teachers", label: "Teachers", tamil: "ஆசிரியர்கள்", icon: "👩‍🏫" },
        { href: "/admin/classes", label: "Classes & Sections", tamil: "வகுப்புகள்", icon: "🏫" },
        { href: "/admin/reports", label: "School Reports", tamil: "அறிக்கைகள்", icon: "📈" },
      ],
    },
  ],
  teacher: [
    {
      heading: "Teaching",
      items: [
        { href: "/teacher", label: "Dashboard", tamil: "முகப்பு", icon: "▦", exact: true },
        { href: "/teacher/tests", label: "Tests", tamil: "தேர்வுகள்", icon: "📝" },
        { href: "/teacher/bank", label: "Question Bank", tamil: "கேள்வி வங்கி", icon: "🗂" },
        { href: "/teacher/sessions", label: "Test Sessions", tamil: "தேர்வு அமர்வு", icon: "🗓" },
      ],
    },
    {
      heading: "Students",
      items: [
        { href: "/teacher/students", label: "Students", tamil: "மாணவர்கள்", icon: "👦" },
        { href: "/teacher/classes", label: "Classes", tamil: "வகுப்புகள்", icon: "🏫" },
      ],
    },
  ],
  student: [
    {
      heading: "Examination",
      items: [
        { href: "/student", label: "My Tests", tamil: "எனது தேர்வுகள்", icon: "📝", exact: true },
        { href: "/student/results", label: "My Results", tamil: "எனது முடிவுகள்", icon: "📊" },
      ],
    },
  ],
};

export default function AppShell({ children, user: initialUser, title }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(initialUser || null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!initialUser) {
      api("/api/auth/me")
        .then((d) => active && setUser(d.user))
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [initialUser]);

  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
    }
    router.push("/login");
    router.refresh();
  }

  const groups = NAV[user?.role] || [];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href={`/${user?.role || "login"}`} className="brand">
            <Seal />
            <span className="brand-text">
              <span className="brand-name">{SCHOOL.name}</span>
              <span className="brand-sub">{SCHOOL.authority} · Examination Cell</span>
            </span>
          </Link>

          <div className="topbar-actions">
            {user && (
              <div className="chip-user">
                <span className="avatar">{initials(user.name)}</span>
                <span className="nowrap">
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                    {user.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 10.5,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--yellow-400)",
                    }}
                  >
                    {user.role}
                  </span>
                </span>
              </div>
            )}
            <button
              className="btn btn-gold btn-sm"
              onClick={logout}
              disabled={busy}
              title="Sign out"
            >
              {busy ? "…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          {groups.map((group) => (
            <div className="nav-group" key={group.heading}>
              <div className="nav-heading">{group.heading}</div>
              {group.items.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-link ${active ? "active" : ""}`}
                  >
                    <span className="nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    <span className="nav-tamil">{item.tamil}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="nav-group" style={{ marginTop: 24 }}>
            <div className="tiny muted" style={{ padding: "0 10px", lineHeight: 1.5 }}>
              <div className="tamil">{SCHOOL.nameTamil}</div>
              <div style={{ marginTop: 6 }}>
                Academic Year {SCHOOL.academicYear}
              </div>
            </div>
          </div>
        </aside>

        <main className="content">{title ? <h1 className="mb-2">{title}</h1> : null}{children}</main>
      </div>
    </div>
  );
}

export function PageHead({ title, tamil, breadcrumb, children }) {
  return (
    <>
      {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          {tamil && <div className="page-title-tamil tamil">{tamil}</div>}
        </div>
        {children && <div className="row-wrap">{children}</div>}
      </div>
    </>
  );
}
