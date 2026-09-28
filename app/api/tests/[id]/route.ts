// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Test from "@/models/Test";
import TestSession from "@/models/TestSession";
import Attempt from "@/models/Attempt";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { normaliseTestPayload } from "@/lib/validate";
import { getSessionStatus } from "@/lib/grading";

async function loadOwnedTest(id, session) {
  await connectDB();
  if (!isValidObjectId(id)) return { error: jsonError("Invalid test id.", 400) };

  const test = await Test.findById(id);
  if (!test) return { error: jsonError("Test not found.", 404) };

  if (session.role === "student") {
    const assigned = await TestSession.findOne({ testId: test._id, assignedStudents: session.userId });
    if (!assigned) return { error: jsonError("Forbidden.", 403) };
    return { test, role: "student", sessionDoc: assigned };
  }

  if (session.role === "teacher" && test.createdBy.toString() !== session.userId) {
    return { error: jsonError("This test belongs to another teacher.", 403) };
  }

  return { test, role: session.role };
}

export async function GET(req, { params }) {
  const { session, error } = await requireUser();
  if (error) return error;

  const found = await loadOwnedTest(params.id, session);
  if (found.error) return found.error;

  const test = found.test;

  if (found.role === "student") {
    const { questions, correctOptionIndex, correctOptionIndexes, correctAnswers, explanation, ...safe } =
      test.toObject();
    return noStore({
      test: {
        ...safe,
        questions: questions.map((q) => ({ text: q.text, type: q.type, marks: q.marks, options: q.options })),
      },
    });
  }

  const sessions = await TestSession.find({ testId: test._id }).sort({ startTime: -1 }).lean();
  const attempts = await Attempt.countDocuments({ sessionId: { $in: sessions.map((s) => s._id) } });

  return noStore({
    test,
    stats: {
      sessionCount: sessions.length,
      attemptCount: attempts,
      upcoming: sessions.filter((s) => getSessionStatus(s) === "upcoming").length,
    },
  });
}

export async function PATCH(req, { params }) {
  const { session, error } = await requireUser(["teacher"]);
  if (error) return error;

  const found = await loadOwnedTest(params.id, session);
  if (found.error) return found.error;

  const test = found.test;
  const sessions = await TestSession.countDocuments({ testId: test._id, startTime: { $gt: new Date() } });
  if (sessions > 0) {
    return jsonError(
      "This test is scheduled in an upcoming session. Duplicate it to make changes, so the scheduled paper is not altered.",
      409
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const payload = normaliseTestPayload({ ...test.toObject(), ...body });
  if (!payload.ok) {
    return NextResponse.json({ error: payload.errors[0], problems: payload.errors }, { status: 400 });
  }

  Object.assign(test, payload.value);
  await test.save();

  return NextResponse.json({ test });
}

export async function DELETE(req, { params }) {
  const { session, error } = await requireUser(["teacher"]);
  if (error) return error;

  const found = await loadOwnedTest(params.id, session);
  if (found.error) return found.error;

  const sessions = await TestSession.find({ testId: found.test._id }).select("_id");
  const attempts = await Attempt.countDocuments({ sessionId: { $in: sessions.map((s) => s._id) } });

  if (attempts > 0) {
    return jsonError(
      `${attempts} student attempt(s) exist for this test. Archive it instead of deleting so the results are preserved.`,
      409
    );
  }

  await TestSession.deleteMany({ testId: found.test._id });
  await found.test.deleteOne();

  return NextResponse.json({ ok: true });
}
