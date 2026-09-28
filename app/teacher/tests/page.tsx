// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading } from "@/components/Primitives";
import { ConfirmDialog } from "@/components/Modal";
import Pagination, { usePagedRows } from "@/components/Pagination";
import { DownloadButton } from "@/components/Download";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { SUBJECTS } from "@/lib/school";
import { QUESTION_TYPE_LABELS } from "@/lib/grading";

export default function TeacherTestsPage() {
  const { data, loading, error, reload } = useApiData("/api/tests");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const tests = data?.tests || [];

  const filtered = useMemo(() => {
    let list = tests;
    if (subject) list = list.filter((t) => t.subject === subject);
    if (source) list = list.filter((t) => t.source === source);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.title, t.description, t.subject, t.className]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [tests, search, subject, source]);

  const paged = usePagedRows(filtered, 12);

  async function duplicate(test) {
    setBusy(true);
    setActionError("");
    try {
      const res = await api(`/api/tests/${test.id}`);
      const full = res.test;
      await api("/api/tests", {
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
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/tests/${confirm.id}`, { method: "DELETE" });
      setConfirm(null);
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive(test) {
    setActionError("");
    try {
      const res = await api(`/api/tests/${test.id}`);
      await api(`/api/tests/${test.id}`, {
        method: "PATCH",
        body: { ...res.test, isArchived: !test.isArchived },
      });
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <AppShell>
      <PageHead
        title="Test Papers"
        tamil="வினாத்தாள்கள்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span> Tests
          </>
        }
      >
        <Link className="btn btn-outline" href="/teacher/tests/new?mode=csv">
          ⬆ Import from CSV
        </Link>
        <Link className="btn" href="/teacher/tests/new">
          + New test paper
        </Link>
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            All papers
            <span className="card-title-tamil tamil">அனைத்து வினாத்தாள்கள்</span>
            <span className="tab-count">{filtered.length}</span>
          </div>
          <div className="row-wrap">
            <input
              type="search"
              placeholder="Search papers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200, margin: 0 }}
              aria-label="Search test papers"
            />
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: "auto", margin: 0 }}
              aria-label="Filter by subject"
            >
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={{ width: "auto", margin: 0 }}
              aria-label="Filter by how the paper was created"
            >
              <option value="">Any source</option>
              <option value="manual">Typed by hand</option>
              <option value="csv">Uploaded from CSV</option>
              <option value="bank">From question bank</option>
            </select>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : paged.total === 0 ? (
          <EmptyState
            icon="📝"
            title={tests.length === 0 ? "No test papers yet" : "Nothing matches your search"}
            action={
              tests.length === 0 ? (
                <div className="btn-group">
                  <Link className="btn" href="/teacher/tests/new">
                    Create one
                  </Link>
                  <Link className="btn btn-outline" href="/teacher/tests/new?mode=csv">
                    Upload a CSV paper
                  </Link>
                </div>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    setSearch("");
                    setSubject("");
                    setSource("");
                  }}
                >
                  Clear filters
                </button>
              )
            }
          >
            {tests.length === 0
              ? "A test paper holds the questions, marks, duration and marking rules."
              : "Try a different search term or clear the filters."}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Paper</th>
                    <th>Subject / Class</th>
                    <th className="right">Questions</th>
                    <th className="right">Marks</th>
                    <th className="right">Time</th>
                    <th className="right">Sessions</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className="cell-primary">
                          <Link href={`/teacher/tests/${t.id}`}>{t.title}</Link>
                          {t.isArchived && (
                            <Badge tone="grey">Archived</Badge>
                          )}
                        </div>
                        <div className="cell-sub">
                          {t.source === "csv" && "⬆ From CSV · "}
                          {t.source === "bank" && "🗂 From bank · "}
                          {Object.entries(t.typeBreakdown || {})
                            .map(([k, v]) => `${v} ${QUESTION_TYPE_LABELS[k] || k}`)
                            .join(", ")}
                        </div>
                      </td>
                      <td>
                        {t.subject || <span className="muted">—</span>}
                        <div className="cell-sub">{t.className ? `Class ${t.className}` : ""}</div>
                      </td>
                      <td className="right mono">{t.questionCount}</td>
                      <td className="right mono">{t.totalMarks}</td>
                      <td className="right mono">{t.duration} min</td>
                      <td className="right mono">{t.sessionCount}</td>
                      <td className="cell-sub">{formatDateTime(t.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link className="btn btn-outline btn-sm" href={`/teacher/tests/${t.id}`}>
                            Open
                          </Link>
                          <button className="btn btn-quiet btn-sm" onClick={() => duplicate(t)} disabled={busy}>
                            Copy
                          </button>
                          <DownloadButton
                            buildUrl={() => `/api/tests/${t.id}/export`}
                            label="CSV"
                            className="btn btn-quiet btn-sm"
                            icon="⬇"
                          />
                          <button className="btn btn-quiet btn-sm" onClick={() => toggleArchive(t)}>
                            {t.isArchived ? "Unarchive" : "Archive"}
                          </button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(t)}>
                            Delete
                          </button>
                        </div>
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
                label="test papers"
              />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete this test paper?"
        confirmLabel="Delete permanently"
        message={
          <>
            <strong>{confirm?.title}</strong> and any of its scheduled sessions will be removed. Papers
            that already have student submissions cannot be deleted — archive those instead.
          </>
        }
      />
    </AppShell>
  );
}
