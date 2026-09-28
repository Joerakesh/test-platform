import { QUESTION_TYPES } from "./grading";

const TYPE_SET = new Set(QUESTION_TYPES);

function cleanText(value, max = 4000) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, max);
}

function toMarks(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.max(0, Math.round(n * 100) / 100);
}

export function normaliseQuestion(raw, index, errors) {
  const label = `Question ${index + 1}`;
  const type = TYPE_SET.has(raw?.type) ? raw.type : "mcq";
  const text = cleanText(raw?.text);

  if (!text) {
    errors.push(`${label}: question text is required.`);
    return null;
  }

  const marks = toMarks(raw?.marks, 1);
  let negativeMarks = toMarks(raw?.negativeMarks, 0);
  if (negativeMarks > marks) negativeMarks = marks;

  const question = {
    type,
    text,
    marks,
    negativeMarks,
    options: [],
    correctOptionIndex: null,
    correctOptionIndexes: [],
    correctAnswers: [],
    manualGrade: Boolean(raw?.manualGrade),
    explanation: cleanText(raw?.explanation, 1000),
    chapter: cleanText(raw?.chapter, 120),
    topic: cleanText(raw?.topic, 120),
    difficulty: ["easy", "medium", "hard"].includes(raw?.difficulty) ? raw.difficulty : null,
  };

  if (type === "short") {
    const answers = (Array.isArray(raw?.correctAnswers) ? raw.correctAnswers : [])
      .map((a) => cleanText(a, 300))
      .filter(Boolean);
    question.correctAnswers = answers;
    if (answers.length === 0 && !question.manualGrade) {
      errors.push(`${label}: short answer needs an accepted answer, or switch on manual grading.`);
      return null;
    }
    return question;
  }

  const options = (Array.isArray(raw?.options) ? raw.options : [])
    .map((o) => cleanText(o, 500))
    .filter(Boolean);

  if (type === "truefalse") {
    question.options = ["True", "False"];
    const wanted = String(raw?.correctOptionIndex ?? raw?.correctOptionIndexes?.[0] ?? 0)
      .toLowerCase()
      .trim();
    const asText = wanted === "false" || wanted === "1" || wanted === "b" ? 1 : 0;
    const asNumber = Number(raw?.correctOptionIndex);
    question.correctOptionIndex = Number.isFinite(asNumber) && raw?.correctOptionIndex !== undefined
      ? (asNumber === 1 ? 1 : 0)
      : asText;
    return question;
  }

  if (options.length < 2) {
    errors.push(`${label}: needs at least 2 options.`);
    return null;
  }
  question.options = options;

  if (type === "multiselect") {
    const idx = (Array.isArray(raw?.correctOptionIndexes) ? raw.correctOptionIndexes : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
    question.correctOptionIndexes = [...new Set(idx)].sort((a, b) => a - b);
    if (question.correctOptionIndexes.length === 0) {
      errors.push(`${label}: choose at least one correct option.`);
      return null;
    }
    return question;
  }

  const idx = Number(raw?.correctOptionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) {
    errors.push(`${label}: mark the correct option.`);
    return null;
  }
  question.correctOptionIndex = idx;
  return question;
}

export function normaliseTestPayload(input) {
  const errors = [];
  const title = cleanText(input?.title, 200);
  if (!title) errors.push("Test title is required.");

  const duration = toMarks(input?.duration, 0);
  if (duration <= 0) errors.push("Duration must be at least 1 minute.");
  if (duration > 600) errors.push("Duration cannot be more than 600 minutes.");

  const rawQuestions = Array.isArray(input?.questions) ? input.questions : [];
  if (rawQuestions.length === 0) errors.push("Add at least one question.");
  if (rawQuestions.length > 300) errors.push("A test can have at most 300 questions.");

  const questions = [];
  rawQuestions.forEach((raw, i) => {
    const q = normaliseQuestion(raw, i, errors);
    if (q) questions.push(q);
  });

  if (errors.length > 0) return { ok: false, errors };

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return {
    ok: true,
    errors: [],
    value: {
      title,
      description: cleanText(input?.description, 2000),
      subject: cleanText(input?.subject, 80),
      className: cleanText(input?.className, 20),
      sections: (Array.isArray(input?.sections) ? input.sections : [])
        .map((s) => cleanText(s, 20).toUpperCase())
        .filter(Boolean),
      academicYear: cleanText(input?.academicYear, 20),
      duration,
      questions,
      totalMarks,
      negativeMarking: Boolean(input?.negativeMarking),
      shuffleQuestions: Boolean(input?.shuffleQuestions),
      shuffleOptions: Boolean(input?.shuffleOptions),
      showResultImmediately: input?.showResultImmediately !== false,
      source: ["manual", "csv", "bank"].includes(input?.source) ? input.source : "manual",
    },
  };
}

export function validateRegisterNumber(value) {
  return /^[A-Z0-9][A-Z0-9-]{2,19}$/.test(String(value || "").toUpperCase());
}

export function validateEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value));
}

export function validatePassword(value) {
  return typeof value === "string" && value.length >= 6 && value.length <= 128;
}
