// @ts-nocheck
"use client";

import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, StatCard } from "@/components/Primitives";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime } from "@/lib/format";

const STATUS_TONE = { active: "green", upcoming: "gold", ended: "grey", closed: "grey" };

export default function StudentPage() {
  const { data, loading, error } = useApiData("/api/sessions");
  const dashboard = useApiData("/api/dashboard");

  const sessions = data?.sessions || [];
  const stats = dashboard.data?.stats;

  const activeSessions = sessions.filter((s) => s.status === "active");
  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const endedSessions = sessions.filter((s) => s.status === "ended" || s.status === "closed");

  return (
    <AppShell>
      <PageHead
        title="My Tests"
        tamil="எனது தேர்வுகள்"
        breadcrumb={<>Home / Examination</>}
      >
        <Link className="btn btn-outline" href="/student/results">
          My Results
        </Link>
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}

      {stats && (
        <div className="grid grid-4 mb-3">
          <StatCard label="Upcoming" value={stats.upcoming || 0} tone="gold" icon="⏳" />
          <StatCard label="Live now" value={stats.live || 0} tone="red" icon="🔴" />
          <StatCard label="Completed" value={stats.completed || 0} tone="green" icon="✔" />
          <StatCard label="Results available" value={stats.resultsAvailable || 0} tone="blue" icon="📊" />
        </div>
      )}

      {loading ? (
        <Loading />
      ) : (
        <>
          {activeSessions.length > 0 && (
            <div className="card mb-2">
              <div className="card-head">
                <div className="card-title">
                  Live now
                  <span className="card-title-tamil tamil">நேரடியாக நடைபெறுகிறது</span>
                </div>
              </div>
              <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Subject</th>
                      <th>Ends at</th>
                      <th>Duration</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {activeSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="cell-primary">{s.test?.title || "—"}</td>
                        <td>{s.test?.subject || "—"}</td>
                        <td className="cell-sub">{formatDateTime(s.endTime)}</td>
                        <td className="mono">{s.test?.duration} min</td>
                        <td>
                          <div className="table-actions">
                            {s.attemptId ? (
                              <Badge tone="green">Submitted</Badge>
                            ) : (
                              <Link className="btn btn" href={`/student/attempt/${s.id}`}>
                                Take Test
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {upcomingSessions.length > 0 && (
            <div className="card mb-2">
              <div className="card-head">
                <div className="card-title">
                  Scheduled
                  <span className="card-title-tamil tamil">திட்டமிடப்பட்டது</span>
                </div>
              </div>
              <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Subject</th>
                      <th>Starts at</th>
                      <th>Ends at</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="cell-primary">{s.test?.title || "—"}</td>
                        <td>{s.test?.subject || "—"}</td>
                        <td className="cell-sub">{formatDateTime(s.startTime)}</td>
                        <td className="cell-sub">{formatDateTime(s.endTime)}</td>
                        <td className="mono">{s.test?.duration} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endedSessions.length > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Completed
                  <span className="card-title-tamil tamil">நிறைவடைந்தது</span>
                </div>
              </div>
              <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Subject</th>
                      <th>Submitted</th>
                      <th>Result</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {endedSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="cell-primary">{s.test?.title || "—"}</td>
                        <td>{s.test?.subject || "—"}</td>
                        <td>
                          {s.attemptId ? (
                            <Badge tone="green">Submitted</Badge>
                          ) : (
                            <Badge tone="grey">Not attempted</Badge>
                          )}
                        </td>
                        <td>
                          {s.resultVisible ? (
                            <span className="mono">{s.score} / {s.totalMarks}</span>
                          ) : s.attemptId ? (
                            <Badge tone="gold">Awaiting publication</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {s.resultVisible && (
                            <Link className="btn btn-outline btn-sm" href={`/student/results`}>
                              View result
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <EmptyState
              icon="📝"
              title="No tests assigned yet"
              action={<p className="small muted">Your teacher will schedule test sessions. Check back later.</p>}
            >
              When a test is scheduled for you, it will appear here with options to start or view results.
            </EmptyState>
          )}
        </>
      )}
    </AppShell>
  );
}
