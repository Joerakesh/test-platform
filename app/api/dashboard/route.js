import connectDB from "@/lib/db";
import User from "@/models/User";
import Classroom from "@/models/Classroom";
import Test from "@/models/Test";
import TestSession from "@/models/TestSession";
import Attempt from "@/models/Attempt";
import QuestionBankItem from "@/models/QuestionBankItem";
import { requireUser, noStore } from "@/lib/guard";
import { getSessionStatus } from "@/lib/grading";

export async function GET(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  await connectDB();
  const now = new Date();
  const role = session.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";

  const teacherScope = isTeacher ? { createdBy: session.userId } : {};
  const studentScope = isTeacher ? { createdBy: session.userId } : {};

  const [studentCount, classroomCount, testCount, bankCount, sessionDocs] = await Promise.all([
    User.countDocuments({ role: "student", ...studentScope, isActive: { $ne: false } }),
    Classroom.countDocuments({}),
    Test.countDocuments({ ...teacherScope, isArchived: { $ne: true } }),
    isAdmin ? QuestionBankItem.countDocuments({}) : QuestionBankItem.countDocuments(teacherScope),
    TestSession.find(isTeacher ? { createdBy: session.userId } : {}).select("startTime endTime isClosed testId").lean(),
  ]);

  const sessionIds = sessionDocs.map((s) => s._id);
  const attemptCount = await Attempt.countDocuments({ sessionId: { $in: sessionIds } });

  const upcoming = sessionDocs.filter((s) => getSessionStatus(s, now) === "upcoming").length;
  const live = sessionDocs.filter((s) => getSessionStatus(s, now) === "active").length;

  if (role === "student") {
    const mine = await TestSession.find({ assignedStudents: session.userId }).select("_id startTime endTime isClosed resultsPublished").lean();
    const myIds = mine.map((s) => s._id);
    const [myAttempts, pendingReview] = await Promise.all([
      Attempt.find({ studentId: session.userId, sessionId: { $in: myIds } }).lean(),
      Attempt.countDocuments({ studentId: session.userId, sessionId: { $in: myIds }, isFullyGraded: false }),
    ]);

    const scored = myAttempts.filter((a) => a.totalMarks);
    const avg = scored.length
      ? Math.round((scored.reduce((s, a) => s + (a.score / a.totalMarks) * 100, 0) / scored.length) * 10) / 10
      : 0;

    return noStore({
      role,
      stats: {
        assigned: mine.length,
        upcoming: mine.filter((s) => getSessionStatus(s, now) === "upcoming").length,
        live: mine.filter((s) => getSessionStatus(s, now) === "active").length,
        completed: myAttempts.length,
        averagePercentage: avg,
        best: scored.length
          ? Math.round(Math.max(...scored.map((a) => (a.score / a.totalMarks) * 100)) * 10) / 10
          : 0,
        pendingReview,
      },
    });
  }

  const recentTests = await Test.find({ ...teacherScope, isArchived: { $ne: true } })
    .select("title subject className totalMarks duration questions source createdAt")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const liveSessions = sessionDocs.filter((s) => getSessionStatus(s, now) === "active").slice(0, 5);

  const byClass = await User.aggregate([
    { $match: { role: "student", ...studentScope, isActive: { $ne: false } } },
    {
      $lookup: {
        from: "classrooms",
        localField: "classroomId",
        foreignField: "_id",
        as: "classroom",
      },
    },
    { $unwind: { path: "$classroom", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          name: { $ifNull: ["$classroom.name", "Unassigned"] },
          section: { $ifNull: ["$classroom.section", ""] },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);

  const recentAttempts = await Attempt.find({ sessionId: { $in: sessionIds } })
    .sort({ submittedAt: -1 })
    .limit(6)
    .populate("studentId", "name rollNo")
    .populate({ path: "sessionId", populate: { path: "testId", select: "title totalMarks" } })
    .lean();

  return noStore({
    role,
    stats: {
      students: studentCount,
      teachers: isAdmin ? await User.countDocuments({ role: "teacher" }) : undefined,
      classes: classroomCount,
      tests: testCount,
      bankQuestions: bankCount,
      sessions: sessionDocs.length,
      attempts: attemptCount,
      upcoming,
      live,
    },
    classBreakdown: byClass.map((c) => ({
      label: c._id.section ? `${c._id.name}-${c._id.section}` : c._id.name,
      count: c.count,
    })),
    recentTests: recentTests.map((t) => ({
      id: t._id,
      title: t.title,
      subject: t.subject,
      className: t.className,
      totalMarks: t.totalMarks,
      duration: t.duration,
      questionCount: (t.questions || []).length,
      source: t.source,
      createdAt: t.createdAt,
    })),
    liveSessions,
    recentAttempts: recentAttempts.map((a) => ({
      id: a._id,
      student: a.studentId?.name || "—",
      rollNo: a.studentId?.rollNo || "",
      test: a.sessionId?.testId?.title || "—",
      score: a.score,
      totalMarks: a.totalMarks,
      submittedAt: a.submittedAt,
      pending: a.isFullyGraded === false,
    })),
  });
}
