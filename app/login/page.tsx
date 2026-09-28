// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Seal from "@/components/Seal";
import { Alert } from "@/components/Primitives";
import { SCHOOL } from "@/lib/school";
import { api, errorMessage } from "@/lib/api";
import Image from "next/image";

const DEMO = [
  { role: "Administrator", id: "admin", pass: "admin123" },
  { role: "Teacher", id: "teacher", pass: "teacher123" },
  { role: "Student", id: "student", pass: "student123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { identifier, password },
      });
      router.push(`/${data.user.role}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function useDemo(demo) {
    setIdentifier(demo.id);
    setPassword(demo.pass);
    setError("");
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="hero-inner">
          <div className="hero-seal">
            {/* <Seal size="xl" className="hero-seal-svg" /> */}
            {/* <Image src={"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Seal_of_Tamil_Nadu.svg/1280px-Seal_of_Tamil_Nadu.svg.png?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=thumbnail"} width={150} height={150}/> */}
          </div>

          <div className="hero-eyebrow">{SCHOOL.authority}</div>
          <h1 className="hero-title">{SCHOOL.name}</h1>
          <div className="hero-title-tamil tamil">{SCHOOL.nameTamil}</div>
          <div className="hero-rule" />

          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.9)", marginBottom: 0 }}>
            Online examination cell for setting question papers, scheduling test sessions and
            publishing mark registers.
          </p>

          <div className="hero-points">
            <div className="hero-point">
              <span className="hero-point-icon">📝</span>
              <span>Question papers in four formats — MCQ, True/False, multiple correct and short answer</span>
            </div>
            <div className="hero-point">
              <span className="hero-point-icon">⬆</span>
              <span>Build a whole paper from a CSV file in a single upload</span>
            </div>
            <div className="hero-point">
              <span className="hero-point-icon">⬇</span>
              <span>Download the mark register and results as CSV for the school records</span>
            </div>
            <div className="hero-point">
              <span className="hero-point-icon">🕒</span>
              <span>Automatic grading, negative marking and a timed session window</span>
            </div>
          </div>

          <div className="tiny" style={{ marginTop: 26, color: "rgba(255,255,255,0.6)" }}>
            Academic Year {SCHOOL.academicYear} · {SCHOOL.place}
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-logo">
            {/* <Seal size="lg" /> */}
            <Image src={"https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7c/Seal_of_Tamil_Nadu.svg/1280px-Seal_of_Tamil_Nadu.svg.png?utm_source=en.wikipedia.org&utm_campaign=index&utm_content=thumbnail"} width={150} height={150}/>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
                Examination Cell
              </div>
              <div className="tamil small" style={{ color: "var(--ink-500)" }}>
                பரீட்சை மையம்
              </div>
            </div>
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="identifier">
                Register number or email
              </label>
              <input
                id="identifier"
                name="identifier"
                autoComplete="username"
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="9A001 or teacher@school.edu"
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button className="btn btn-block btn-lg" type="submit" disabled={busy}>
              {busy ? <span className="spinner spinner-sm" /> : "Sign in"}
            </button>
          </form>

          {/* <div className="demo-accounts">
            <div className="spread mb-1">
              <strong>Demo accounts</strong>
              <span className="tiny">click to fill</span>
            </div>
            {DEMO.map((d) => (
              <button
                key={d.id}
                type="button"
                className="demo-account"
                onClick={() => useDemo(d)}
                style={{ background: "none", border: 0, width: "100%", cursor: "pointer" }}
              >
                <span>{d.role}</span>
                <code>
                  {d.id} / {d.pass}
                </code>
              </button>
            ))}
            <p className="tiny mt-1 mb-0">
              Demo accounts are created by <code>npm run seed:demo</code>. Remove them before the
              school uses this system.
            </p>
          </div> */}

          <p className="tiny muted center mt-3 mb-0">
            Internal academic use only. Not an official Government of Tamil Nadu website.
          </p>
        </div>
      </section>
    </div>
  );
}
