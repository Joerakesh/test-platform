import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";
import { gradeAttempt, getSessionStatus } from "@/lib/grading";

const GRACE_MS = 20 * 1000;
const MAX_QUESTIONS = 400;

export async function POST(req, { params }) {
  const { session, error } = await requireUser(["student"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid session id.", 400);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  await connectDB();

  const doc = await TestSession.findById(params.id);
  if (!doc) return jsonError("Test session not found.", 404);

  const isAssigned = (doc.assignedStudents || []).some((id) => id.toString() === session.userId);
  if (!isAssigned) return jsonError("This test is not assigned to you.", 403);

  const status = getSessionStatus(doc, new Date());
  if (status === "upcoming") {
    return jsonError("This test has not started yet.", 400);
  }
  if (status !== "active" && Date.now() > new Date(doc.endTime).getTime() + GRACE_MS) {
    return jsonError("The time for this test is over.", 400);
  }

  const existing = await Attempt.findOne({ sessionId: doc._id, studentId: session.userId });
  if (existing) return jsonError("You have already submitted this test.", 409);

  const test = await Test.findById(doc.testId);
  if (!test) return jsonError("The question paper could not be found.", 404);

  const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];
  if (rawAnswers.length > MAX_QUESTIONS) return jsonError("Too many answers were submitted.", 400);

  const answers = rawAnswers
    .map((a) => {
      const questionIndex = Number(a?.questionIndex);
      if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= test.questions.length) {
        return null;
      }
      const selectedOptionIndexes = Array.isArray(a?.selectedOptionIndexes)
        ? [...new Set(a.selectedOptionIndexes.map(Number).filter(Number.isInteger))]
        : [];
      return {
        questionIndex,
        selectedOptionIndexes,
        textAnswer: String(a?.textAnswer ?? "").slice(0, 2000),
        markedForReview: Boolean(a?.markedForReview),
      };
    })
    .filter(Boolean);

  const graded = gradeAttempt({
    questions: test.questions,
    responses: answers,
    negativeMarking: test.negativeMarking,
  });

  const resultByIndex = new Map(graded.results.map((r) => [r.questionIndex, r]));
  const storedAnswers = test.questions.map((q, i) => {
    const given = answers.find((a) => a.questionIndex === i) || {};
    const result = resultByIndex.get(i);
    return {
      questionIndex: i,
      selectedOptionIndexes: given.selectedOptionIndexes || [],
      textAnswer: given.textAnswer || "",
      markedForReview: Boolean(given.markedForReview),
      isCorrect: result?.isCorrect ?? null,
      marksAwarded: result?.marksAwarded ?? 0,
      status: result?.status ?? "skipped",
    };
  });

  const windowSeconds = Math.floor((new Date(doc.endTime).getTime() - new Date(doc.startTime).getTime()) / 1000);
  const reported = Number(body?.timeSpentSeconds);
  const timeSpentSeconds = Number.isFinite(reported) && reported > 0
    ? Math.min(Math.floor(reported), Math.max(0, windowSeconds))
    : Math.max(0, windowSeconds);

  const attempt = await Attempt.create({
    sessionId: doc._id,
    studentId: session.userId,
    answers: storedAnswers,
    score: graded.score,
    totalMarks: graded.totalMarks,
    negativeScore: graded.negativeScore,
    correctCount: graded.correctCount,
    wrongCount: graded.wrongCount,
    skippedCount: graded.skippedCount,
    pendingCount: graded.pendingCount,
    accuracy: graded.accuracy,
    isFullyGraded: graded.isFullyGraded,
    timeSpentSeconds,
    submittedAt: new Date(),
  });

  const reveal = test.showResultImmediately || doc.resultsPublished;

  return NextResponse.json(
    {
      attemptId: attempt._id,
      result: {
        score: graded.score,
        totalMarks: graded.totalMarks,
        correctCount: graded.correctCount,
        wrongCount: graded.wrongCount,
        skippedCount: graded.skippedCount,
        pendingCount: graded.pendingCount,
        accuracy: graded.accuracy,
        negativeScore: graded.negativeScore,
      },
      resultsPublished: reveal,
    },
    { status: 201 }
  );
}
