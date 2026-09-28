import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Test from "@/models/Test";
import TestSession from "@/models/TestSession";
import { requireUser, noStore, jsonError } from "@/lib/guard";
import { normaliseTestPayload } from "@/lib/validate";
import { escapeRegex } from "@/lib/text";

export async function GET(req) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const subject = searchParams.get("subject") || "";
  const source = searchParams.get("source") || "";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));

  const criteria = {};
  if (session.role === "teacher") criteria.createdBy = session.userId;
  if (subject) criteria.subject = subject;
  if (source) criteria.source = source;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    criteria.$or = [{ title: rx }, { description: rx }, { subject: rx }, { className: rx }];
  }

  const tests = await Test.find(criteria)
    .select("title description subject className sections academicYear duration totalMarks questions source isArchived createdAt createdBy")
    .sort({ createdAt: -1 })
    .limit(limit);

  const sessionCounts = await TestSession.aggregate([
    { $match: { testId: { $in: tests.map((t) => t._id) } } },
    { $group: { _id: "$testId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(sessionCounts.map((s) => [String(s._id), s.count]));

  return noStore({
    tests: tests.map((t) => ({
      id: t._id,
      title: t.title,
      description: t.description,
      subject: t.subject,
      className: t.className,
      sections: t.sections,
      academicYear: t.academicYear,
      duration: t.duration,
      totalMarks: t.totalMarks,
      questionCount: (t.questions || []).length,
      typeBreakdown: (t.questions || []).reduce((acc, q) => {
        acc[q.type || "mcq"] = (acc[q.type || "mcq"] || 0) + 1;
        return acc;
      }, {}),
      source: t.source,
      isArchived: t.isArchived,
      createdAt: t.createdAt,
      sessionCount: countMap.get(String(t._id)) || 0,
    })),
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

  const payload = normaliseTestPayload(body);
  if (!payload.ok) {
    return NextResponse.json(
      { error: payload.errors[0], problems: payload.errors },
      { status: 400 }
    );
  }

  await connectDB();
  const test = await Test.create({ ...payload.value, createdBy: session.userId });

  return NextResponse.json(
    { test: { id: test._id, title: test.title, totalMarks: test.totalMarks } },
    { status: 201 }
  );
}
