// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { getSessionStatus, SESSION_STATUS_LABELS } from "@/lib/grading";
import { resolveAudience, presentPaper, seedFor } from "@/lib/paper";

export async function GET(req, { params }) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid session id.", 400);

  await connectDB();
  const doc = await TestSession.findById(params.id);
  if (!doc) return jsonError("Test session not found.", 404);

  const now = new Date();
  const status = getSessionStatus(doc, now);

  if (session.role === "student") {
    const isAssigned = (doc.assignedStudents || []).some((id) => id.toString() === session.userId);
    if (!isAssigned) return jsonError("This test is not assigned to you.", 403);

    const test = await Test.findById(doc.testId);
    if (!test) return jsonError("The question paper could not be found.", 404);

    const attempt = await Attempt.findOne({ sessionId: doc._id, studentId: session.userId });

    if (attempt) {
      return noStore({
        alreadySubmitted: true,
        attemptId: attempt._id,
        status,
        statusLabel: SESSION_STATUS_LABELS[status],
        endTime: doc.endTime,
      });
    }

    if (status === "upcoming") {
      return noStore({
        status,
        statusLabel: SESSION_STATUS_LABELS[status],
        startTime: doc.startTime,
        endTime: doc.endTime,
        test: { id: test._id, title: test.title, subject: test.subject, duration: test.duration, totalMarks: test.totalMarks },
      });
    }

    if (status !== "active") {
      return jsonError("This test is closed and can no longer be attempted.", 410);
    }

    return noStore({
      status,
      statusLabel: SESSION_STATUS_LABELS[status],
      startTime: doc.startTime,
      endTime: doc.endTime,
      instructions: doc.instructions,
      test: {
        id: test._id,
        title: test.title,
        subject: test.subject,
        className: test.className,
        description: test.description,
        duration: test.duration,
        totalMarks: test.totalMarks,
        negativeMarking: test.negativeMarking,
        questionCount: (test.questions || []).length,
      },
      paper: presentPaper(test, seedFor(doc._id, session.userId)),
    });
  }

  if (doc.createdBy.toString() !== session.userId && session.role !== "admin") {
    return jsonError("Forbidden.", 403);
  }

  const test = await Test.findById(doc.testId);
  const audience = await resolveAudience(
    { assignedStudents: doc.assignedStudents, assignedClassrooms: doc.assignedClassrooms },
    session.role === "teacher" ? doc.createdBy.toString() : null
  );

  const students = await User.find({ _id: { $in: audience } })
    .populate("classroomId", "name section")
    .select("name email username rollNo isActive classroomId")
    .sort({ rollNo: 1, name: 1 })
    .lean();

  const attempts = await Attempt.find({ sessionId: doc._id }).lean();
  const attemptMap = new Map(attempts.map((a) => [String(a.studentId), a]));

  return noStore({
    session: {
      id: doc._id,
      test,
      startTime: doc.startTime,
      endTime: doc.endTime,
      instructions: doc.instructions,
      resultsPublished: doc.resultsPublished,
      publishedAt: doc.publishedAt,
      isClosed: doc.isClosed,
      status,
      statusLabel: SESSION_STATUS_LABELS[status],
    },
    roster: students.map((s) => {
      const attempt = attemptMap.get(String(s._id));
      return {
        id: s._id,
        name: s.name,
        registerNo: s.username,
        rollNo: s.rollNo,
        email: s.email,
        classLabel: s.classroomId ? `${s.classroomId.name}-${s.classroomId.section}` : "",
        isActive: s.isActive !== false,
        submitted: Boolean(attempt),
        score: attempt?.score ?? null,
        totalMarks: attempt?.totalMarks ?? null,
        percentage:
          attempt && attempt.totalMarks
            ? Math.round((attempt.score / attempt.totalMarks) * 1000) / 10
            : null,
        correctCount: attempt?.correctCount ?? null,
        wrongCount: attempt?.wrongCount ?? null,
        skippedCount: attempt?.skippedCount ?? null,
        accuracy: attempt?.accuracy ?? null,
        isFullyGraded: attempt ? attempt.isFullyGraded !== false : null,
        timeSpentSeconds: attempt?.timeSpentSeconds ?? null,
        submittedAt: attempt?.submittedAt ?? null,
        attemptId: attempt?._id ?? null,
      };
    }),
  });
}

export async function PATCH(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
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
  if (doc.createdBy.toString() !== session.userId && session.role !== "admin") {
    return jsonError("Forbidden.", 403);
  }

  if (body.resultsPublished !== undefined) {
    doc.resultsPublished = Boolean(body.resultsPublished);
    doc.publishedAt = doc.resultsPublished ? new Date() : null;
  }
  if (body.isClosed !== undefined) doc.isClosed = Boolean(body.isClosed);
  if (body.instructions !== undefined) doc.instructions = String(body.instructions).slice(0, 2000);

  if (body.startTime || body.endTime) {
    const startTime = body.startTime ? new Date(body.startTime) : doc.startTime;
    const endTime = body.endTime ? new Date(body.endTime) : doc.endTime;
    if (endTime <= startTime) return jsonError("The end time must be after the start time.", 400);
    if (new Date() > endTime) {
      return jsonError("A session that has already finished cannot be rescheduled.", 409);
    }
    const attempts = await Attempt.countDocuments({ sessionId: doc._id });
    if (attempts > 0) {
      return jsonError("Students have already submitted for this session, so the timing cannot be changed.", 409);
    }
    doc.startTime = startTime;
    doc.endTime = endTime;
  }

  await doc.save();
  return NextResponse.json({
    session: {
      id: doc._id,
      resultsPublished: doc.resultsPublished,
      isClosed: doc.isClosed,
      startTime: doc.startTime,
      endTime: doc.endTime,
    },
  });
}
