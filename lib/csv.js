import Papa from "papaparse";
import { optionLetters, QUESTION_TYPE_LABELS, STATUS_LABELS } from "./grading";

const BOM = "\uFEFF";
const MAX_OPTION_COLUMNS = 6;

const QUESTION_TYPE_ALIASES = {
  mcq: "mcq",
  mchoice: "mcq",
  single: "mcq",
  "single choice": "mcq",
  "multiple choice": "mcq",
  multiple_choice: "mcq",
  single_choice: "mcq",
  objective: "mcq",
  "1": "mcq",
  truefalse: "truefalse",
  "true false": "truefalse",
  true_false: "truefalse",
  "true/false": "truefalse",
  tf: "truefalse",
  boolean: "truefalse",
  "2": "truefalse",
  multiselect: "multiselect",
  multi: "multiselect",
  "multiple correct": "multiselect",
  multiple_select: "multiselect",
  checkbox: "multiselect",
  mcmq: "multiselect",
  "3": "multiselect",
  short: "short",
  "short answer": "short",
  short_answer: "short",
  text: "short",
  subjective: "short",
  fill: "short",
  "fill in the blank": "short",
  "4": "short",
};

const DIFFICULTY_ALIASES = {
  easy: "easy",
  simple: "easy",
  "1": "easy",
  medium: "medium",
  moderate: "medium",
  "2": "medium",
  hard: "hard",
  difficult: "hard",
  "3": "hard",
};

function cleanHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function parseCsv(text) {
  const result = Papa.parse(String(text ?? "").replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: cleanHeader,
  });

  const headers = (result.meta?.fields || []).filter(Boolean);
  const rows = (result.data || []).filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== "")
  );

  const errors = (result.errors || [])
    .filter((e) => e.code !== "TooFewFields" && e.code !== "TooManyFields")
    .map((e) => `Row ${(e.row ?? 0) + 1}: ${e.message}`);

  return { headers, rows, errors };
}

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    const cells = Array.isArray(row)
      ? row
      : headers.map((h) => row?.[h] ?? "");
    lines.push(cells.map(escapeCell).join(","));
  }
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename, headers, rows) {
  const csv = toCsv(headers, rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function toNumber(value, fallback = 0) {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function parseCorrectOptionIndex(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const single = raw.split(/[|;,/]/).map((v) => v.trim()).filter(Boolean)[0];
  if (!single) return null;
  const letter = single.match(/^[A-Za-z]$/);
  if (letter) return single.toUpperCase().charCodeAt(0) - 65;
  const num = toNumber(single, NaN);
  if (!Number.isFinite(num)) return null;
  return num >= 0 ? Math.floor(num) : null;
}

export function parseCorrectOptionIndexes(value) {
  return String(value ?? "")
    .split(/[|;,/]/)
    .map((v) => parseCorrectOptionIndex(v))
    .filter((v) => Number.isInteger(v));
}

export function parseAcceptedAnswers(value) {
  return String(value ?? "")
    .split(/[|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normaliseType(value) {
  const raw = cleanHeader(value);
  if (!raw) return "mcq";
  return QUESTION_TYPE_ALIASES[raw] || QUESTION_TYPE_ALIASES[cleanHeader(raw.replace(/_/g, " "))] || "mcq";
}

function normaliseDifficulty(value) {
  const raw = cleanHeader(value);
  if (!raw) return null;
  return DIFFICULTY_ALIASES[raw] || null;
}

export const TEST_CSV_HEADERS = [
  "question_no",
  "type",
  "question",
  ...Array.from({ length: MAX_OPTION_COLUMNS }, (_, i) => `option_${optionLetters(i).toLowerCase()}`),
  "correct_option",
  "correct_answer",
  "marks",
  "negative_marks",
  "chapter",
  "topic",
  "difficulty",
  "explanation",
];

function pick(row, names) {
  for (const name of names) {
    if (row[name] !== undefined && String(row[name]).trim() !== "") return String(row[name]).trim();
  }
  return "";
}

export function questionsFromCsvRows(rows) {
  const questions = [];
  const errors = [];

  rows.forEach((row, i) => {
    const lineNo = i + 1;
    const text = pick(row, ["question", "question_text", "text", "q"]);
    if (!text) {
      errors.push({ row: lineNo, message: "Question text is empty." });
      return;
    }

    const type = normaliseType(pick(row, ["type", "question_type", "qtype"]));

    let options = Array.from({ length: MAX_OPTION_COLUMNS }, (_, i) =>
      pick(row, [`option_${optionLetters(i).toLowerCase()}`, `option${optionLetters(i).toUpperCase()}`,
        `option_${optionLetters(i).toLowerCase()}_text`, `opt_${optionLetters(i).toLowerCase()}`])
    );

    if (type === "truefalse") {
      options = ["True", "False"];
    } else {
      options = options.filter(Boolean);
    }

    const question = {
      type,
      text,
      options,
      correctOptionIndex: null,
      correctOptionIndexes: [],
      correctAnswers: [],
      manualGrade: false,
      explanation: pick(row, ["explanation", "note", "reason"]),
      chapter: pick(row, ["chapter", "unit"]),
      topic: pick(row, ["topic", "sub_topic"]),
      difficulty: normaliseDifficulty(pick(row, ["difficulty", "level"])),
      marks: Math.max(0, toNumber(pick(row, ["marks", "mark"]), 1)),
      negativeMarks: Math.max(0, toNumber(pick(row, ["negative_marks", "neg_marks", "negative"]), 0)),
    };

    if (type === "short") {
      question.correctAnswers = parseAcceptedAnswers(pick(row, ["correct_answer", "answer", "key"]));
      if (question.correctAnswers.length === 0) {
        errors.push({ row: lineNo, message: `"${text.slice(0, 40)}" is a short answer but has no correct_answer.` });
      }
    } else {
      const correctRaw = pick(row, ["correct_option", "correct", "answer_key", "key", "correct_options"]);
      if (options.length < 2) {
        errors.push({ row: lineNo, message: `"${text.slice(0, 40)}" needs at least 2 options.` });
        return;
      }
      if (type === "multiselect") {
        question.correctOptionIndexes = parseCorrectOptionIndexes(correctRaw);
        if (question.correctOptionIndexes.length === 0) {
          errors.push({ row: lineNo, message: `"${text.slice(0, 40)}" needs at least one correct_option (A|B).` });
        }
      } else {
        question.correctOptionIndex = parseCorrectOptionIndex(correctRaw);
        if (question.correctOptionIndex === null) {
          errors.push({
            row: lineNo,
            message: `"${text.slice(0, 40)}" has an invalid correct_option "${correctRaw}".`,
          });
        }
      }
    }

    questions.push(question);
  });

  return { questions, errors };
}

export const STUDENT_CSV_HEADERS = [
  "name",
  "register_no",
  "roll_no",
  "class",
  "section",
  "email",
  "password",
];

export function studentsFromCsvRows(rows) {
  const students = [];
  const errors = [];
  const seen = new Set();

  rows.forEach((row, i) => {
    const lineNo = i + 1;
    const name = pick(row, ["name", "student_name", "full_name"]);
    const registerNo = pick(row, ["register_no", "reg_no", "username", "register_number", "roll_no"])
      .toUpperCase();
    const rollNo = pick(row, ["roll_no", "roll_number", "roll"]).toUpperCase();
    const className = pick(row, ["class", "class_name", "standard", "grade"]);
    const section = pick(row, ["section", "sec"]).toUpperCase();
    const email = pick(row, ["email", "mail"]).toLowerCase();
    const password = pick(row, ["password", "pass", "pwd"]);

    if (!name) {
      errors.push({ row: lineNo, message: "Name is empty." });
      return;
    }
    if (!registerNo && !email) {
      errors.push({ row: lineNo, message: "Register number is required (email alone cannot be used to log in)." });
      return;
    }
    if (registerNo && seen.has(registerNo)) {
      errors.push({ row: lineNo, message: `Duplicate register number ${registerNo} inside the file.` });
      return;
    }
    if (registerNo) seen.add(registerNo);
    if (password && password.length < 6) {
      errors.push({ row: lineNo, message: `Password for ${name} is shorter than 6 characters.` });
      return;
    }

    students.push({
      name,
      username: registerNo || null,
      rollNo: rollNo || registerNo || null,
      className: className || null,
      section: section || null,
      email: email || null,
      password: password || null,
    });
  });

  return { students, errors };
}

export function testToCsvRows(test) {
  const rows = [];
  (test.questions || []).forEach((q, index) => {
    const options = Array.from({ length: MAX_OPTION_COLUMNS }, (_, i) => q.options?.[i] || "");
    let correctOption = "";
    let correctAnswer = "";
    if (q.type === "short") {
      correctAnswer = (q.correctAnswers || []).join(" | ");
    } else if (q.type === "multiselect") {
      correctOption = (q.correctOptionIndexes || []).map(optionLetters).join("|");
    } else if (q.type === "truefalse") {
      correctOption = optionLetters(q.correctOptionIndex);
    } else {
      correctOption = optionLetters(q.correctOptionIndex);
    }

    rows.push([
      index + 1,
      q.type,
      q.text,
      ...options,
      correctOption,
      correctAnswer,
      q.marks ?? 1,
      q.negativeMarks ?? 0,
      q.chapter || "",
      q.topic || "",
      q.difficulty || "",
      q.explanation || "",
    ]);
  });
  return rows;
}

function pct(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
}

export function buildMarksRegisterCsv({ session, test, students, attempts, questions }) {
  const list = questions || test.questions || [];
  const byStudent = new Map((attempts || []).map((a) => [String(a.studentId?._id || a.studentId), a]));

  const headers = [
    "roll_no",
    "register_no",
    "student_name",
    "class",
    "section",
    "status",
    ...list.map((_, i) => `q${i + 1}`),
    "correct",
    "wrong",
    "not_answered",
    "negative_marks",
    "score",
    "total_marks",
    "percentage",
    "time_taken",
    "submitted_at",
  ];

  const rows = (students || []).map((student) => {
    const attempt = byStudent.get(String(student._id));
    const answersByIndex = new Map((attempt?.answers || []).map((a) => [a.questionIndex, a]));
    const perQuestion = list.map((_, i) => {
      if (!attempt) return "-";
      const ans = answersByIndex.get(i);
      if (!ans) return "-";
      const marks = ans.marksAwarded ?? 0;
      if (ans.status === "correct") return String(marks);
      if (ans.status === "pending") return "PR";
      if (ans.status === "wrong") return String(marks);
      return "-";
    });

    return [
      student.rollNo || "",
      student.username || "",
      student.name,
      student.classroomId?.name || "",
      student.classroomId?.section || "",
      attempt ? (attempt.isFullyGraded ? "Present" : "Pending review") : "Absent",
      ...perQuestion,
      attempt?.correctCount ?? 0,
      attempt?.wrongCount ?? 0,
      attempt?.skippedCount ?? 0,
      attempt?.negativeScore ?? 0,
      attempt?.score ?? "",
      attempt?.totalMarks ?? test.totalMarks ?? "",
      attempt ? pct(attempt.totalMarks ? (attempt.score / attempt.totalMarks) * 100 : 0) : "",
      attempt?.timeSpentSeconds ? `${Math.floor(attempt.timeSpentSeconds / 60)}m ${attempt.timeSpentSeconds % 60}s` : "",
      attempt?.submittedAt ? new Date(attempt.submittedAt).toISOString() : "",
    ];
  });

  return { headers, rows, filename: `marks-register-${slug(session?.testId?.title || test.title)}.csv` };
}

export function buildResultsSummaryCsv({ test, students, attempts }) {
  const byStudent = new Map((attempts || []).map((a) => [String(a.studentId?._id || a.studentId), a]));
  const total = test.totalMarks || (test.questions || []).reduce((s, q) => s + (q.marks || 0), 0);

  const headers = [
    "rank",
    "register_no",
    "roll_no",
    "student_name",
    "class",
    "section",
    "score",
    "total_marks",
    "percentage",
    "result",
    "correct",
    "wrong",
    "not_answered",
    "accuracy",
    "time_taken",
    "submitted_at",
  ];

  const ordered = (students || [])
    .map((student) => ({ student, attempt: byStudent.get(String(student._id)) }))
    .filter((r) => r.attempt)
    .sort((a, b) => b.attempt.score - a.attempt.score);

  const rows = ordered.map(({ student, attempt }, i) => [
    i + 1,
    student.username || "",
    student.rollNo || "",
    student.name,
    student.classroomId?.name || "",
    student.classroomId?.section || "",
    attempt.score,
    attempt.totalMarks || total,
    pct(attempt.totalMarks ? (attempt.score / attempt.totalMarks) * 100 : 0),
    attempt.score * 2 >= (attempt.totalMarks || total) ? "Pass" : "Fail",
    attempt.correctCount,
    attempt.wrongCount,
    attempt.skippedCount,
    pct(attempt.accuracy),
    attempt.timeSpentSeconds ? `${Math.floor(attempt.timeSpentSeconds / 60)}m ${attempt.timeSpentSeconds % 60}s` : "",
    attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : "",
  ]);

  return { headers, rows, filename: `results-${slug(test.title)}.csv` };
}

export function buildAnswerDetailCsv({ test, questions, students, attempts }) {
  const list = questions || test.questions || [];
  const byStudent = new Map((attempts || []).map((a) => [String(a.studentId?._id || a.studentId), a]));

  const headers = [
    "register_no",
    "student_name",
    "class",
    "q_no",
    "type",
    "question",
    "marks",
    "given_answer",
    "correct_answer",
    "status",
    "marks_awarded",
  ];

  const rows = [];
  for (const student of students || []) {
    const attempt = byStudent.get(String(student._id));
    if (!attempt) continue;
    const answersByIndex = new Map(attempt.answers.map((a) => [a.questionIndex, a]));
    list.forEach((q, i) => {
      const ans = answersByIndex.get(i);
      rows.push([
        student.username || "",
        student.name,
        student.classroomId?.name ? `${student.classroomId.name}-${student.classroomId.section}` : "",
        i + 1,
        q.type,
        q.text,
        q.marks ?? 1,
        ans ? formatGivenAnswer(q, ans) : "",
        formatCorrectAnswer(q),
        ans?.status || "skipped",
        ans?.marksAwarded ?? 0,
      ]);
    });
  }

  return { headers, rows, filename: `answer-detail-${slug(test.title)}.csv` };
}

export function buildQuestionAnalysisCsv({ test, questions, attempts }) {
  const list = questions || test.questions || [];
  const headers = [
    "q_no",
    "type",
    "question",
    "marks",
    "correct_count",
    "wrong_count",
    "not_answered_count",
    "success_rate",
  ];

  const rows = list.map((q, i) => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    for (const attempt of attempts || []) {
      const ans = (attempt.answers || []).find((a) => a.questionIndex === i);
      if (!ans || ans.status === "skipped") skipped += 1;
      else if (ans.status === "correct") correct += 1;
      else wrong += 1;
    }
    const answered = correct + wrong;
    return [
      i + 1,
      q.type,
      q.text,
      q.marks ?? 1,
      correct,
      wrong,
      skipped,
      pct(answered ? (correct / answered) * 100 : 0),
    ];
  });

  return { headers, rows, filename: `question-analysis-${slug(test.title)}.csv` };
}

export function formatCorrectAnswer(question) {
  if (question.type === "short") return (question.correctAnswers || []).join(" | ");
  if (question.type === "multiselect") return (question.correctOptionIndexes || []).map(optionLetters).join(",");
  if (question.correctOptionIndex === null || question.correctOptionIndex === undefined) return "";
  const text = question.options?.[question.correctOptionIndex];
  return text ? `${optionLetters(question.correctOptionIndex)}. ${text}` : optionLetters(question.correctOptionIndex);
}

export function formatGivenAnswer(question, answer) {
  const picked = answer.selectedOptionIndexes || [];
  const text = picked
    .map((i) => question.options?.[i])
    .filter(Boolean)
    .join(" | ");
  const typed = (answer.textAnswer || "").trim();
  if (text && typed) return `${text} / ${typed}`;
  return text || typed || "";
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function typeLabel(type) {
  return QUESTION_TYPE_LABELS[type] || type;
}

export function slug(value) {
  return String(value || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
