// @ts-nocheck
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCountdown } from "@/components/ExamTimer";
import ExamPalette from "@/components/ExamPalette";
import { Alert, Loading } from "@/components/Primitives";
import Modal from "@/components/Modal";
import Seal from "@/components/Seal";
import { SCHOOL } from "@/lib/school";
import { api, errorMessage } from "@/lib/api";
import { formatSeconds } from "@/lib/format";
import { optionLetters, QUESTION_TYPE_LABELS } from "@/lib/grading";

export default function AttemptPage() {
  const { sessionId } = useParams();
  const router = useRouter();

  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [paper, setPaper] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const startRef = useRef(Date.now());

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.alreadySubmitted) {
          setState("submitted");
          return;
        }
        if (d.status === "upcoming") {
          setState("upcoming");
          setSession(d);
          return;
        }
        if (d.status !== "active" && !d.paper) {
          setError(d.error || "This test is not available.");
          setState("error");
          return;
        }
        if (d.paper) {
          setSession(d);
          setPaper(d.paper);
          startRef.current = Date.now();
          setState("ready");
        } else {
          setError(d.error || "Could not load the test paper.");
          setState("error");
        }
      })
      .catch((err) => {
        setError(errorMessage(err));
        setState("error");
      });
  }, [sessionId]);

  const deadline = session?.endTime;

  const onExpire = useCallback(() => {
    handleSubmit(true);
  }, []);

  useCountdown(deadline, state === "in_progress" ? onExpire : undefined);

  function startTest() {
    setShowInstructions(false);
    setState("in_progress");
  }

  function setAnswer(qi, value) {
    setAnswers((prev) => ({ ...prev, [qi]: value }));
  }

  function toggleMultiOption(qi, oi) {
    setAnswers((prev) => {
      const current = prev[qi]?.selectedOptionIndexes || [];
      const next = current.includes(oi) ? current.filter((x) => x !== oi) : [...current, oi];
      return { ...prev, [qi]: { ...(prev[qi] || {}), selectedOptionIndexes: next } };
    });
  }

  function toggleReview(qi) {
    setAnswers((prev) => ({
      ...prev,
      [qi]: { ...(prev[qi] || {}), markedForReview: !prev[qi]?.markedForReview },
    }));
  }

  function clearAnswer(qi) {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[qi];
      return next;
    });
  }

  async function handleSubmit(autoSubmit = false) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const timeSpentSeconds = Math.floor((Date.now() - startRef.current) / 1000);
      const payload = Object.entries(answers).map(([qi, a]) => ({
        questionIndex: Number(qi),
        selectedOptionIndexes: a.selectedOptionIndexes || [],
        textAnswer: a.textAnswer || "",
        markedForReview: Boolean(a.markedForReview),
      }));
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload, timeSpentSeconds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setSubmitting(false);
        return;
      }
      setState("submitted");
      router.push("/student/results");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="exam-shell">
        <Loading label="Loading your test…" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="exam-shell">
        <div className="exam-header">
          <div className="exam-header-inner">
            <Link href="/student" className="brand">
              <Seal />
              <span className="brand-text">
                <span className="brand-name">{SCHOOL.name}</span>
                <span className="brand-sub">{SCHOOL.authority} · Examination Cell</span>
              </span>
            </Link>
          </div>
        </div>
        <div className="exam-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ maxWidth: 440, width: "100%" }}>
            <Alert type="error">{error}</Alert>
            <Link className="btn btn-outline mt-2" href="/student">← Back to My Tests</Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === "submitted") {
    return (
      <div className="exam-shell">
        <div className="exam-header">
          <div className="exam-header-inner">
            <Link href="/student" className="brand">
              <Seal />
              <span className="brand-text">
                <span className="brand-name">{SCHOOL.name}</span>
                <span className="brand-sub">{SCHOOL.authority} · Examination Cell</span>
              </span>
            </Link>
          </div>
        </div>
        <div className="exam-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✔</div>
            <h2>Already Submitted</h2>
            <p className="muted">You have already submitted this test. Check your results.</p>
            <Link className="btn mt-2" href="/student/results">View Results</Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === "upcoming") {
    return (
      <div className="exam-shell">
        <div className="exam-header">
          <div className="exam-header-inner">
            <Link href="/student" className="brand">
              <Seal />
              <span className="brand-text">
                <span className="brand-name">{SCHOOL.name}</span>
                <span className="brand-sub">{SCHOOL.authority} · Examination Cell</span>
              </span>
            </Link>
          </div>
        </div>
        <div className="exam-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2>Test has not started yet</h2>
            <p className="muted">The test will begin at {session?.startTime ? new Date(session.startTime).toLocaleString() : "the scheduled time"}.</p>
            <Link className="btn btn-outline mt-2" href="/student">← Back to My Tests</Link>
          </div>
        </div>
      </div>
    );
  }

  if (showInstructions && session?.instructions) {
    return (
      <div className="exam-shell">
        <div className="exam-header">
          <div className="exam-header-inner">
            <Link href="/student" className="brand">
              <Seal />
              <span className="brand-text">
                <span className="brand-name">{SCHOOL.name}</span>
                <span className="brand-sub">{SCHOOL.authority} · Examination Cell</span>
              </span>
            </Link>
          </div>
        </div>
        <div className="exam-body" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div className="card" style={{ maxWidth: 560, width: "100%" }}>
            <div className="card-head">
              <div className="card-title">Instructions</div>
            </div>
            <div className="card-body">
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{session.instructions}</div>
              <div className="mt-2">
                <div className="spread small muted">
                  <span>{paper?.length || 0} questions</span>
                  <span>{session?.test?.totalMarks} marks</span>
                  <span>{session?.test?.duration} minutes</span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-block" onClick={startTest}>I understand — Start the test</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paper || paper.length === 0) {
    return (
      <div className="exam-shell">
        <div className="exam-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Alert type="error">No questions found in this test paper.</Alert>
        </div>
      </div>
    );
  }

  const question = paper[currentQ];
  const answer = answers[currentQ] || {};
  const answeredCount = Object.keys(answers).filter((qi) => {
    const a = answers[qi];
    if (!a) return false;
    const picked = a.selectedOptionIndexes || [];
    return picked.length > 0 || Boolean(a.textAnswer && a.textAnswer.trim());
  }).length;

  return (
    <div className="exam-shell">
      <div className="exam-header">
        <div className="exam-header-inner">
          <Link href="/student" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
            <Seal />
            <span className="brand-text">
              <span className="brand-name">{SCHOOL.name}</span>
              <span className="brand-sub">{session?.test?.title || "Examination"}</span>
            </span>
          </Link>

          <div className="exam-header-actions">
            <span className="timer" style={{ fontSize: 18, padding: "3px 10px" }}>
              {deadline && <CountdownDisplay deadline={deadline} onExpire={onExpire} />}
            </span>
            <button className="btn btn-sm btn-outline" onClick={() => setSidebarOpen((v) => !v)}>
              ☰ Palette
            </button>
            <button className="btn btn-sm" onClick={() => setShowConfirm(true)}>
              Submit
            </button>
          </div>
        </div>
      </div>

      <div className="exam-body">
        <div className="exam-content">
          <div className="exam-topbar">
            <span className="small muted">
              Question {currentQ + 1} of {paper.length}
              {answer.markedForReview && <span className="badge badge-gold" style={{ marginLeft: 8 }}>Marked for review</span>}
            </span>
            <span className="small muted">{answeredCount} answered · {paper.length - answeredCount} left</span>
          </div>

          <div className="card mb-2">
            <div className="card-body">
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-400)", marginBottom: 8 }}>
                {QUESTION_TYPE_LABELS[question.type] || question.type}
                {question.marks > 0 && <span style={{ marginLeft: 12 }}>· {question.marks} {question.marks === 1 ? "mark" : "marks"}</span>}
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7 }}>{question.text}</div>
            </div>
          </div>

          {(question.type === "mcq" || question.type === "truefalse") && (
            <div className="stack" style={{ gap: 10 }}>
              {(question.options || []).map((opt, oi) => {
                const isSelected = (answer.selectedOptionIndexes || []).includes(oi);
                return (
                  <label
                    key={oi}
                    className={`option ${isSelected ? "selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      name={`q-${currentQ}`}
                      checked={isSelected}
                      onChange={() => setAnswer(currentQ, { selectedOptionIndexes: [oi], markedForReview: answer.markedForReview })}
                    />
                    <span className="option-key">{optionLetters(oi)}.</span>
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {question.type === "multiselect" && (
            <div className="stack" style={{ gap: 10 }}>
              <div className="small muted mb-1">Select all correct answers</div>
              {(question.options || []).map((opt, oi) => {
                const isSelected = (answer.selectedOptionIndexes || []).includes(oi);
                return (
                  <label
                    key={oi}
                    className={`option ${isSelected ? "selected" : ""}`}
                    style={{ cursor: "pointer" }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMultiOption(currentQ, oi)}
                    />
                    <span className="option-key">{optionLetters(oi)}.</span>
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {question.type === "short" && (
            <div className="field">
              <label className="label">Your answer</label>
              <textarea
                value={answer.textAnswer || ""}
                onChange={(e) => setAnswer(currentQ, { textAnswer: e.target.value, markedForReview: answer.markedForReview })}
                placeholder="Type your answer here…"
                style={{ minHeight: 100, fontSize: 15 }}
              />
            </div>
          )}

          <div className="exam-actions">
            <div className="row-wrap">
              <button
                className={`btn btn-sm ${answer.markedForReview ? "btn-gold" : "btn-outline"}`}
                onClick={() => toggleReview(currentQ)}
              >
                {answer.markedForReview ? "★ Unmark review" : "☆ Mark for review"}
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => clearAnswer(currentQ)}>
                Clear answer
              </button>
            </div>
            <div className="row-wrap">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setCurrentQ((v) => Math.max(0, v - 1))}
                disabled={currentQ === 0}
              >
                ← Previous
              </button>
              {currentQ < paper.length - 1 ? (
                <button
                  className="btn btn-sm"
                  onClick={() => setCurrentQ((v) => v + 1)}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-gold"
                  onClick={() => setShowConfirm(true)}
                >
                  Submit test
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`exam-sidebar ${sidebarOpen ? "open" : ""}`}>
          <ExamPalette
            total={paper.length}
            answers={answers}
            currentIndex={currentQ}
            onJump={(i) => { setCurrentQ(i); setSidebarOpen(false); }}
          />
        </div>
      </div>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Submit your test?"
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setShowConfirm(false)} disabled={submitting}>
              Continue test
            </button>
            <button className="btn" onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? <span className="spinner spinner-sm" /> : "Submit test"}
            </button>
          </>
        }
      >
        <div className="stack small" style={{ fontSize: 14.5 }}>
          <div className="spread"><span>Total questions</span><strong>{paper.length}</strong></div>
          <div className="spread"><span>Answered</span><strong style={{ color: "var(--green-600)" }}>{answeredCount}</strong></div>
          <div className="spread"><span>Not answered</span><strong style={{ color: "var(--red-500)" }}>{paper.length - answeredCount}</strong></div>
          <div className="spread"><span>Marked for review</span><strong>{Object.values(answers).filter((a) => a?.markedForReview).length}</strong></div>
        </div>
        {(paper.length - answeredCount > 0) && (
          <div className="alert alert-warn mt-2" style={{ fontSize: 13 }}>
            You have {paper.length - answeredCount} unanswered question{paper.length - answeredCount === 1 ? "" : "s"}. These will be scored as skipped.
          </div>
        )}
      </Modal>
    </div>
  );
}

function CountdownDisplay({ deadline, onExpire }) {
  const seconds = useCountdown(deadline, onExpire);
  const warn = seconds <= 300;
  const critical = seconds <= 60;

  return (
    <span
      className={`timer ${warn ? "warn" : ""}`}
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      title="Time remaining"
    >
      {critical && <span aria-hidden="true">⚠ </span>}
      {formatSeconds(seconds)}
    </span>
  );
}
