// @ts-nocheck
import connectDB from "@/lib/db";
import Test from "@/models/Test";
import TestSession from "@/models/TestSession";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { requireUser, noStore } from "@/lib/guard";
import { csvResponse, slug } from "@/lib/csv";

export async function GET(req) {
  const { session, error } = await requireUser(["admin"]);
  if (error) return error;

  await connectDB();

  const attempts = await Attempt.find({})
    .populate("studentId", "name rollNo username classroomId")
    .populate({ path: "sessionId", populate: { path: "testId", select: "title subject className totalMarks createdBy" } })
    .lean();

  const tests = await Test.find({}).select("title subject className createdBy").lean();
  const teachers = await User.find({ role: "teacher" }).select("name").lean();
  const teacherMap = new Map(teachers.map((t) => [String(t._id), t.name]));

  const rows = attempts.map((a) => {
    const test = a.sessionId?.testId;
    const student = a.studentId;
    return {
      registerNo: student?.username || "",
      rollNo: student?.rollNo || "",
      student: student?.name || "",
      classSection: student?.classroomId ? `${student.classroomId.name}-${student.classroomId.section}` : "",
      test: test?.title || "",
      subject: test?.subject || "",
      class: test?.className || "",
      teacher: teacherMap.get(String(test?.createdBy)) || "",
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.totalMarks ? Math.round((a.score / a.totalMarks) * 1000) / 10 : 0,
      correct: a.correctCount,
      wrong: a.wrongCount,
      notAnswered: a.skippedCount,
      accuracy: a.accuracy,
      submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : "",
    };
  });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const headers = [
      "register_no", "roll_no", "student_name", "class_section", "test_title", "subject",
      "test_class", "teacher", "score", "total_marks", "percentage", "correct", "wrong",
      "not_answered", "accuracy", "submitted_at",
    ];
    return csvResponse(`school-test-records-${slug(new Date().toISOString().slice(0, 10))}.csv`, headers, rows);
  }

  const group = (keyFn) => {
    const map = new Map();
    for (const row of rows) {
      const key = keyFn(row) || "Not recorded";
      if (!map.has(key)) map.set(key, { label: key, count: 0, sum: 0, total: 0, passes: 0 });
      const entry = map.get(key);
      entry.count += 1;
      entry.sum += row.score;
      entry.total += row.totalMarks;
      if (row.percentage >= 40) entry.passes += 1;
    }
    return [...map.values()]
      .map((e) => ({
        label: e.label,
        attempts: e.count,
        average: e.total ? Math.round((e.sum / e.total) * 1000) / 10 : 0,
        passPercentage: e.count ? Math.round((e.passes / e.count) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);
  };

  const sessionCount = await TestSession.countDocuments({});

  return noStore({
    totals: {
      attempts: rows.length,
      tests: tests.length,
      sessions: sessionCount,
      averagePercentage: rows.length
        ? Math.round((rows.reduce((s, r) => s + r.percentage, 0) / rows.length) * 10) / 10
        : 0,
      passPercentage: rows.length
        ? Math.round((rows.filter((r) => r.percentage >= 40).length / rows.length) * 1000) / 10
        : 0,
    },
    bySubject: group((r) => r.subject),
    byClass: group((r) => r.classSection),
    byTeacher: group((r) => r.teacher),
    byTest: group((r) => r.test),
  });
}
