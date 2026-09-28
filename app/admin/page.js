"use client";

import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, Meter, StatCard } from "@/components/Primitives";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime, percent } from "@/lib/format";

export default function AdminDashboard() {
  const { data, loading, error } = useApiData("/api/dashboard");

  return (
    <AppShell>
      <PageHead
        title="School Dashboard"
        tamil="பள்ளி முகப்பு"
        breadcrumb={<>Home / Administration</>}
      >
        <Link className="btn btn-outline" href="/admin/teachers">
          Manage teachers
        </Link>
        <Link className="btn" href="/admin/reports">
          School reports
        </Link>
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}
      {loading && <Loading />}

      {data && (
        <>
          <div className="grid grid-4 mb-3">
            <StatCard label="Teachers" value={data.stats.teachers ?? 0} tone="red" icon="👩‍🏫" />
            <StatCard label="Students" value={data.stats.students} tone="gold" icon="👦" />
            <StatCard label="Classes" value={data.stats.classes} tone="blue" icon="🏫" />
            <StatCard label="Tests" value={data.stats.tests} tone="green" icon="📝" />
          </div>

          <div className="grid grid-4 mb-3">
            <StatCard label="Test sessions" value={data.stats.sessions} tone="red" icon="🗓" />
            <StatCard label="Live now" value={data.stats.live} tone="green" icon="🔴" />
            <StatCard label="Scheduled" value={data.stats.upcoming} tone="gold" icon="⏳" />
            <StatCard label="Submissions" value={data.stats.attempts} tone="blue" icon="📊" />
          </div>

          <div className="grid grid-sidebar">
            <div>
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    Recent test papers
                    <span className="card-title-tamil tamil">சமீபத்திய வினாத்தாள்கள்</span>
                  </div>
                  <span className="small muted">{data.stats.tests} in total</span>
                </div>

                {data.recentTests.length === 0 ? (
                  <EmptyState icon="📝" title="No test papers yet">
                    Teachers create their own papers. Once they do, they appear here.
                  </EmptyState>
                ) : (
                  <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Paper</th>
                          <th>Subject</th>
                          <th>Class</th>
                          <th className="right">Questions</th>
                          <th className="right">Marks</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentTests.map((t) => (
                          <tr key={t.id}>
                            <td className="cell-primary">{t.title}</td>
                            <td>{t.subject || "—"}</td>
                            <td>{t.className || "—"}</td>
                            <td className="right mono">{t.questionCount}</td>
                            <td className="right mono">{t.totalMarks}</td>
                            <td className="cell-sub">{formatDateTime(t.createdAt)}</td>
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
                {data.recentAttempts.length === 0 ? (
                  <EmptyState icon="📊" title="No submissions recorded yet" />
                ) : (
                  <div className="table-wrap" style={{ border: 0, boxShadow: "none" }}>
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
                        {data.recentAttempts.map((a) => (
                          <tr key={a.id}>
                            <td className="cell-primary">
                              {a.student}
                              {a.rollNo && <span className="cell-sub"> · Roll {a.rollNo}</span>}
                            </td>
                            <td>{a.test}</td>
                            <td className="right mono">
                              {a.score} / {a.totalMarks}
                              {a.pending && (
                                <div>
                                  <Badge tone="gold">Review</Badge>
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
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Students by class</div>
                </div>
                <div className="card-body">
                  {data.classBreakdown.length === 0 ? (
                    <p className="muted small mb-0">No students have been added yet.</p>
                  ) : (
                    <div className="stack" style={{ gap: 12 }}>
                      {data.classBreakdown.map((c) => (
                        <div key={c.label}>
                          <div className="spread small">
                            <strong>Class {c.label}</strong>
                            <span className="muted">{c.count} students</span>
                          </div>
                          <Meter
                            value={c.count}
                            max={Math.max(...data.classBreakdown.map((x) => x.count))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">Quick actions</div>
                </div>
                <div className="card-body stack">
                  <Link className="btn btn-outline btn-block" href="/admin/teachers">
                    Add a teacher account
                  </Link>
                  <Link className="btn btn-outline btn-block" href="/admin/classes">
                    Create classes & sections
                  </Link>
                  <Link className="btn btn-outline btn-block" href="/admin/reports">
                    Download all records (CSV)
                  </Link>
                </div>
              </div>

              {data.liveSessions.length > 0 && (
                <div className="card">
                  <div className="card-head">
                    <div className="card-title">Live sessions</div>
                  </div>
                  <div className="card-body stack" style={{ gap: 8 }}>
                    {data.liveSessions.map((s) => (
                      <div key={s._id} className="spread">
                        <span className="small">Test in progress</span>
                        <Badge tone="green" live>
                          Live
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
