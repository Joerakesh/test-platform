// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QuestionBankItem from "@/models/QuestionBankItem";
import { requireUser, noStore, jsonError } from "@/lib/guard";
import { normaliseQuestion } from "@/lib/validate";
import { escapeRegex } from "@/lib/text";
import { SUBJECTS } from "@/lib/school";

export async function GET(req) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const subject = searchParams.get("subject") || "";
  const chapter = searchParams.get("chapter") || "";
  const type = searchParams.get("type") || "";
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  const criteria = {};
  if (session.role === "teacher") criteria.createdBy = session.userId;
  if (subject) criteria.subject = subject;
  if (chapter) criteria.chapter = chapter;
  if (type) criteria.type = type;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    criteria.$or = [{ text: rx }, { chapter: rx }, { topic: rx }];
  }

  const [items, chapters, subjects] = await Promise.all([
    QuestionBankItem.find(criteria).sort({ createdAt: -1 }).limit(limit),
    QuestionBankItem.distinct("chapter", session.role === "teacher" ? { createdBy: session.userId } : {}),
    QuestionBankItem.distinct("subject", session.role === "teacher" ? { createdBy: session.userId } : {}),
  ]);

  return noStore({
    items,
    filters: {
      chapters: chapters.filter(Boolean).sort(),
      subjects: subjects.filter(Boolean).sort(),
      allSubjects: SUBJECTS,
    },
  });
}

export async function POST(req) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const items = Array.isArray(body?.items) ? body.items : [body];
  if (items.length === 0) return jsonError("Nothing to save.", 400);
  if (items.length > 100) return jsonError("Please save at most 100 questions at a time.", 400);

  const errors = [];
  const docs = [];

  items.forEach((raw, i) => {
    const question = normaliseQuestion(raw, i, errors);
    if (!question) return;
    docs.push({
      ...question,
      subject: String(raw?.subject || "").trim(),
      className: String(raw?.className || "").trim(),
      tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean).map(String) : [],
      createdBy: session.userId,
    });
  });

  if (docs.length === 0) {
    return NextResponse.json({ error: "No valid questions found.", problems: errors }, { status: 400 });
  }

  await connectDB();
  const created = await QuestionBankItem.insertMany(docs);

  return NextResponse.json({ created: created.length, items: created, problems: errors }, { status: 201 });
}
