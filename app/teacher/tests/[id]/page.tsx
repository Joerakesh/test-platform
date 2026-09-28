// @ts-nocheck
"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading, StatCard, Switch } from "@/components/Primitives";
import { ConfirmDialog } from "@/components/Modal";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { QUESTION_TYPE_LABELS } from "@/lib/grading";
import { optionLetters } from "@/lib/grading";

export default function TestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error, reload } = useApiData(`/api/tests/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const test = data?.test;
  const stats = data?.stats;

  async function duplicate() {
    setBusy(true);
    setActionError("");
    try {
      const full = test;
      const res = await api("/api/tests", {
        method: "POST",
        body: {
          title: `${full.title} (copy)`,
          description: full.description,
          subject: full.subject,
          className: full.className,
          sections: full.sections,
          academicYear: full.academicYear,
          duration: full.duration,
          questions: full.questions,
          negativeMarking: full.negativeMarking,
          shuffleQuestions: full.shuffleQuestions,
          shuffleOptions: full.shuffleOptions,
          showResultImmediately: full.showResultImmediately,
          source: "manual",
        },
      });
      router.push(`/teacher/tests/${res.test.id}`);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    setActionError("");
    try {
      await api(`/api/tests/${id}`, {
        method: "PATCH",
        body: { isArchived: !test.isArchived },
      });
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  async function remove() {
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/tests/${id}`, { method: "DELETE" });
      router.push("/teacher/tests");
    } catch (err) {
      setActionError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><Alert type="error">{error}</Alert></AppShell>;
  if (!test) return <AppShell><Alert type="error">Test not found.</Alert></AppShell>;

  const questions = test.questions || [];
  const totalMarks = test.totalMarks || questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  const typeCounts = {};
  for (const q of questions) {
    const t = q.type || "mcq";
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }

  return (
    <AppShell>
      <PageHead
        title={test.title}
        tamil="வினாத்தாள் விவரம்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a>
            <span>/</span>
            <Link href="/teacher/tests">Tests</Link>
            <span>/</span> Detail
          </>
        }
      >
        <Link className="btn btn-outline" href="/teacher/sessions/new">
          Schedule a session
        </Link>
        <button className="btn btn-outline" onClick={duplicate} disabled={busy}>
          {busy ? <span className="spinner spinner-sm" /> : "Duplicate"}
        </button>
        <DownloadButton
          buildUrl={() => `/api/tests/${id}/export`}
          label="Export CSV"
          className="btn btn-outline"
        />
        <button className="btn btn-outline" onClick={toggleArchive}>
          {test.isArchived ? "Unarchive" : "Archive"}
        </button>
        <button className="btn btn-outline" style={{ color: "var(--red-500)" }} onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      </PageHead>

      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="grid grid-4 mb-3">
        <StatCard label="Questions" value={questions.length} tone="red" icon="📝" />
        <StatCard label="Total marks" value={totalMarks} tone="gold" icon="⭐" />
        <StatCard label="Sessions" value={stats?.sessionCount || 0} tone="blue" icon="🗓" />
        <StatCard label="Submissions" value={stats?.attemptCount || 0} tone="green" icon="📊" />
      </div>

      <div className="grid grid-sidebar">
        <div>
          <div className="card mb-2">
            <div className="card-head">
              <div className="card-title">
                Paper details
                <span className="card-title-tamil tamil">வினாத்தாள் விவரங்கள்</span>
              </div>
              {test.isArchived && <Badge tone="grey">Archived</Badge>}
            </div>
            <div className="card-body">
              <div className="form-grid">
                <div><span className="label">Subject</span><div>{test.subject || "—"}</div></div>
                <div><span className="label">Intended class</span><div>{test.className ? `Class ${test.className}` : "Any"}</div></div>
                <div><span className="label">Sections</span><div>{test.sections?.length ? test.sections.join(", ") : "—"}</div></div>
                <div><span className="label">Duration</span><div>{test.duration} minutes</div></div>
                <div><span className="label">Total marks</span><div>{totalMarks}</div></div>
                <div><span className="label">Source</span><div><Badge tone="grey">{test.source || "manual"}</Badge></div></div>
                <div><span className="label">Negative marking</span><div>{test.negativeMarking ? "Enabled" : "Disabled"}</div></div>
                <div><span className="label">Shuffle questions</span><div>{test.shuffleQuestions ? "Yes" : "No"}</div></div>
                <div><span className="label">Shuffle options</span><div>{test.shuffleOptions ? "Yes" : "No"}</div></div>
                <div><span className="label">Show result immediately</span><div>{test.showResultImmediately ? "Yes" : "No (manual publish)"}</div></div>
                <div><span className="label">Created</span><div>{formatDateTime(test.createdAt)}</div></div>
                <div><span className="label">Last updated</span><div>{formatDateTime(test.updatedAt)}</div></div>
              </div>
              {test.description && (
                <div className="mt-2">
                  <div className="label">Instructions</div>
                  <div className="small" style={{ whiteSpace: "pre-wrap" }}>{test.description}</div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">
                Questions
                <span className="card-title-tamil tamil">வினாக்கள்</span>
                <span className="tab-count">{questions.length}</span>
              </div>
              <div className="row-wrap">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <Badge key={type} tone="grey">{count} × {QUESTION_TYPE_LABELS[type]}</Badge>
                ))}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setShowAnswerKey((v) => !v)}
                >
                  {showAnswerKey ? "Hide" : "Show"} answer key
                </button>
              </div>
            </div>

            {questions.length === 0 ? (
              <EmptyState icon="📝" title="No questions" />
            ) : (
              <div className="card-body stack" style={{ gap: 12 }}>
                {questions.map((q, i) => (
                  <div key={i} className="card card-accent" style={{ borderLeft: `3px solid var(--ink-200)` }}>
                    <div className="card-body">
                      <div className="spread mb-1">
                        <div>
                          <span className="q-number">{i + 1}</span>
                          <Badge tone="grey" style={{ marginLeft: 8 }}>{QUESTION_TYPE_LABELS[q.type]}</Badge>
                          {q.marks > 0 && (
                            <span className="small mono muted" style={{ marginLeft: 8 }}>
                              {q.marks} mark{q.marks === 1 ? "" : "s"}
                              {q.negativeMarks ? `, −${q.negativeMarks}` : ""}
                            </span>
                          )}
                        </div>
                        <div className="row-wrap" style={{ gap: 4 }}>
                          {q.chapter && <Badge tone="blue">{q.chapter}</Badge>}
                          {q.difficulty && <Badge tone={q.difficulty === "hard" ? "red" : q.difficulty === "easy" ? "green" : "gold"}>{q.difficulty}</Badge>}
                        </div>
                      </div>

                      <div style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 10 }}>{q.text}</div>

                      {q.type !== "short" && q.options?.length > 0 && (
                        <div className="stack" style={{ gap: 4 }}>
                          {q.options.map((opt, oi) => {
                            const isCorrect =
                              q.type === "multiselect"
                                ? (q.correctOptionIndexes || []).includes(oi)
                                : q.correctOptionIndex === oi;
                            return (
                              <div
                                key={oi}
                                className="small"
                                style={{
                                  color: showAnswerKey && isCorrect ? "var(--green-600)" : undefined,
                                  fontWeight: showAnswerKey && isCorrect ? 600 : undefined,
                                }}
                              >
                                {optionLetters(oi)}. {opt}
                                {showAnswerKey && isCorrect && <span style={{ marginLeft: 6 }}>✔</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "short" && showAnswerKey && (
                        <div className="small" style={{ color: "var(--green-600)" }}>
                          <strong>Answer:</strong> {(q.correctAnswers || []).join(" / ") || "—"}
                          {q.manualGrade && <span className="muted" style={{ marginLeft: 8 }}>(manual grading)</span>}
                        </div>
                      )}

                      {showAnswerKey && q.explanation && (
                        <div className="mt-1" style={{ padding: "8px 12px", background: "var(--ink-50)", borderRadius: 6, fontSize: 13 }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card card-accent mb-2">
            <div className="card-head">
              <div className="card-title">Quick actions</div>
            </div>
            <div className="card-body stack">
              <Link className="btn btn-block" href="/teacher/sessions/new">
                Schedule a session
              </Link>
              <button className="btn btn-outline btn-block" onClick={duplicate} disabled={busy}>
                Duplicate this paper
              </button>
              <DownloadButton
                buildUrl={() => `/api/tests/${id}/export`}
                label="Export as CSV"
                className="btn btn-outline btn-block"
              />
            </div>
          </div>

          {stats && stats.sessionCount > 0 && (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Sessions using this paper</div>
              </div>
              <div className="card-body">
                <div className="stack small">
                  <div className="spread"><span>Total sessions</span><strong>{stats.sessionCount}</strong></div>
                  <div className="spread"><span>Submissions</span><strong>{stats.attemptCount}</strong></div>
                  <div className="spread"><span>Upcoming</span><strong>{stats.upcoming}</strong></div>
                </div>
                <Link className="btn btn-outline btn-sm btn-block mt-2" href="/teacher/sessions">
                  View all sessions
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete this test paper?"
        confirmLabel="Delete permanently"
        message={
          <>
            <strong>{test.title}</strong> and any of its sessions will be removed. Papers
            that already have student submissions cannot be deleted — archive those instead.
          </>
        }
      />
    </AppShell>
  );
}
