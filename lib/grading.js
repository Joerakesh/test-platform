export const QUESTION_TYPES = ["mcq", "truefalse", "multiselect", "short"];

export const QUESTION_TYPE_LABELS = {
  mcq: "Multiple Choice",
  truefalse: "True / False",
  multiselect: "Multiple Correct",
  short: "Short Answer",
};

export const QUESTION_TYPE_TAMIL = {
  mcq: "சரியான விடை",
  truefalse: "சரி / தவறு",
  multiselect: "பல சரியான விடை",
  short: "குறு விடை",
};

export const STATUS_LABELS = {
  correct: "Correct",
  wrong: "Wrong",
  skipped: "Not Answered",
  pending: "Awaiting Review",
};

function normaliseText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;!?]+$/g, "");
}

export function optionLetters(index) {
  return String.fromCharCode(65 + Number(index || 0));
}

export function isAnswered(response) {
  if (!response) return false;
  const picked = Array.isArray(response.selectedOptionIndexes) ? response.selectedOptionIndexes : [];
  if (picked.length > 0) return true;
  return normaliseText(response.textAnswer).length > 0;
}

export function gradeQuestion(question, response, options = {}) {
  const allowNegative = options.negativeMarking !== false;
  const marks = Number(question?.marks) || 0;
  const negative = allowNegative ? Number(question?.negativeMarks) || 0 : 0;
  const type = question?.type || "mcq";

  if (!isAnswered(response)) {
    return { status: "skipped", marksAwarded: 0, isCorrect: null };
  }

  if (type === "short") {
    if (question.manualGrade) {
      return { status: "pending", marksAwarded: 0, isCorrect: null };
    }
    const accepted = (question.correctAnswers || []).map(normaliseText).filter(Boolean);
    const given = normaliseText(response.textAnswer);
    const isCorrect = accepted.length > 0 && accepted.includes(given);
    return {
      status: isCorrect ? "correct" : "wrong",
      marksAwarded: isCorrect ? marks : -negative,
      isCorrect,
    };
  }

  const expected =
    type === "multiselect"
      ? (question.correctOptionIndexes || []).map(Number).sort((a, b) => a - b)
      : [Number(question.correctOptionIndex)];

  const givenUnique = [
    ...new Set(
      (Array.isArray(response.selectedOptionIndexes) ? response.selectedOptionIndexes : []).map(Number)
    ),
  ].sort((a, b) => a - b);

  const isCorrect =
    expected.length > 0 &&
    expected.every((v) => v >= 0) &&
    expected.length === givenUnique.length &&
    expected.every((v, i) => v === givenUnique[i]);

  return {
    status: isCorrect ? "correct" : "wrong",
    marksAwarded: isCorrect ? marks : -negative,
    isCorrect,
  };
}

export function gradeAttempt({ questions = [], responses = [], negativeMarking = false }) {
  const byIndex = new Map();
  for (const r of responses) {
    if (r && Number.isInteger(Number(r.questionIndex))) {
      byIndex.set(Number(r.questionIndex), r);
    }
  }

  const results = questions.map((question, index) => {
    const response = byIndex.get(index) || {};
    const graded = gradeQuestion(question, response, { negativeMarking });
    return {
      questionIndex: index,
      ...graded,
      markedForReview: Boolean(response.markedForReview),
    };
  });

  let score = 0;
  let negativeScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;

  for (const r of results) {
    if (r.marksAwarded < 0) negativeScore += Math.abs(r.marksAwarded);
    score += r.marksAwarded;
    if (r.status === "correct") correctCount += 1;
    else if (r.status === "wrong") wrongCount += 1;
    else if (r.status === "pending") pendingCount += 1;
    else skippedCount += 1;
  }

  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
  const attempted = correctCount + wrongCount;

  return {
    results,
    score,
    totalMarks,
    negativeScore,
    correctCount,
    wrongCount,
    skippedCount,
    pendingCount,
    accuracy: attempted > 0 ? Math.round((correctCount / attempted) * 1000) / 10 : 0,
    isFullyGraded: pendingCount === 0,
  };
}

export function attemptPercentage(attempt) {
  if (!attempt || !attempt.totalMarks) return 0;
  return Math.round((attempt.score / attempt.totalMarks) * 1000) / 10;
}

export function getSessionStatus(session, now = new Date()) {
  if (!session) return "unknown";
  if (session.isClosed) return "closed";
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  const t = now.getTime();
  if (t < start) return "upcoming";
  if (t > end) return "ended";
  return "active";
}

export const SESSION_STATUS_LABELS = {
  upcoming: "Scheduled",
  active: "Live Now",
  ended: "Closed",
  closed: "Closed",
  unknown: "Unknown",
};

export function shuffleArray(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildQuestionOrder(questions, { shuffleQuestions = false, shuffleOptions = false } = {}) {
  const entries = questions.map((question, originalIndex) => {
    let options = question.options.map((text, optionIndex) => ({ text, optionIndex }));
    if (shuffleOptions && options.length > 1) options = shuffleArray(options);
    return {
      question,
      originalIndex,
      displayOptions: options,
      correctOptionIndex: question.correctOptionIndex,
      correctOptionIndexes: question.correctOptionIndexes || [],
      correctAnswers: question.correctAnswers || [],
    };
  });

  return shuffleQuestions ? shuffleArray(entries) : entries;
}
