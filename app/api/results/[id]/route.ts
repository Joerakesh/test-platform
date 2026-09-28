// @ts-nocheck
import connectDB from "@/lib/db";
import Attempt from "@/models/Attempt";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import User from "@/models/User";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { getSessionStatus } from "@/lib/grading";
import { optionLetters } from "@/lib/grading";

export async function GET(req, { params }) {
  const { session, error } = await requireUser(["student"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid attempt id.", 400);

  await connectDB();
  const attempt = await Attempt.findById(params.id);
  if (!attempt) return jsonError("Result not found.", 404);
  if (attempt.studentId.toString() !== session.userId) return jsonError("Forbidden.", 403);

  const doc = await TestSession.findById(attempt.sessionId);
  if (!doc) return jsonError("The test session is no longer available.", 404);

  const test = await Test.findById(doc.testId);
  if (!test) return jsonError("The question paper could not be found.", 404);

  const status = getSessionStatus(doc, new Date());
  if (status === "active" || !(test.showResultImmediately || doc.resultsPublished)) {
    return jsonError("Your results for this test have not been published yet.", 403);
  }

  const answerByIndex = new Map((attempt.answers || []).map((a) => [a.questionIndex, a]));

  return noStore({
    attempt: {
      id: attempt._id,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      negativeScore: attempt.negativeScore,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      pendingCount: attempt.pendingCount,
      accuracy: attempt.accuracy,
      timeSpentSeconds: attempt.timeSpentSeconds,
      submittedAt: attempt.submittedAt,
      percentage: attempt.totalMarks
        ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10
        : 0,
    },
    test: {
      title: test.title,
      subject: test.subject,
      className: test.className,
      duration: test.duration,
      negativeMarking: test.negativeMarking,
      totalMarks: attempt.totalMarks,
    },
    session: { startTime: doc.startTime, endTime: doc.endTime },
    review: (test.questions || []).map((question, i) => {
      const given = answerByIndex.get(i);
      const correct =
        question.type === "short"
          ? (question.correctAnswers || []).join(" / ")
          : question.type === "multiselect"
            ? (question.correctOptionIndexes || []).map(optionLetters).join(", ")
            : question.correctOptionIndex != null
              ? `${optionLetters(question.correctOptionIndex)}. ${question.options?.[question.correctOptionIndex] ?? ""}`
              : "";

      return {
        questionIndex: i,
        type: question.type,
        text: question.text,
        marks: question.marks,
        negativeMarks: question.negativeMarks,
        options: (question.options || []).map((text, oi) => ({
          index: oi,
          key: optionLetters(oi),
          text,
          isCorrect:
            question.type === "multiselect"
              ? (question.correctOptionIndexes || []).includes(oi)
              : question.correctOptionIndex === oi,
          isChosen: (given?.selectedOptionIndexes || []).includes(oi),
        })),
        textAnswer: given?.textAnswer || "",
        correctAnswer: correct,
        status: given?.status || "skipped",
        marksAwarded: given?.marksAwarded ?? 0,
        explanation: question.explanation || "",
        chapter: question.chapter || "",
      };
    }),
  });
}
