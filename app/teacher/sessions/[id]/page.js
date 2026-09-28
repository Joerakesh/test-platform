"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, StatCard } from "@/components/Primitives";
import { ConfirmDialog } from "@/components/Modal";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatSeconds } from "@/lib/format";

const STATUS_TONE = { active: "green", upcoming: "gold", ended: "grey", closed: "grey" };

export default function SessionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error, reload } = useApiData(`/api/sessions/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("roster");

  const session = data?.session;
  const roster = data?.roster || [];

  const submitted = useMemo(() => roster.filter((r) => r.submitted), [roster]);
  const pending = useMemo(() => roster.filter((r) => !r.submitted), [roster]);

  const filteredRoster = useMemo(() => {
    const list = tab === "submitted" ? submitted : tab === "pending" ? pending : roster;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.registerNo, r.email, r.classLabel].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [roster, submitted, pending, tab, search]);

  const paged = usePagedRows(filteredRoster, 20);

  async function togglePublish() {
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/sessions/${id}`, {
        method: "PATCH",
        body: { resultsPublished: !session.resultsPublished },
      });
      setConfirmPublish(false);
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function closeSession() {
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/sessions/${id}`, { method: "PATCH", body: { isClosed: true } });
      setConfirmClose(false);
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><Alert type="error">{error}</Alert></AppShell>;
  if (!session) return <AppShell><Alert type="error">Session not found.</Alert></AppShell>;

  const status = session.status;
  const test = session.test || {};
  const totalSubmitted = submitted.length;
  const totalPending = pending.length;
  const avgScore = totalSubmitted > 0
    ? Math.round((submitted.reduce((s, r) => s + (r.score || 0), 0) / totalSubmitted) * 10) / 10
    : 0;
  const avgPct = totalSubmitted > 0 && test.totalMarks
    ? Math.round((avgScore / test.totalMarks) * 1000) / 10
    : 0;

  return (
    <AppShell>
      <PageHead
        title={test.title || "Session Detail"}
        tamil="அமர்வு விவரம்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a>
            <span>/</span>
            <a href="/teacher/sessions">Sessions</a>
            <span>/</span> Detail
          </>
        }
      >
        <DownloadButton
          buildUrl={() => `/api/sessions/${id}/export?type=register`}
          label="Marks Register"
          className="btn btn-outline"
        />
        <DownloadButton
          buildUrl={() => `/api/sessions/${id}/export?type=summary`}
          label="Results CSV"
          className="btn btn-outline"
        />
        <Link className="btn" href={`/teacher/sessions/${id}/results`}>
          Full Results
        </Link>
      </PageHead>

      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="grid grid-4 mb-3">
        <StatCard label="Assigned" value={roster.length} tone="blue" icon="👦" />
        <StatCard label="Submitted" value={totalSubmitted} tone="green" icon="✔" />
        <StatCard label="Pending" value={totalPending} tone="gold" icon="⏳" />
        <StatCard
          label="Average"
          value={totalSubmitted > 0 ? `${avgPct}%` : "—"}
          tone={avgPct >= 50 ? "green" : "red"}
          icon="📊"
        />
      </div>

      <div className="grid grid-sidebar">
        <div>
          <div className="card mb-2">
            <div className="card-head">
              <div className="card-title">
                Session details
                <span className="card-title-tamil tamil">அமர்வு விவரங்கள்</span>
              </div>
              <Badge tone={STATUS_TONE[status]} live={status === "active"}>
                {session.statusLabel}
              </Badge>
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div>
                  <div className="label">Paper</div>
                  <div>{test.title}</div>
                </div>
                <div>
                  <div className="label">Subject</div>
                  <div>{test.subject || "—"}</div>
                </div>
                <div>
                  <div className="label">Duration</div>
                  <div>{test.duration} minutes</div>
                </div>
                <div>
                  <div className="label">Total marks</div>
                  <div>{test.totalMarks}</div>
                </div>
                <div>
                  <div className="label">Start time</div>
                  <div>{formatDateTime(session.startTime)}</div>
                </div>
                <div>
                  <div className="label">End time</div>
                  <div>{formatDateTime(session.endTime)}</div>
                </div>
                {test.negativeMarking && (
                  <div>
                    <div className="label">Negative marking</div>
                    <div><Badge tone="red">Enabled</Badge></div>
                  </div>
                )}
              </div>
              {session.instructions && (
                <div className="mt-2">
                  <div className="label">Instructions</div>
                  <div className="small" style={{ whiteSpace: "pre-wrap" }}>{session.instructions}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                Roster
                <span className="card-title-tamil tamil">மாணவர் பட்டியல்</span>
              </div>
              <div className="row-wrap">
                <input
                  type="search"
                  placeholder="Search students…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 180, margin: 0 }}
                  aria-label="Search students"
                />
              </div>
            </div>

            <div className="tab-bar" style={{ padding: "0 16px" }}>
              <button className={`tab ${tab === "roster" ? "active" : ""}`} onClick={() => setTab("roster")}>
                All ({roster.length})
              </button>
              <button className={`tab ${tab === "submitted" ? "active" : ""}`} onClick={() => setTab("submitted")}>
                Submitted ({totalSubmitted})
              </button>
              <button className={`tab ${tab === "pending" ? "active" : ""}`} onClick={() => setTab("pending")}>
                Not submitted ({totalPending})
              </button>
            </div>

            {paged.total === 0 ? (
              <EmptyState icon="👦" title="No students found" />
            ) : (
              <>
                <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Register No</th>
                        <th>Class</th>
                        <th>Status</th>
                        <th className="right">Score</th>
                        <th className="right">%</th>
                        <th className="right">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paged.visible.map((r, i) => (
                        <tr key={r.id}>
                          <td className="muted">{(paged.page - 1) * paged.pageSize + i + 1}</td>
                          <td className="cell-primary">{r.name}</td>
                          <td className="mono">{r.registerNo || "—"}</td>
                          <td>{r.classLabel || "—"}</td>
                          <td>
                            {r.submitted ? (
                              r.isFullyGraded ? (
                                <Badge tone="green">Graded</Badge>
                              ) : (
                                <Badge tone="gold">Needs review</Badge>
                              )
                            ) : (
                              <Badge tone="grey">Absent</Badge>
                            )}
                          </td>
                          <td className="right mono">
                            {r.submitted ? `${r.score} / ${r.totalMarks}` : "—"}
                          </td>
                          <td className="right mono">
                            {r.percentage != null ? `${r.percentage}%` : "—"}
                          </td>
                          <td className="right mono">
                            {r.timeSpentSeconds ? formatSeconds(r.timeSpentSeconds) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="card-foot">
                  <Pagination
                    page={paged.page}
                    pageCount={paged.pageCount}
                    total={paged.total}
                    pageSize={paged.pageSize}
                    onPage={paged.setPage}
                    label="students"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="card card-accent mb-2">
            <div className="card-head">
              <div className="card-title">Actions</div>
            </div>
            <div className="card-body stack">
              {status === "active" && (
                <button
                  className="btn btn-block"
                  onClick={() => setConfirmClose(true)}
                >
                  Close session now
                </button>
              )}
              <button
                className={`btn btn-block ${session.resultsPublished ? "btn-outline" : ""}`}
                onClick={() => setConfirmPublish(true)}
              >
                {session.resultsPublished ? "Unpublish results" : "Publish results"}
              </button>
              <DownloadButton
                buildUrl={() => `/api/sessions/${id}/export?type=register`}
                label="Download marks register"
                className="btn btn-outline btn-block"
              />
              <DownloadButton
                buildUrl={() => `/api/sessions/${id}/export?type=summary`}
                label="Download results summary"
                className="btn btn-outline btn-block"
              />
              <DownloadButton
                buildUrl={() => `/api/sessions/${id}/export?type=detail`}
                label="Download answer detail"
                className="btn btn-outline btn-block"
              />
              <DownloadButton
                buildUrl={() => `/api/sessions/${id}/export?type=analysis`}
                label="Download question analysis"
                className="btn btn-outline btn-block"
              />
            </div>
          </div>

          {session.isClosed && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Quick stats</div>
              </div>
              <div className="card-body">
                <div className="stack small">
                  <div className="spread"><span>Submissions</span><strong>{totalSubmitted} / {roster.length}</strong></div>
                  <div className="spread"><span>Average score</span><strong>{avgScore}</strong></div>
                  <div className="spread"><span>Average %</span><strong>{avgPct}%</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={togglePublish}
        busy={busy}
        title={session.resultsPublished ? "Unpublish results?" : "Publish results?"}
        confirmLabel={session.resultsPublished ? "Unpublish" : "Publish"}
        message={
          session.resultsPublished
            ? "Students will no longer be able to see their scores. You can re-publish at any time."
            : "Students will be able to see their scores and question-by-question review. Are you sure?"
        }
      />

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={closeSession}
        busy={busy}
        danger
        title="Close this session now?"
        confirmLabel="Close session"
        message="This will end the test for all students. Students who have not submitted will not be able to attempt the test."
      />
    </AppShell>
  );
}
