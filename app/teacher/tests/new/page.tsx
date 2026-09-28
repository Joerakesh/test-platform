// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell, { PageHead } from "@/components/AppShell";
import QuestionEditor, { emptyQuestion } from "@/components/QuestionEditor";
import CsvUploader from "@/components/CsvUploader";
import { Alert, Badge, EmptyState, Loading, StatCard, Switch } from "@/components/Primitives";
import { DownloadLink } from "@/components/Download";
import { api, errorMessage } from "@/lib/api";
import { QUESTION_TYPE_LABELS } from "@/lib/grading";
import { CLASSES, SECTIONS, SUBJECTS, SCHOOL } from "@/lib/school";
import { TEST_CSV_HEADERS } from "@/lib/csv";

const TABS = [
  { key: "manual", label: "Type the questions" },
  { key: "csv", label: "Upload from CSV" },
  { key: "bank", label: "From question bank" },
];

export default function NewTestPage() {
  const router = useRouter();
  const [tab, setTab] = useState("manual");
  const [meta, setMeta] = useState({
    title: "",
    description: "",
    subject: "",
    className: "",
    sections: [],
    duration: 30,
    negativeMarking: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResultImmediately: true,
  });
  const [questions, setQuestions] = useState([emptyQuestion("mcq")]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [saveToBank, setSaveToBank] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "csv") setTab("csv");
  }, []);

  const totalMarks = useMemo(
    () => questions.reduce((s, q) => s + (Number(q.marks) || 0), 0),
    [questions]
  );

  const typeCounts = useMemo(() => {
    const counts = {};
    for (const q of questions) {
      const t = q.type || "mcq";
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [questions]);

  function updateQuestion(index, next) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)));
  }

  function addQuestion(type = "mcq") {
    setQuestions((prev) => [...prev, emptyQuestion(type)]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => (prev.length <= 1 ? [emptyQuestion("mcq")] : prev.filter((_, i) => i !== index)));
  }

  function duplicateQuestion(index) {
    setQuestions((prev) => {
      const copy = JSON.parse(JSON.stringify(prev[index]));
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function moveQuestion(index, direction) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setError("");
    setProblems([]);
    setBusy(true);
    try {
      if (saveToBank) {
        await api("/api/question-bank", { method: "POST", body: { items: questions } });
      }
      const res = await api("/api/tests", {
        method: "POST",
        body: {
          ...meta,
          questions,
          source: tab === "manual" ? "manual" : tab === "bank" ? "bank" : "csv",
        },
      });
      router.push(`/teacher/tests/${res.test.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setProblems(err?.problems || []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  const missingTitle = !meta.title.trim();

  return (
    <AppShell>
      <PageHead
        title="New Test Paper"
        tamil="புதிய வினாத்தாளம்"
        breadcrumb={
          <>
            <a href="/teacher">Dashboard</a> <span>/</span>{" "}
            <Link href="/teacher/tests">Tests</Link> <span>/</span> New
          </>
        }
      >
        <Link className="btn btn-quiet" href="/teacher/tests">
          Cancel
        </Link>
      </PageHead>

      {error && (
        <Alert type="error" title={error} items={problems.length ? problems : undefined} />
      )}

      <div className="card card-accent">
        <div className="card-head">
          <div className="card-title">
            Paper details
            <span className="card-title-tamil tamil">வினாத்தாள விவரங்கள்</span>
          </div>
        </div>
        <div className="card-body">
          <div className="field">
            <label className="label" htmlFor="t-title">
              Title <span className="label-tamil">தலைப்பு</span>
            </label>
            <input
              id="t-title"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="e.g. Unit Test 3 — Science, Class 9"
            />
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="t-subject">
                Subject <span className="label-tamil">பாடம்</span>
              </label>
              <select
                id="t-subject"
                value={meta.subject}
                onChange={(e) => setMeta({ ...meta, subject: e.target.value })}
              >
                <option value="">Not specified</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="t-class">
                Intended class
              </label>
              <select
                id="t-class"
                value={meta.className}
                onChange={(e) => setMeta({ ...meta, className: e.target.value })}
              >
                <option value="">Any class</option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="t-duration">
                Time allowed (minutes)
              </label>
              <input
                id="t-duration"
                type="number"
                min="1"
                max="600"
                value={meta.duration}
                onChange={(e) => setMeta({ ...meta, duration: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="t-sections">
                Sections
              </label>
              <div className="row-wrap" id="t-sections">
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`badge ${meta.sections.includes(s) ? "badge-red" : "badge-grey"}`}
                    style={{ cursor: "pointer", padding: "5px 11px" }}
                    onClick={() =>
                      setMeta({
                        ...meta,
                        sections: meta.sections.includes(s)
                          ? meta.sections.filter((x) => x !== s)
                          : [...meta.sections, s],
                      })
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="t-desc">
              Instructions for students <span className="label-tamil">(optional)</span>
            </label>
            <textarea
              id="t-desc"
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              placeholder="e.g. Answer all questions. Write your register number on the answer sheet."
              style={{ minHeight: 64 }}
            />
          </div>

          <div className="row-wrap" style={{ gap: 18, marginTop: 4 }}>
            <Switch
              id="m-neg"
              checked={meta.negativeMarking}
              onChange={(v) => setMeta({ ...meta, negativeMarking: v })}
              label="Negative marking"
              hint="Deduct each question's negative marks for a wrong answer."
            />
            <Switch
              id="m-shuffle-q"
              checked={meta.shuffleQuestions}
              onChange={(v) => setMeta({ ...meta, shuffleQuestions: v })}
              label="Shuffle questions"
              hint="Every student gets a different question order."
            />
            <Switch
              id="m-shuffle-o"
              checked={meta.shuffleOptions}
              onChange={(v) => setMeta({ ...meta, shuffleOptions: v })}
              label="Shuffle options"
              hint="Option order changes per student."
            />
            <Switch
              id="m-show"
              checked={meta.showResultImmediately}
              onChange={(v) => setMeta({ ...meta, showResultImmediately: v })}
              label="Show result right after submitting"
              hint="Turn off to publish results manually later."
            />
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "manual" && (
        <>
          {questions.map((q, i) => (
            <QuestionEditor
              key={i}
              question={q}
              index={i}
              total={questions.length}
              onChange={updateQuestion}
              onRemove={removeQuestion}
              onDuplicate={duplicateQuestion}
              onMove={moveQuestion}
            />
          ))}

          <div className="card">
            <div className="card-body row-wrap">
              <span className="small muted">Add a question of type:</span>
              {["mcq", "truefalse", "multiselect", "short"].map((t) => (
                <button key={t} className="btn btn-outline btn-sm" onClick={() => addQuestion(t)}>
                  + {QUESTION_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "csv" && <CsvTab meta={meta} onSaved={reloadAndGo} onQuestions={setQuestions} />}

      {tab === "bank" && (
        <BankTab
          subject={meta.subject}
          className={meta.className}
          onAdd={(items) => setQuestions((prev) => [...prev, ...items])}
        />
      )}

      {tab !== "csv" && (
        <div className="card">
          <div className="card-body">
            <div className="grid grid-4 mb-2">
              <StatCard label="Questions" value={questions.length} tone="red" />
              <StatCard label="Total marks" value={totalMarks} tone="gold" />
              <StatCard label="Time allowed" value={`${meta.duration} min`} tone="blue" />
              <StatCard
                label="Negative marking"
                value={meta.negativeMarking ? "On" : "Off"}
                tone={meta.negativeMarking ? "red" : "green"}
              />
            </div>

            <div className="row-wrap mb-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} tone="grey">
                  {count} × {QUESTION_TYPE_LABELS[type]}
                </Badge>
              ))}
            </div>

            <Switch
              id="save-bank"
              checked={saveToBank}
              onChange={setSaveToBank}
              label="Also save these questions to the question bank"
              hint="Lets you reuse them in future papers."
            />

            <div className="divider" />

            <div className="spread">
              <Link className="btn btn-outline" href="/teacher/tests">
                Cancel
              </Link>
              <button className="btn btn-lg" onClick={save} disabled={busy || missingTitle || questions.length === 0}>
                {busy ? <span className="spinner spinner-sm" /> : "Save test paper"}
              </button>
            </div>
            {missingTitle && (
              <div className="hint right mt-1">Give the paper a title above before saving.</div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );

  function reloadAndGo(id) {
    router.push(`/teacher/tests/${id}`);
  }
}

function CsvTab({ meta, onSaved }) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [preview, setPreview] = useState(null);
  const [duration, setDuration] = useState(meta.duration);

  async function importPaper(save) {
    setBusy(true);
    setError("");
    setProblems([]);
    try {
      const res = await api("/api/tests/import", {
        method: "POST",
        body: {
          csv: csvText,
          title: meta.title,
          description: meta.description,
          subject: meta.subject,
          className: meta.className,
          academicYear: SCHOOL.academicYear,
          duration,
          negativeMarking: meta.negativeMarking,
          shuffleQuestions: meta.shuffleQuestions,
          shuffleOptions: meta.shuffleOptions,
          showResultImmediately: meta.showResultImmediately,
          save,
        },
      });
      setPreview(res.parsed);
      setProblems(res.problems || []);
      if (save && res.test) onSaved(res.test.id);
    } catch (err) {
      setError(errorMessage(err));
      setProblems(err?.problems || []);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="card card-accent">
        <div className="card-head">
          <div className="card-title">
            Upload the question paper
            <span className="card-title-tamil tamil">வினாத்தாளத்தை பதிவேற்றவும்</span>
          </div>
          <DownloadLink href="/api/tests/template" label="Download CSV template" className="btn btn-outline btn-sm" />
        </div>
        <div className="card-body">
          {error && <Alert type="error" title={error} items={problems.length ? problems : undefined} />}

          <p className="small muted">
            One question per row. The columns are <code>question_no</code>, <code>type</code>,{" "}
            <code>question</code>, <code>option_a</code> … <code>option_f</code>,{" "}
            <code>correct_option</code> (A/B/C…), <code>correct_answer</code> (for short answers),{" "}
            <code>marks</code>, <code>negative_marks</code>, <code>chapter</code>, <code>topic</code>,{" "}
            <code>difficulty</code> and <code>explanation</code>. Leave a column out and it will simply
            be ignored.
          </p>

          <CsvUploader
            templateHeaders={TEST_CSV_HEADERS}
            templateName="question-paper-template.csv"
            onParsed={(_, __, m) => {
              setCsvText(m.text);
              setFileName(m.fileName);
              setPreview(null);
              setProblems([]);
            }}
          />

          <div className="field mt-2" style={{ maxWidth: 220 }}>
            <label className="label" htmlFor="csv-duration">
              Time allowed (minutes)
            </label>
            <input
              id="csv-duration"
              type="number"
              min="1"
              max="600"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="btn-group">
            <button
              className="btn btn-outline"
              onClick={() => importPaper(false)}
              disabled={busy || !csvText}
            >
              Preview only
            </button>
            <button className="btn" onClick={() => importPaper(true)} disabled={busy || !csvText || !meta.title.trim()}>
              {busy ? <span className="spinner spinner-sm" /> : "Import and save paper"}
            </button>
          </div>
          {!meta.title.trim() && (
            <div className="hint mt-1">Add a title in “Paper details” above before saving the import.</div>
          )}
        </div>
      </div>

      {preview && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              Preview — {preview.questions.length} questions · {preview.totalMarks} marks
            </div>
            {fileName && <span className="small muted">{fileName}</span>}
          </div>
          <div className="card-body">
            {problems.length > 0 && <Alert type="warn" title="Rows that were skipped" items={problems} />}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="right">#</th>
                    <th>Type</th>
                    <th>Question</th>
                    <th>Options</th>
                    <th className="right">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.questions.map((q, i) => (
                    <tr key={i}>
                      <td className="right mono">{i + 1}</td>
                      <td>
                        <Badge tone="grey">{QUESTION_TYPE_LABELS[q.type]}</Badge>
                      </td>
                      <td>{q.text}</td>
                      <td className="cell-sub">
                        {q.type === "short"
                          ? `Answer: ${(q.correctAnswers || []).join(" / ")}`
                          : (q.options || []).map((o, oi) => String.fromCharCode(65 + oi)).join(", ")}
                      </td>
                      <td className="right mono">{q.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BankTab({ subject, className, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const { data, loading, error } = useApiDataList();

  const items = data?.items || [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.text, i.chapter, i.topic].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, search]);

  function toggle(id) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function addSelected() {
    const chosen = items.filter((i) => selected[i._id]);
    if (chosen.length === 0) return;
    onAdd(
      chosen.map((q) => ({
        type: q.type,
        text: q.text,
        options: q.options || [],
        correctOptionIndex: q.correctOptionIndex ?? null,
        correctOptionIndexes: q.correctOptionIndexes || [],
        correctAnswers: q.correctAnswers || [],
        manualGrade: Boolean(q.manualGrade),
        marks: q.marks ?? 1,
        negativeMarks: q.negativeMarks ?? 0,
        chapter: q.chapter || "",
        topic: q.topic || "",
        difficulty: q.difficulty || "",
        explanation: q.explanation || "",
      }))
    );
    chosen.forEach((q) => {
      api(`/api/question-bank/${q._id}`, { method: "PATCH", body: { usageCount: (q.usageCount || 0) + 1 } }).catch(() => {});
    });
    setSelected({});
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          Question bank
          <span className="card-title-tamil tamil">கேள்வி வங்கி</span>
        </div>
        <div className="row-wrap">
          <input
            type="search"
            placeholder="Search the bank…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200, margin: 0 }}
            aria-label="Search question bank"
          />
          <button className="btn btn-sm" onClick={addSelected} disabled={selectedCount === 0}>
            + Add {selectedCount || ""} to paper
          </button>
        </div>
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <Alert type="error">{error}</Alert>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🗂" title="The question bank is empty">
          Save questions to the bank while building a paper, or add them from{" "}
          <Link href="/teacher/bank">the bank page</Link>.
        </EmptyState>
      ) : (
        <div className="table-wrap" style={{ border: 0, borderRadius: 0, boxShadow: "none" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 44 }} />
                <th>Question</th>
                <th>Type</th>
                <th>Chapter</th>
                <th className="right">Marks</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item._id} onClick={() => toggle(item._id)} style={{ cursor: "pointer" }}>
                  <td>
                    <input type="checkbox" checked={Boolean(selected[item._id])} readOnly />
                  </td>
                  <td>
                    <div className="cell-primary">{item.text}</div>
                    {item.options?.length > 0 && (
                      <div className="cell-sub">
                        {item.options.map((o, oi) => `${String.fromCharCode(65 + oi)}. ${o}`).join("  |  ")}
                      </div>
                    )}
                    {item.correctAnswers?.length > 0 && (
                      <div className="cell-sub">Answer: {item.correctAnswers.join(" / ")}</div>
                    )}
                  </td>
                  <td>
                    <Badge tone="grey">{QUESTION_TYPE_LABELS[item.type]}</Badge>
                  </td>
                  <td className="cell-sub">
                    {item.chapter || "—"}
                    {item.subject && <div>{item.subject}</div>}
                    {!item.subject && className && <div>Class {className}</div>}
                  </td>
                  <td className="right mono">{item.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function useApiDataList() {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let active = true;
    api("/api/question-bank?limit=300")
      .then((d) => active && setState({ data: d, loading: false, error: "" }))
      .catch((e) => active && setState({ data: null, loading: false, error: errorMessage(e) }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}
