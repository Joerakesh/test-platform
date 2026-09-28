import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { resolveAudience } from "@/lib/paper";

function buildQuestionAnalysis(test, attempts) {
  const list = test.questions || [];
  return list.map((question, i) => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let pending = 0;
    let marksLost = 0;

    for (const attempt of attempts) {
      const answer = (attempt.answers || []).find((a) => a.questionIndex === i);
      if (!answer || answer.status === "skipped") {
        skipped += 1;
        marksLost += Number(question.marks) || 0;
      } else if (answer.status === "correct") {
        correct += 1;
      } else if (answer.status === "pending") {
        pending += 1;
      } else {
        wrong += 1;
        marksLost += Math.max(0, (Number(question.marks) || 0) - (Number(answer.marksAwarded) || 0));
      }
    }

    const answered = correct + wrong;
    return {
      questionIndex: i,
      text: question.text,
      type: question.type,
      marks: question.marks,
      chapter: question.chapter || "",
      correct,
      wrong,
      skipped,
      pending,
      answered,
      successRate: answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0,
      averageScore:
        attempts.length > 0
          ? Math.round((attempts.reduce((s, a) => s + Math.max(0, a.answers?.find((x) => x.questionIndex === i)?.marksAwarded || 0), 0) / attempts.length) * 100) / 100
          : 0,
      marksLost: Math.round(marksLost * 100) / 100,
    };
  });
}

export async function GET(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid session id.", 400);

  await connectDB();
  const doc = await TestSession.findById(params.id);
  if (!doc) return jsonError("Test session not found.", 404);
  if (doc.createdBy.toString() !== session.userId && session.role !== "admin") {
    return jsonError("Forbidden.", 403);
  }

  const test = await Test.findById(doc.testId);
  if (!test) return jsonError("The question paper could not be found.", 404);

  const audience = await resolveAudience(
    { assignedStudents: doc.assignedStudents, assignedClassrooms: doc.assignedClassrooms },
    session.role === "teacher" ? doc.createdBy.toString() : null
  );

  const students = await User.find({ _id: { $in: audience } })
    .populate("classroomId", "name section")
    .select("name email username rollNo classroomId")
    .lean();

  const attempts = await Attempt.find({ sessionId: doc._id }).lean();
  const attemptMap = new Map(attempts.map((a) => [String(a.studentId), a]));

  const rows = students
    .map((student) => {
      const attempt = attemptMap.get(String(student._id));
      return {
        id: student._id,
        name: student.name,
        registerNo: student.username,
        rollNo: student.rollNo,
        email: student.email,
        className: student.classroomId?.name || "",
        section: student.classroomId?.section || "",
        classLabel: student.classroomId ? `${student.classroomId.name}-${student.classroomId.section}` : "",
        submitted: Boolean(attempt),
        attemptId: attempt?._id ?? null,
        score: attempt?.score ?? null,
        totalMarks: attempt?.totalMarks ?? test.totalMarks,
        percentage:
          attempt && attempt.totalMarks
            ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10
            : null,
        correctCount: attempt?.correctCount ?? null,
        wrongCount: attempt?.wrongCount ?? null,
        skippedCount: attempt?.skippedCount ?? null,
        pendingCount: attempt?.pendingCount ?? null,
        accuracy: attempt?.accuracy ?? null,
        negativeScore: attempt?.negativeScore ?? null,
        isFullyGraded: attempt ? attempt.isFullyGraded !== false : null,
        timeSpentSeconds: attempt?.timeSpentSeconds ?? null,
        submittedAt: attempt?.submittedAt ?? null,
      };
    })
    .sort((a, b) => {
      if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
      if (b.score !== a.score) return (b.score ?? -1) - (a.score ?? -1);
      return String(a.rollNo || a.name).localeCompare(String(b.rollNo || b.name));
    });

  const submitted = rows.filter((r) => r.submitted);
  const scores = submitted.map((r) => r.score ?? 0);
  const total = test.totalMarks || 0;
  const passMark = total / 2;

  const ranked = [...submitted].sort((a, b) => b.score - a.score);
  let lastScore = null;
  let lastRank = 0;
  ranked.forEach((row, i) => {
    row.rank = row.score === lastScore ? lastRank : i + 1;
    lastScore = row.score;
    lastRank = row.rank;
  });

  const passed = submitted.filter((r) => r.score >= passMark).length;
  const sum = scores.reduce((s, v) => s + v, 0);

  const gradeBands = [
    { label: "90–100%", min: 0.9, max: Infinity },
    { label: "75–89%", min: 0.75, max: 0.9 },
    { label: "50–74%", min: 0.5, max: 0.75 },
    { label: "35–49%", min: 0.35, max: 0.5 },
    { label: "Below 35%", min: 0, max: 0.35 },
  ].map((band) => ({
    label: band.label,
    count: submitted.filter((r) => {
      const p = total ? r.score / total : 0;
      return p >= band.min && p < band.max;
    }).length,
  }));

  return noStore({
    session: {
      id: doc._id,
      title: test.title,
      subject: test.subject,
      className: test.className,
      totalMarks: total,
      duration: test.duration,
      startTime: doc.startTime,
      endTime: doc.endTime,
      resultsPublished: doc.resultsPublished,
      isClosed: doc.isClosed,
    },
    rows,
    attempts,
    analysis: buildQuestionAnalysis(test, attempts),
    summary: {
      assigned: rows.length,
      submitted: submitted.length,
      absent: rows.length - submitted.length,
      pendingReview: submitted.filter((r) => r.isFullyGraded === false).length,
      average: scores.length ? Math.round((sum / scores.length) * 100) / 100 : 0,
      averagePercentage: total && scores.length ? Math.round((sum / scores.length / total) * 1000) / 10 : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
      median: scores.length ? [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)] : 0,
      passMark,
      passed,
      failed: submitted.length - passed,
      passPercentage: submitted.length ? Math.round((passed / submitted.length) * 1000) / 10 : 0,
      gradeBands,
    },
  });
}
