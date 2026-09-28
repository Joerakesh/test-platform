// @ts-nocheck
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell, { PageHead } from "@/components/AppShell";
import { Alert, Badge, Loading, StatCard } from "@/components/Primitives";
import { api, errorMessage } from "@/lib/api";
import { formatSeconds } from "@/lib/format";
import { optionLetters, QUESTION_TYPE_LABELS } from "@/lib/grading";

export default function ResultDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/results/${id}`)
      .then(setData)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><Loading /></AppShell>;
  if (error) return <AppShell><Alert type="error">{error}</Alert><Link className="btn btn-outline mt-2" href="/student/results">← Back</Link></AppShell>;
  if (!data) return <AppShell><Alert type="error">Result not found.</Alert></AppShell>;

  const { attempt, test, session, review } = data;

  return (
    <AppShell>
      <PageHead
        title={`Result — ${test.title}`}
        tamil="முடிவு விவரம்"
        breadcrumb={
          <>
            <a href="/student">My Tests</a>
            <span>/</span>
            <a href="/student/results">Results</a>
            <span>/</span> Review
          </>
        }
      />

      <div className="grid grid-4 mb-3">
        <StatCard label="Score" value={`${attempt.score} / ${attempt.totalMarks}`} tone="green" icon="✔" />
        <StatCard label="Percentage" value={`${attempt.percentage}%`} tone="gold" icon="📊" />
        <StatCard label="Accuracy" value={`${attempt.accuracy}%`} tone="blue" icon="🎯" />
        <StatCard
          label="Time taken"
          value={formatSeconds(attempt.timeSpentSeconds)}
          tone="grey"
          icon="🕒"
        />
      </div>

      <div className="grid grid-4 mb-3">
        <StatCard label="Correct" value={attempt.correctCount} tone="green" icon="✔" />
        <StatCard label="Wrong" value={attempt.wrongCount} tone="red" icon="✘" />
        <StatCard label="Skipped" value={attempt.skippedCount} tone="grey" icon="—" />
        <StatCard
          label="Negative marks"
          value={attempt.negativeScore > 0 ? `-${attempt.negativeScore}` : "0"}
          tone={attempt.negativeScore > 0 ? "red" : "green"}
          icon="⚠"
        />
      </div>

      <div className="card mb-2">
        <div className="card-head">
          <div className="card-title">
            Test information
            <span className="card-title-tamil tamil">தேர்வு தகவல்</span>
          </div>
        </div>
        <div className="card-body">
          <div className="form-grid">
            <div><span className="label">Subject</span><div>{test.subject || "—"}</div></div>
            <div><span className="label">Class</span><div>{test.className ? `Class ${test.className}` : "—"}</div></div>
            <div><span className="label">Duration</span><div>{test.duration} minutes</div></div>
            <div><span className="label">Negative marking</span><div>{test.negativeMarking ? "Enabled" : "Disabled"}</div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">
            Question-by-question review
            <span className="card-title-tamil tamil">கேள்வி வாரியான மதிப்பாய்வு</span>
          </div>
        </div>
        <div className="card-body stack" style={{ gap: 16 }}>
          {(review || []).map((r) => (
            <div key={r.questionIndex} className="card" style={{ borderLeft: `3px solid ${r.status === "correct" ? "var(--green-600)" : r.status === "wrong" ? "var(--red-500)" : "var(--ink-200)"}` }}>
              <div className="card-body">
                <div className="spread mb-1">
                  <div>
                    <span className="small muted" style={{ marginRight: 8 }}>Q{r.questionIndex + 1}</span>
                    <Badge tone={r.status === "correct" ? "green" : r.status === "wrong" ? "red" : "grey"}>
                      {r.status === "correct" ? "Correct" : r.status === "wrong" ? "Wrong" : r.status === "pending" ? "Awaiting review" : "Skipped"}
                    </Badge>
                    {r.marksAwarded !== 0 && (
                      <span className="small mono" style={{ marginLeft: 8, color: r.marksAwarded > 0 ? "var(--green-600)" : "var(--red-500)" }}>
                        {r.marksAwarded > 0 ? "+" : ""}{r.marksAwarded} / {r.marks}
                      </span>
                    )}
                  </div>
                  <Badge tone="grey">{QUESTION_TYPE_LABELS[r.type] || r.type}</Badge>
                </div>

                <div style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{r.text}</div>

                {r.type !== "short" && r.options && r.options.length > 0 && (
                  <div className="stack" style={{ gap: 6 }}>
                    {r.options.map((opt) => {
                      const isChosen = opt.isChosen;
                      const isCorrect = opt.isCorrect;
                      let cls = "option";
                      if (isCorrect) cls += " correct";
                      if (isChosen && !isCorrect) cls += " wrong";
                      if (isChosen) cls += " selected";
                      return (
                        <div key={opt.index} className={cls} style={{ cursor: "default" }}>
                          <span className="option-key">{opt.key}.</span>
                          <span>{opt.text}</span>
                          {isCorrect && <span className="small" style={{ marginLeft: 8, color: "var(--green-600)" }}>✔ correct</span>}
                          {isChosen && !isCorrect && <span className="small" style={{ marginLeft: 8, color: "var(--red-500)" }}>✘ your answer</span>}
                          {isChosen && isCorrect && <span className="small" style={{ marginLeft: 8, color: "var(--green-600)" }}>your answer</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {r.type === "short" && (
                  <div className="stack" style={{ gap: 6 }}>
                    <div><span className="label" style={{ fontSize: 12 }}>Your answer:</span> <span className="small">{r.textAnswer || <em className="muted">not answered</em>}</span></div>
                    <div><span className="label" style={{ fontSize: 12 }}>Correct answer:</span> <span className="small" style={{ color: "var(--green-600)" }}>{r.correctAnswer || "—"}</span></div>
                  </div>
                )}

                {r.explanation && (
                  <div className="mt-2" style={{ padding: "10px 14px", background: "var(--ink-50)", borderRadius: 6, fontSize: 13.5 }}>
                    <strong>Explanation:</strong> {r.explanation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <Link className="btn btn-outline" href="/student/results">← Back to results</Link>
      </div>
    </AppShell>
  );
}
