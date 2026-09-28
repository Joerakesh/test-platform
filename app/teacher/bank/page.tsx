// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, EmptyState, Loading } from "@/components/Primitives";
import { ConfirmDialog } from "@/components/Modal";
import Pagination, { usePagedRows } from "@/components/Pagination";
import Modal from "@/components/Modal";
import QuestionEditor, { emptyQuestion } from "@/components/QuestionEditor";
import CsvUploader from "@/components/CsvUploader";
import { useApiData } from "@/lib/useApiData";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { SUBJECTS } from "@/lib/school";
import { QUESTION_TYPE_LABELS } from "@/lib/grading";
import { TEST_CSV_HEADERS, questionsFromCsvRows } from "@/lib/csv";

export default function BankPage() {
  const { data, loading, error, reload } = useApiData("/api/question-bank");
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [type, setType] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newQuestions, setNewQuestions] = useState([emptyQuestion()]);
  const [csvRows, setCsvRows] = useState(null);
  const [addError, setAddError] = useState("");
  const [editForm, setEditForm] = useState(null);

  const items = data?.items || [];
  const filters = data?.filters || {};

  const filtered = useMemo(() => {
    let list = items;
    if (subject) list = list.filter((i) => i.subject === subject);
    if (chapter) list = list.filter((i) => i.chapter === chapter);
    if (type) list = list.filter((i) => i.type === type);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) =>
        [i.text, i.chapter, i.topic, i.subject].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, search, subject, chapter, type]);

  const paged = usePagedRows(filtered, 15);

  async function addQuestions() {
    setBusy(true);
    setAddError("");
    try {
      await api("/api/question-bank", { method: "POST", body: { items: newQuestions } });
      setShowAdd(false);
      setNewQuestions([emptyQuestion()]);
      await reload(true);
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function importCsv() {
    setBusy(true);
    setAddError("");
    try {
      const { questions, errors } = questionsFromCsvRows(csvRows);
      if (questions.length === 0) {
        setAddError(errors[0]?.message || "No valid questions found in the CSV.");
        setBusy(false);
        return;
      }
      await api("/api/question-bank", { method: "POST", body: { items: questions } });
      setShowCsv(false);
      setCsvRows(null);
      await reload(true);
    } catch (err) {
      setAddError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editingItem || !editForm) return;
    setBusy(true);
    setActionError("");
    try {
      await api(`/api/question-bank/${editingItem._id}`, { method: "PATCH", body: editForm });
      setEditingItem(null);
      setEditForm(null);
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
      await api(`/api/question-bank/${confirm._id}`, { method: "DELETE" });
      setConfirm(null);
      await reload(true);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <PageHead
        title="Question Bank"
        tamil="கேள்வி வங்கி"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span> Question Bank
          </>
        }
      >
        <button className="btn btn-outline" onClick={() => setShowCsv(true)}>
          ⬆ Import CSV
        </button>
        <button className="btn" onClick={() => { setShowAdd(true); setNewQuestions([emptyQuestion()]); }}>
          + Add question
        </button>
      </PageHead>

      {error && <Alert type="error">{error}</Alert>}
      {actionError && <Alert type="error">{actionError}</Alert>}

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            All questions
            <span className="card-title-tamil tamil">அனைத்து கேள்விகள்</span>
            <span className="tab-count">{filtered.length}</span>
          </div>
          <div className="row-wrap">
            <input
              type="search"
              placeholder="Search questions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 200, margin: 0 }}
              aria-label="Search questions"
            />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} style={{ width: "auto", margin: 0 }} aria-label="Filter by subject">
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ width: "auto", margin: 0 }} aria-label="Filter by chapter">
              <option value="">All chapters</option>
              {(filters.chapters || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: "auto", margin: 0 }} aria-label="Filter by type">
              <option value="">All types</option>
              {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : paged.total === 0 ? (
          <EmptyState
            icon="🗂"
            title={items.length === 0 ? "No questions in the bank yet" : "Nothing matches your search"}
            action={
              items.length === 0 ? (
                <div className="btn-group">
                  <button className="btn" onClick={() => { setShowAdd(true); setNewQuestions([emptyQuestion()]); }}>
                    Add questions
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowCsv(true)}>
                    Import from CSV
                  </button>
                </div>
              ) : (
                <button className="btn btn-outline" onClick={() => { setSearch(""); setSubject(""); setChapter(""); setType(""); }}>
                  Clear filters
                </button>
              )
            }
          >
            {items.length === 0
              ? "Build a reusable question bank. Add questions here or import from CSV, then pick them when creating a test paper."
              : "Try a different search term or clear the filters."}
          </EmptyState>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Question</th>
                    <th>Type</th>
                    <th>Subject</th>
                    <th>Chapter</th>
                    <th className="right">Marks</th>
                    <th className="right">Used</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {paged.visible.map((item, i) => (
                    <tr key={item._id}>
                      <td className="muted">{(paged.page - 1) * paged.pageSize + i + 1}</td>
                      <td>
                        <div className="cell-primary" style={{ maxWidth: 360 }}>
                          {item.text}
                        </div>
                        {item.topic && <div className="cell-sub">{item.topic}</div>}
                      </td>
                      <td>
                        <Badge>{QUESTION_TYPE_LABELS[item.type] || item.type}</Badge>
                      </td>
                      <td>{item.subject || <span className="muted">—</span>}</td>
                      <td>{item.chapter || <span className="muted">—</span>}</td>
                      <td className="right mono">{item.marks}</td>
                      <td className="right mono">{item.usageCount || 0}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingItem(item);
                              setEditForm({
                                text: item.text,
                                type: item.type,
                                options: item.options,
                                correctOptionIndex: item.correctOptionIndex,
                                correctOptionIndexes: item.correctOptionIndexes,
                                correctAnswers: item.correctAnswers,
                                manualGrade: item.manualGrade,
                                marks: item.marks,
                                negativeMarks: item.negativeMarks,
                                chapter: item.chapter,
                                topic: item.topic,
                                difficulty: item.difficulty,
                                explanation: item.explanation,
                                subject: item.subject,
                                className: item.className,
                              });
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-quiet btn-sm" onClick={() => setConfirm(item)}>
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
                label="questions"
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Questions"
        tamil="கேள்விகளைச் சேர்"
        wide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={addQuestions} disabled={busy || newQuestions.length === 0}>
              {busy ? <span className="spinner spinner-sm" /> : `Save ${newQuestions.length} question${newQuestions.length === 1 ? "" : "s"}`}
            </button>
          </>
        }
      >
        {addError && <Alert type="error">{addError}</Alert>}
        <div className="stack" style={{ gap: 16 }}>
          {newQuestions.map((q, i) => (
            <QuestionEditor
              key={i}
              question={q}
              index={i}
              total={newQuestions.length}
              onChange={(idx, updated) => {
                const next = [...newQuestions];
                next[idx] = updated;
                setNewQuestions(next);
              }}
              onRemove={(idx) => setNewQuestions(newQuestions.filter((_, j) => j !== idx))}
              onDuplicate={(idx) => {
                const next = [...newQuestions];
                next.splice(idx + 1, 0, { ...newQuestions[idx] });
                setNewQuestions(next);
              }}
              onMove={(idx, dir) => {
                const next = [...newQuestions];
                const swap = idx + dir;
                [next[idx], next[swap]] = [next[swap], next[idx]];
                setNewQuestions(next);
              }}
            />
          ))}
        </div>
        <button className="btn btn-outline mt-2" onClick={() => setNewQuestions([...newQuestions, emptyQuestion()])}>
          + Add another question
        </button>
      </Modal>

      <Modal
        open={showCsv}
        onClose={() => setShowCsv(false)}
        title="Import from CSV"
        tamil="CSV இருந்து இறக்குமதி"
        wide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowCsv(false)} disabled={busy}>Cancel</button>
            <button className="btn" onClick={importCsv} disabled={busy || !csvRows}>
              {busy ? <span className="spinner spinner-sm" /> : "Import"}
            </button>
          </>
        }
      >
        <CsvUploader
          templateHeaders={TEST_CSV_HEADERS}
          templateName="question-bank-template.csv"
          hint="Upload a CSV with question columns. First row must be headings."
          onParsed={(rows) => setCsvRows(rows)}
        />
      </Modal>

      <Modal
        open={Boolean(editingItem)}
        onClose={() => { setEditingItem(null); setEditForm(null); }}
        title="Edit Question"
        tamil="கேள்வியைத் திருத்து"
        wide
        footer={
          <>
            <button className="btn btn-outline" onClick={() => { setEditingItem(null); setEditForm(null); }} disabled={busy}>Cancel</button>
            <button className="btn" onClick={saveEdit} disabled={busy || !editForm}>
              {busy ? <span className="spinner spinner-sm" /> : "Save changes"}
            </button>
          </>
        }
      >
        {actionError && <Alert type="error">{actionError}</Alert>}
        {editForm && editingItem && (
          <QuestionEditor
            question={editForm}
            index={0}
            total={1}
            onChange={(_, updated) => setEditForm(updated)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete this question?"
        confirmLabel="Delete permanently"
        message={
          <>
            <strong>{confirm?.text?.slice(0, 80)}…</strong> will be removed from the question bank. This
            action cannot be undone.
          </>
        }
      />
    </AppShell>
  );
}
