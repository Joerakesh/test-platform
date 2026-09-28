"use client";

import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, Meter, StatCard } from "@/components/Primitives";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime, percent } from "@/lib/format";

const STATUS_TONE = { active: "green", upcoming: "gold", ended: "grey", closed: "grey" };

export default function TeacherDashboard() {
  const dashboard = useApiData("/api/dashboard");
  const sessions = useApiData("/api/sessions");

  return (
    <AppShell>
      <PageHead
        title="Teacher Dashboard"
        tamil="ஆசிரியர் முகப்பு"
        breadcrumb={<>Home / Teaching</>}
      >
        <Link className="btn btn-outline" href="/teacher/students">
          My students
        </Link>
        <Link className="btn" href="/teacher/sessions/new">
          Schedule a test
        </Link>
      </PageHead>

      {dashboard.error && <Alert type="error">{dashboard.error}</Alert>}
      {dashboard.loading && <Loading />}

      {dashboard.data && (
        <>
          <div className="grid grid-4 mb-3">
            <StatCard label="My students" value={dashboard.data.stats.students} tone="red" icon="👦" />
            <StatCard label="Test papers" value={dashboard.data.stats.tests} tone="gold" icon="📝" />
            <StatCard label="Bank questions" value={dashboard.data.stats.bankQuestions} tone="blue" icon="🗂" />
            <StatCard label="Sessions" value={dashboard.data.stats.sessions} tone="green" icon="🗓" />
          </div>

          <div className="grid grid-4 mb-3">
            <StatCard label="Live now" value={dashboard.data.stats.live} tone="red" icon="🔴" />
            <StatCard label="Scheduled" value={dashboard.data.stats.upcoming} tone="gold" icon="⏳" />
            <StatCard label="Submissions" value={dashboard.data.stats.attempts} tone="blue" icon="📊" />
            <StatCard label="Classes in use" value={dashboard.data.classBreakdown.length} tone="green" icon="🏫" />
          </div>

          <div className="grid grid-sidebar">
            <div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    My test sessions
                    <span className="card-title-tamil tamil">தேர்வு அமர்வுகள்</span>
                  </div>
                  <Link className="btn btn-outline btn-sm" href="/teacher/sessions">
                    View all
                  </Link>
                </div>

                {sessions.loading ? (
                  <Loading />
                ) : (sessions.data?.sessions || []).length === 0 ? (
                  <EmptyState
                    icon="🗓"
                    title="No test sessions yet"
                    action={
                      <Link className="btn" href="/teacher/sessions/new">
                        Schedule your first test
                      </Link>
                    }
                  >
                    Choose a paper, pick a time window and assign a class or individual students.
                  </EmptyState>
                ) : (
                  <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Paper</th>
                          <th>Window</th>
                          <th>Assigned</th>
                          <th className="right">Submitted</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {(sessions.data?.sessions || []).slice(0, 8).map((s) => (
                          <tr key={s.id}>
                            <td className="cell-primary">
                              {s.test?.title || "—"}
                              {s.test?.subject && <div className="cell-sub">{s.test.subject}</div>}
                            </td>
                            <td className="cell-sub">
                              {formatDateTime(s.startTime)}
                              <br />
                              to {formatDateTime(s.endTime)}
                            </td>
                            <td className="mono">{s.assignedCount}</td>
                            <td className="right mono">
                              {s.attemptCount}
                              <span className="cell-sub"> / {s.assignedCount}</span>
                            </td>
                            <td>
                              <Badge tone={STATUS_TONE[s.status]} live={s.status === "active"}>
                                {s.statusLabel}
                              </Badge>
                            </td>
                            <td>
                              <div className="table-actions">
                                <Link className="btn btn-outline btn-sm" href={`/teacher/sessions/${s.id}`}>
                                  Open
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    Latest submissions
                    <span className="card-title-tamil tamil">சமீபத்திய சமர்ப்பங்கள்</span>
                  </div>
                </div>
                {dashboard.data.recentAttempts.length === 0 ? (
                  <EmptyState icon="📊" title="No submissions yet" />
                ) : (
                  <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Paper</th>
                          <th className="right">Score</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.data.recentAttempts.map((a) => (
                          <tr key={a.id}>
                            <td className="cell-primary">
                              {a.student}
                              {a.rollNo && <span className="cell-sub"> · {a.rollNo}</span>}
                            </td>
                            <td>{a.test}</td>
                            <td className="right mono">
                              {a.score} / {a.totalMarks}
                              {a.pending && (
                                <div>
                                  <Badge tone="gold">Needs review</Badge>
                                </div>
                              )}
                            </td>
                            <td className="cell-sub">{formatDateTime(a.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="card card-accent">
                <div className="card-head">
                  <div className="card-title">Build a question paper</div>
                </div>
                <div className="card-body stack">
                  <Link className="btn btn-block" href="/teacher/tests/new">
                    ✍ Type the questions
                  </Link>
                  <Link className="btn btn-outline btn-block" href="/teacher/tests/new?mode=csv">
                    ⬆ Upload a CSV paper
                  </Link>
                  <Link className="btn btn-outline btn-block" href="/teacher/bank">
                    🗂 Pick from the question bank
                  </Link>
                  <div className="hint mt-1">
                    Need a quick starter file? Download the CSV template and fill it in Excel or Google
                    Sheets.
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">My classes</div>
                </div>
                <div className="card-body">
                  {dashboard.data.classBreakdown.length === 0 ? (
                    <p className="muted small mb-0">
                      Add students from the Students page and give them a class to see it here.
                    </p>
                  ) : (
                    <div className="stack" style={{ gap: 12 }}>
                      {dashboard.data.classBreakdown.map((c) => (
                        <div key={c.label}>
                          <div className="spread small">
                            <strong>Class {c.label}</strong>
                            <span className="muted">{c.count}</span>
                          </div>
                          <Meter value={c.count} max={Math.max(...dashboard.data.classBreakdown.map((x) => x.count))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
