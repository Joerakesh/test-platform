// @ts-nocheck
import connectDB from "@/lib/db";
import Attempt from "@/models/Attempt";
import TestSession from "@/models/TestSession";
import { requireUser, noStore, jsonError } from "@/lib/guard";
import { getSessionStatus } from "@/lib/grading";

export async function GET() {
  const { session, error } = await requireUser(["student"]);
  if (error) return error;

  await connectDB();

  const attempts = await Attempt.find({ studentId: session.userId })
    .populate({ path: "sessionId", populate: { path: "testId", select: "title subject className totalMarks showResultImmediately" } })
    .sort({ submittedAt: -1 })
    .lean();

  const now = new Date();

  const results = attempts.map((a) => {
    const s = a.sessionId;
    const status = s ? getSessionStatus(s, now) : "ended";
    const visible = status !== "active" && (s?.testId?.showResultImmediately || s?.resultsPublished);

    return {
      id: a._id,
      test: s?.testId
        ? { id: s.testId._id, title: s.testId.title, subject: s.testId.subject, className: s.testId.className }
        : null,
      sessionId: s?._id,
      startTime: s?.startTime,
      endTime: s?.endTime,
      score: visible ? a.score : null,
      totalMarks: visible ? a.totalMarks : null,
      percentage:
        visible && a.totalMarks ? Math.round((a.score / a.totalMarks) * 1000) / 10 : null,
      correctCount: visible ? a.correctCount : null,
      wrongCount: visible ? a.wrongCount : null,
      skippedCount: visible ? a.skippedCount : null,
      pendingCount: a.pendingCount,
      accuracy: visible ? a.accuracy : null,
      timeSpentSeconds: visible ? a.timeSpentSeconds : null,
      submittedAt: a.submittedAt,
      status,
      visible,
      hiddenReason: visible
        ? null
        : status === "active"
          ? "The test is still running. Results appear after you submit."
          : "Your teacher has not published the results yet.",
    };
  });

  const visibleOnes = results.filter((r) => r.visible);
  const totalScored = visibleOnes.filter((r) => r.totalMarks);

  return noStore({
    results,
    summary: {
      testsTaken: attempts.length,
      published: visibleOnes.length,
      average: totalScored.length
        ? Math.round(
            (totalScored.reduce((s, r) => s + r.percentage, 0) / totalScored.length) * 10
          ) / 10
        : 0,
      best: totalScored.length ? Math.max(...totalScored.map((r) => r.percentage)) : 0,
      awaitingPublication: results.filter((r) => !r.visible).length,
    },
  });
}
