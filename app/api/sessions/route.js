import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { getSessionStatus, SESSION_STATUS_LABELS } from "@/lib/grading";
import { resolveAudience } from "@/lib/paper";

export async function GET(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  const now = new Date();

  if (session.role === "teacher" || session.role === "admin") {
    const ownerId = session.role === "teacher" ? session.userId : null;
    let list = await TestSession.find({ createdBy: ownerId })
      .populate("testId", "title subject className duration totalMarks negativeMarking shuffleQuestions showResultImmediately")
      .populate("assignedClassrooms", "name section")
      .sort({ startTime: -1 })
      .lean();

    const attempts = await Attempt.aggregate([
      { $match: { sessionId: { $in: list.map((s) => s._id) } } },
      {
        $group: {
          _id: "$sessionId",
          count: { $sum: 1 },
          averageScore: { $avg: "$score" },
          totalMarks: { $avg: "$totalMarks" },
        },
      },
    ]);
    const attemptMap = new Map(attempts.map((a) => [String(a._id), a]));

    let sessions = list.map((s) => {
      const agg = attemptMap.get(String(s._id));
      const assigned = s.assignedStudents?.length || 0;
      return {
        id: s._id,
        test: s.testId,
        startTime: s.startTime,
        endTime: s.endTime,
        instructions: s.instructions,
        resultsPublished: s.resultsPublished,
        isClosed: s.isClosed,
        classrooms: (s.assignedClassrooms || []).map((c) => `${c.name}-${c.section}`),
        assignedCount: assigned,
        attemptCount: agg?.count || 0,
        averageScore: agg?.count ? Math.round((agg.averageScore || 0) * 10) / 10 : 0,
        averagePercentage:
          agg?.count && agg.totalMarks
            ? Math.round(((agg.averageScore || 0) / agg.totalMarks) * 1000) / 10
            : 0,
        status: getSessionStatus(s, now),
        statusLabel: SESSION_STATUS_LABELS[getSessionStatus(s, now)],
      };
    });

    if (status) sessions = sessions.filter((s) => s.status === status);
    return noStore({ sessions });
  }

  const sessions = await TestSession.find({ assignedStudents: session.userId })
    .populate("testId", "title subject className duration totalMarks negativeMarking showResultImmediately")
    .sort({ startTime: -1 })
    .lean();

  const attemptIds = sessions.map((s) => String(s._id));
  const myAttempts = await Attempt.find({ studentId: session.userId, sessionId: { $in: attemptIds } }).lean();
  const attemptMap = new Map(myAttempts.map((a) => [String(a.sessionId), a]));

  return noStore({
    sessions: sessions.map((s) => {
      const status = getSessionStatus(s, now);
      const attempt = attemptMap.get(String(s._id));
      const reveal =
        attempt &&
        status !== "active" &&
        (s.testId?.showResultImmediately || s.resultsPublished);

      return {
        id: s._id,
        test: s.testId,
        startTime: s.startTime,
        endTime: s.endTime,
        instructions: s.instructions,
        status,
        statusLabel: SESSION_STATUS_LABELS[status],
        questionCount: undefined,
        attemptId: attempt ? attempt._id : null,
        score: reveal ? attempt.score : null,
        totalMarks: reveal ? attempt.totalMarks : null,
        resultVisible: Boolean(reveal),
      };
    }),
  });
}

export async function POST(req) {
  const { session, error } = await requireUser(["teacher"]);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const testId = String(body?.testId || "");
  const startTime = body?.startTime ? new Date(body.startTime) : null;
  const endTime = body?.endTime ? new Date(body.endTime) : null;

  if (!isValidObjectId(testId)) return jsonError("Choose a test.", 400);
  if (!startTime || Number.isNaN(startTime.getTime())) return jsonError("Choose a start time.", 400);
  if (!endTime || Number.isNaN(endTime.getTime())) return jsonError("Choose an end time.", 400);
  if (endTime <= startTime) return jsonError("The end time must be after the start time.", 400);
  if (endTime.getTime() - startTime.getTime() > 12 * 60 * 60 * 1000) {
    return jsonError("A test session cannot be longer than 12 hours.", 400);
  }

  const assignedStudents = Array.isArray(body?.assignedStudents) ? body.assignedStudents.filter(Boolean) : [];
  const assignedClassrooms = Array.isArray(body?.assignedClassrooms)
    ? body.assignedClassrooms.filter((id) => isValidObjectId(id))
    : [];

  await connectDB();

  const test = await Test.findOne({ _id: testId, createdBy: session.userId });
  if (!test) return jsonError("Test not found.", 404);

  const audience = await resolveAudience({ assignedStudents, assignedClassrooms }, session.userId);
  if (audience.length === 0) {
    return jsonError("Assign at least one class or student, otherwise nobody will receive the paper.", 400);
  }

  const validCount = await User.countDocuments({
    _id: { $in: audience },
    role: "student",
    isActive: { $ne: false },
  });
  if (validCount === 0) return jsonError("None of the selected students are active.", 400);

  const overlap = await TestSession.findOne({
    createdBy: session.userId,
    _id: { $ne: null },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }).populate("testId", "title");
  if (overlap) {
    return jsonError(
      `This overlaps "${overlap.testId?.title || "another test"}" which is already scheduled in that time window.`,
      409
    );
  }

  const created = await TestSession.create({
    testId,
    createdBy: session.userId,
    assignedStudents: audience,
    assignedClassrooms,
    startTime,
    endTime,
    instructions: String(body?.instructions || "").slice(0, 2000),
    resultsPublished: Boolean(body?.resultsPublished),
  });

  return NextResponse.json(
    { session: { id: created._id, assignedCount: audience.length } },
    { status: 201 }
  );
}
