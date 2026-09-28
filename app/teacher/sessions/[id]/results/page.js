"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, StatCard } from "@/components/Primitives";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";
import { formatDateTime, formatSeconds, percent } from "@/lib/format";
import { optionLetters, QUESTION_TYPE_LABELS } from "@/lib/grading";

export default function SessionResultsPage() {
  const { id } = useParams();
  const { data, loading, error } = useApiData(`/api/sessions/${id}/results`);
  const [tab, setTab] = useState("results");
  const [search, setSearch] = useState("");

  const rows = data?.rows || [];
  const analysis = data?.analysis || [];
  const summary = data?.summary;
  const session = data?.session;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.registerNo, r.email, r.classLabel].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [rows, search]);

  const paged = usePagedRows(filteredRows, 20);

  return (
    <AppShell>
      <PageHead
        title={`Results — ${session?.title || ""}`}
        tamil="முடிவுகள்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a>
            <span>/</span>
            <a href="/teacher/sessions">Sessions</a>
            <span>/</span> Results
          </>
        }
      >
        <Link className="btn btn-outline" href={`/teacher/sessions/${id}`}>
          Session detail
        </Link>
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
        <DownloadButton
          buildUrl={() => `/api/sessions/${id}/export?type=detail`}
          label="Answer Detail"
          className="btn btn-outline"
        />
        <DownloadButton
          buildUrl={() => `/api/sessions/${id}/export?type=analysis`}
          label="Analysis CSV"
          className="btn btn-outline"
        />
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Loading />
      ) : (
        <>
          {summary && (
            <div className="grid grid-4 mb-3">
              <StatCard label="Submitted" value={`${summary.submitted} / ${summary.assigned}`} tone="green" icon="✔" />
              <StatCard label="Average" value={`${summary.averagePercentage}%`} tone="gold" icon="📊" />
              <StatCard label="Highest" value={`${summary.highest} / ${session?.totalMarks}`} tone="blue" icon="🏆" />
              <StatCard
                label="Pass rate"
                value={`${summary.passPercentage}%`}
                tone={summary.passPercentage >= 50 ? "green" : "red"}
                icon="📈"
              />
            </div>
          )}

          <div className="tab-bar mb-2" style={{ padding: "0 16px" }}>
            <button className={`tab ${tab === "results" ? "active" : ""}`} onClick={() => setTab("results")}>
              Results ({rows.length})
            </button>
            <button className={`tab ${tab === "analysis" ? "active" : ""}`} onClick={() => setTab("analysis")}>
              Question Analysis ({analysis.length})
            </button>
            {summary && (
              <button className={`tab ${tab === "summary" ? "active" : ""}`} onClick={() => setTab("summary")}>
                Grade Summary
              </button>
            )}
          </div>

          {tab === "results" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Student results
                  <span className="card-title-tamil tamil">மாணவர் முடிவுகள்</span>
                  <span className="tab-count">{filteredRows.length}</span>
                </div>
                <input
                  type="search"
                  placeholder="Search students…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 200, margin: 0 }}
                  aria-label="Search students"
                />
              </div>

              {paged.total === 0 ? (
                <EmptyState icon="📊" title="No results yet" action={<p className="small muted">No students have submitted for this session.</p>} />
              ) : (
                <>
                  <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Student</th>
                          <th>Register No</th>
                          <th>Class</th>
                          <th className="right">Score</th>
                          <th className="right">%</th>
                          <th className="right">C / W / Skip</th>
                          <th className="right">Accuracy</th>
                          <th className="right">Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paged.visible.map((r, i) => (
                          <tr key={r.id}>
                            <td className="muted">{r.rank || (paged.page - 1) * paged.pageSize + i + 1}</td>
                            <td className="cell-primary">{r.name}</td>
                            <td className="mono">{r.registerNo || "—"}</td>
                            <td>{r.classLabel || "—"}</td>
                            <td className="right mono">{r.submitted ? `${r.score} / ${r.totalMarks}` : "—"}</td>
                            <td className="right mono">{r.percentage != null ? `${r.percentage}%` : "—"}</td>
                            <td className="right mono">
                              {r.submitted ? `${r.correctCount ?? 0} / ${r.wrongCount ?? 0} / ${r.skippedCount ?? 0}` : "—"}
                            </td>
                            <td className="right mono">{r.accuracy != null ? `${r.accuracy}%` : "—"}</td>
                            <td className="right mono">
                              {r.timeSpentSeconds ? formatSeconds(r.timeSpentSeconds) : "—"}
                            </td>
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
          )}

          {tab === "analysis" && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">
                  Question-wise analysis
                  <span className="card-title-tamil tamil">கேள்வி வாரியான பகுப்பாய்வு</span>
                </div>
              </div>
              {analysis.length === 0 ? (
                <EmptyState icon="📈" title="No analysis data" />
              ) : (
                <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Question</th>
                        <th>Type</th>
                        <th className="right">Marks</th>
                        <th className="right">Correct</th>
                        <th className="right">Wrong</th>
                        <th className="right">Skipped</th>
                        <th className="right">Success %</th>
                        <th className="right">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.map((a) => (
                        <tr key={a.questionIndex}>
                          <td className="muted">{a.questionIndex + 1}</td>
                          <td className="cell-primary" style={{ maxWidth: 360 }}>
                            {a.text}
                            {a.chapter && <div className="cell-sub">{a.chapter}</div>}
                          </td>
                          <td><Badge>{QUESTION_TYPE_LABELS[a.type] || a.type}</Badge></td>
                          <td className="right mono">{a.marks}</td>
                          <td className="right mono" style={{ color: "var(--green-600)" }}>{a.correct}</td>
                          <td className="right mono" style={{ color: "var(--red-500)" }}>{a.wrong}</td>
                          <td className="right mono">{a.skipped}</td>
                          <td className="right mono">
                            <span style={{ color: a.successRate >= 60 ? "var(--green-600)" : a.successRate < 40 ? "var(--red-500)" : undefined }}>
                              {a.successRate}%
                            </span>
                          </td>
                          <td className="right mono">{a.averageScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "summary" && summary && (
            <div className="grid grid-sidebar">
              <div className="card">
                <div className="card-head">
                  <div className="card-title">
                    Grade distribution
                    <span className="card-title-tamil tamil">தர விநியோகம்</span>
                  </div>
                </div>
                <div className="card-body">
                  {summary.gradeBands.map((band) => (
                    <div key={band.label} className="mb-1">
                      <div className="spread small">
                        <span>{band.label}</span>
                        <strong>{band.count}</strong>
                      </div>
                      <div className="meter">
                        <div
                          className="meter-fill"
                          style={{
                            width: summary.submitted ? `${(band.count / summary.submitted) * 100}%` : "0%",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head">
                  <div className="card-title">Summary statistics</div>
                </div>
                <div className="card-body">
                  <div className="stack small">
                    <div className="spread"><span>Assigned</span><strong>{summary.assigned}</strong></div>
                    <div className="spread"><span>Submitted</span><strong>{summary.submitted}</strong></div>
                    <div className="spread"><span>Absent</span><strong>{summary.absent}</strong></div>
                    <div className="spread"><span>Needs review</span><strong>{summary.pendingReview}</strong></div>
                    <hr className="divider" />
                    <div className="spread"><span>Average</span><strong>{summary.average}</strong></div>
                    <div className="spread"><span>Average %</span><strong>{summary.averagePercentage}%</strong></div>
                    <div className="spread"><span>Highest</span><strong>{summary.highest}</strong></div>
                    <div className="spread"><span>Lowest</span><strong>{summary.lowest}</strong></div>
                    <div className="spread"><span>Median</span><strong>{summary.median}</strong></div>
                    <hr className="divider" />
                    <div className="spread"><span>Pass mark</span><strong>{summary.passMark}</strong></div>
                    <div className="spread"><span>Passed</span><strong style={{ color: "var(--green-600)" }}>{summary.passed}</strong></div>
                    <div className="spread"><span>Failed</span><strong style={{ color: "var(--red-500)" }}>{summary.failed}</strong></div>
                    <div className="spread"><span>Pass %</span><strong>{summary.passPercentage}%</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
