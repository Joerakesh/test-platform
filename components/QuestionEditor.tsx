// @ts-nocheck
"use client";

import { useState } from "react";
import { Switch } from "./Primitives";
import { optionLetters, QUESTION_TYPE_LABELS, QUESTION_TYPE_TAMIL } from "@/lib/grading";
import { DIFFICULTIES } from "@/lib/school";

const TYPES = ["mcq", "truefalse", "multiselect", "short"];

export function emptyQuestion(type = "mcq") {
  if (type === "truefalse") {
    return {
      type,
      text: "",
      options: ["True", "False"],
      correctOptionIndex: 0,
      correctOptionIndexes: [],
      correctAnswers: [],
      manualGrade: false,
      marks: 1,
      negativeMarks: 0,
      chapter: "",
      topic: "",
      difficulty: "",
      explanation: "",
    };
  }
  if (type === "short") {
    return {
      type,
      text: "",
      options: [],
      correctOptionIndex: null,
      correctOptionIndexes: [],
      correctAnswers: [],
      manualGrade: false,
      marks: 1,
      negativeMarks: 0,
      chapter: "",
      topic: "",
      difficulty: "",
      explanation: "",
    };
  }
  return {
    type,
    text: "",
    options: ["", ""],
    correctOptionIndex: 0,
    correctOptionIndexes: [],
    correctAnswers: [],
    manualGrade: false,
    marks: 1,
    negativeMarks: 0,
    chapter: "",
    topic: "",
    difficulty: "",
    explanation: "",
  };
}

export default function QuestionEditor({ question, index, total, onChange, onRemove, onDuplicate, onMove }: any) {
  const [showMeta, setShowMeta] = useState(false);
  const type = question.type || "mcq";
  const isChoice = type === "mcq" || type === "multiselect" || type === "truefalse";
  const multi = type === "multiselect";

  function patch(p) {
    onChange(index, { ...question, ...p });
  }

  function changeType(next) {
    if (next === type) return;
    const base = emptyQuestion(next);
    onChange(index, { ...base, text: question.text, marks: question.marks, negativeMarks: question.negativeMarks, chapter: question.chapter, topic: question.topic, difficulty: question.difficulty, explanation: question.explanation });
  }

  function setOptionText(oi, value) {
    const options = [...question.options];
    options[oi] = value;
    patch({ options });
  }

  function addOption() {
    if (question.options.length >= 8) return;
    patch({ options: [...question.options, ""] });
  }

  function removeOption(oi) {
    if (question.options.length <= 2) return;
    const options = question.options.filter((_, i) => i !== oi);
    let correctOptionIndex = question.correctOptionIndex;
    if (oi < correctOptionIndex) correctOptionIndex -= 1;
    else if (oi === correctOptionIndex) correctOptionIndex = 0;
    const correctOptionIndexes = (question.correctOptionIndexes || [])
      .filter((i) => i !== oi)
      .map((i) => (i > oi ? i - 1 : i));
    patch({ options, correctOptionIndex, correctOptionIndexes });
  }

  function toggleCorrect(oi) {
    if (multi) {
      const current = question.correctOptionIndexes || [];
      const next = current.includes(oi) ? current.filter((i) => i !== oi) : [...current, oi];
      patch({ correctOptionIndexes: next.sort((a, b) => a - b) });
    } else {
      patch({ correctOptionIndex: oi });
    }
  }

  function setCorrectAnswer(oi, value) {
    const current = question.correctAnswers || [];
    const next = [...current];
    next[oi] = value;
    patch({ correctAnswers: next });
  }

  return (
    <div className="card card-accent">
      <div className="card-head">
        <div className="card-title">
          <span className="q-number">{index + 1}</span>
          {QUESTION_TYPE_LABELS[type]}
          <span className="card-title-tamil tamil">{QUESTION_TYPE_TAMIL[type]}</span>
        </div>
        <div className="row-wrap" style={{ gap: 6 }}>
          <select
            value={type}
            onChange={(e) => changeType(e.target.value)}
            style={{ width: "auto", padding: "5px 30px 5px 9px", fontSize: 13 }}
            aria-label="Question type"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {onMove && (
            <>
              <button className="btn btn-quiet btn-sm btn-icon" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up">
                ↑
              </button>
              <button
                className="btn btn-quiet btn-sm btn-icon"
                onClick={() => onMove(index, 1)}
                disabled={index === total - 1}
                title="Move down"
              >
                ↓
              </button>
            </>
          )}
          {onDuplicate && (
            <button className="btn btn-outline btn-sm" onClick={() => onDuplicate(index)}>
              Duplicate
            </button>
          )}
          {onRemove && (
            <button className="btn btn-outline btn-sm" onClick={() => onRemove(index)} disabled={total <= 1}>
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="field">
          <label className="label" htmlFor={`q-${index}-text`}>
            Question
          </label>
          <textarea
            id={`q-${index}-text`}
            value={question.text}
            onChange={(e) => patch({ text: e.target.value })}
            placeholder="Type the question in English or Tamil…"
            style={{ minHeight: 68 }}
          />
        </div>

        {type === "truefalse" && (
          <div className="field">
            <span className="label">Correct answer</span>
            <div className="row-wrap">
              {["True", "False"].map((label, oi) => (
                <label
                  key={label}
                  className={`option ${question.correctOptionIndex === oi ? "selected" : ""}`}
                  style={{ flex: "0 1 150px", cursor: "pointer" }}
                >
                  <input
                    type="radio"
                    checked={question.correctOptionIndex === oi}
                    onChange={() => patch({ correctOptionIndex: oi })}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isChoice && type !== "truefalse" && (
          <div className="field">
            <span className="label">
              Options <span className="label-tamil">— tick the correct {multi ? "answers" : "answer"}</span>
            </span>
            <div className="stack" style={{ gap: 8 }}>
              {question.options.map((opt, oi) => {
                const isCorrect = multi
                  ? (question.correctOptionIndexes || []).includes(oi)
                  : question.correctOptionIndex === oi;
                return (
                  <div className="row" key={oi} style={{ gap: 8 }}>
                    <input
                      type={multi ? "checkbox" : "radio"}
                      checked={isCorrect}
                      onChange={() => toggleCorrect(oi)}
                      title="Mark as correct"
                      style={{ flex: "none" }}
                      aria-label={`Mark option ${optionLetters(oi)} correct`}
                    />
                    <span className="option-key" style={{ minWidth: 18 }}>
                      {optionLetters(oi)}.
                    </span>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => setOptionText(oi, e.target.value)}
                      placeholder={`Option ${optionLetters(oi)}`}
                      style={{ margin: 0 }}
                    />
                    <button
                      className="btn btn-quiet btn-sm btn-icon"
                      onClick={() => removeOption(oi)}
                      disabled={question.options.length <= 2}
                      title="Remove option"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
            <button className="btn btn-outline btn-sm mt-1" onClick={addOption} disabled={question.options.length >= 8}>
              + Add option
            </button>
          </div>
        )}

        {type === "short" && (
          <div className="field">
            <span className="label">
              Accepted answer(s){" "}
              <span className="label-tamil">— any one match is treated as correct, case is ignored</span>
            </span>
            {question.manualGrade ? (
              <div className="hint">Manual grading is on, so no answer key is needed. Your teacher will mark the response later.</div>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {(question.correctAnswers || []).map((ans, ai) => (
                  <div className="row" key={ai} style={{ gap: 8 }}>
                    <span className="option-key" style={{ minWidth: 18 }}>
                      {ai + 1}.
                    </span>
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => setCorrectAnswer(ai, e.target.value)}
                      placeholder="e.g. Sodium chloride"
                      style={{ margin: 0 }}
                    />
                    <button
                      className="btn btn-quiet btn-sm btn-icon"
                      onClick={() => patch({ correctAnswers: question.correctAnswers.filter((_, i) => i !== ai) })}
                      title="Remove answer"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => patch({ correctAnswers: [...(question.correctAnswers || []), ""] })}
                  style={{ alignSelf: "flex-start" }}
                >
                  + Add accepted answer
                </button>
              </div>
            )}
            <div className="mt-2">
              <Switch
                id={`q-${index}-manual`}
                checked={Boolean(question.manualGrade)}
                onChange={(v) => patch({ manualGrade: v })}
                label="Mark this short answer by hand"
                hint="Use for descriptive answers. The attempt stays pending until you award marks."
              />
            </div>
          </div>
        )}

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor={`q-${index}-marks`}>
              Marks
            </label>
            <input
              id={`q-${index}-marks`}
              type="number"
              min="0"
              step="0.5"
              value={question.marks}
              onChange={(e) => patch({ marks: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor={`q-${index}-neg`}>
              Negative marks
            </label>
            <input
              id={`q-${index}-neg`}
              type="number"
              min="0"
              step="0.25"
              value={question.negativeMarks}
              onChange={(e) => patch({ negativeMarks: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </div>
        </div>

        <button className="btn btn-quiet btn-sm" onClick={() => setShowMeta((v) => !v)}>
          {showMeta ? "▾" : "▸"} Question settings (chapter, difficulty, explanation)
        </button>

        {showMeta && (
          <div className="mt-1">
            <div className="form-grid-2">
              <div className="field">
                <label className="label" htmlFor={`q-${index}-chapter`}>
                  Chapter / Unit
                </label>
                <input
                  id={`q-${index}-chapter`}
                  type="text"
                  value={question.chapter || ""}
                  onChange={(e) => patch({ chapter: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor={`q-${index}-topic`}>
                  Topic
                </label>
                <input
                  id={`q-${index}-topic`}
                  type="text"
                  value={question.topic || ""}
                  onChange={(e) => patch({ topic: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="label" htmlFor={`q-${index}-diff`}>
                  Difficulty
                </label>
                <select
                  id={`q-${index}-diff`}
                  value={question.difficulty || ""}
                  onChange={(e) => patch({ difficulty: e.target.value })}
                >
                  <option value="">Not set</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d[0].toUpperCase() + d.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor={`q-${index}-expl`}>
                Answer explanation <span className="label-tamil">(visible to students after results are published)</span>
              </label>
              <textarea
                id={`q-${index}-expl`}
                value={question.explanation || ""}
                onChange={(e) => patch({ explanation: e.target.value })}
                style={{ minHeight: 64 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
