import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";

export async function POST(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid session id.", 400);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const attemptId = String(body?.attemptId || "");
  const updates = Array.isArray(body?.results) ? body.results : [];
  if (!isValidObjectId(attemptId)) return jsonError("Invalid attempt id.", 400);
  if (updates.length === 0) return jsonError("No marks were submitted.", 400);

  await connectDB();

  const doc = await TestSession.findById(params.id);
  if (!doc) return jsonError("Test session not found.", 404);
  if (doc.createdBy.toString() !== session.userId && session.role !== "admin") {
    return jsonError("Forbidden.", 403);
  }

  const test = await Test.findById(doc.testId);
  const attempt = await Attempt.findOne({ _id: attemptId, sessionId: doc._id });
  if (!attempt) return jsonError("Attempt not found.", 404);

  const manualUpdates = new Map();
  for (const update of updates) {
    const questionIndex = Number(update?.questionIndex);
    if (!Number.isInteger(questionIndex) || questionIndex < 0 || questionIndex >= test.questions.length) {
      return jsonError("One of the question numbers is out of range.", 400);
    }
    const marks = Number(update?.marksAwarded);
    if (!Number.isFinite(marks)) return jsonError("Marks must be a number.", 400);
    const max = Number(test.questions[questionIndex].marks) || 0;
    if (marks < 0) return jsonError("Marks cannot be negative.", 400);
    if (marks > max) return jsonError(`Question ${questionIndex + 1} is worth only ${max} mark(s).`, 400);
    manualUpdates.set(questionIndex, Math.round(marks * 100) / 100);
  }

  for (const [questionIndex, marksAwarded] of manualUpdates.entries()) {
    const answer = attempt.answers.find((a) => a.questionIndex === questionIndex);
    if (!answer) continue;
    answer.marksAwarded = marksAwarded;
    answer.status = marksAwarded > 0 ? "correct" : "wrong";
    answer.isCorrect = marksAwarded > 0;
  }

  let score = 0;
  let negativeScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;

  for (const answer of attempt.answers) {
    if (answer.marksAwarded < 0) negativeScore += Math.abs(answer.marksAwarded);
    score += answer.marksAwarded;
    if (answer.status === "correct") correctCount += 1;
    else if (answer.status === "wrong") wrongCount += 1;
    else if (answer.status === "pending") pendingCount += 1;
    else skippedCount += 1;
  }

  const attempted = correctCount + wrongCount;

  attempt.score = Math.round(score * 100) / 100;
  attempt.negativeScore = Math.round(negativeScore * 100) / 100;
  attempt.correctCount = correctCount;
  attempt.wrongCount = wrongCount;
  attempt.skippedCount = skippedCount;
  attempt.pendingCount = pendingCount;
  attempt.accuracy = attempted > 0 ? Math.round((correctCount / attempted) * 1000) / 10 : 0;
  attempt.isFullyGraded = pendingCount === 0;
  attempt.manualGradedBy = session.userId;
  attempt.manualGradedAt = new Date();

  await attempt.save();

  return NextResponse.json({
    attemptId: attempt._id,
    score: attempt.score,
    correctCount,
    wrongCount,
    pendingCount,
    isFullyGraded: attempt.isFullyGraded,
  });
}
