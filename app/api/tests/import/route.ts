// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Test from "@/models/Test";
import { requireUser, jsonError } from "@/lib/guard";
import { parseCsv, questionsFromCsvRows } from "@/lib/csv";
import { normaliseTestPayload } from "@/lib/validate";
import { SCHOOL } from "@/lib/school";

export async function POST(req) {
  const { session, error } = await requireUser(["teacher"]);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const text = String(body?.csv || "");
  if (!text.trim()) return jsonError("No CSV content was received.", 400);

  const { rows, errors: parseErrors } = parseCsv(text);
  if (rows.length === 0) {
    return jsonError("No question rows found. The first line must contain the column headings.", 400);
  }
  if (rows.length > 300) return jsonError("A test can contain at most 300 questions.", 400);

  const { questions, errors: rowErrors } = questionsFromCsvRows(rows);
  const problems = [...parseErrors, ...rowErrors.map((e) => `Row ${e.row}: ${e.message}`)];

  if (questions.length === 0) {
    return NextResponse.json(
      { error: "No valid questions could be read from that file.", problems },
      { status: 400 }
    );
  }

  const title = String(body?.title || "").trim();
  if (!title) return jsonError("Give the test a title before importing.", 400);

  const payload = normaliseTestPayload({
    title,
    description: body?.description,
    subject: body?.subject,
    className: body?.className,
    academicYear: body?.academicYear || SCHOOL.academicYear,
    duration: body?.duration,
    questions,
    negativeMarking: body?.negativeMarking,
    shuffleQuestions: body?.shuffleQuestions,
    shuffleOptions: body?.shuffleOptions,
    showResultImmediately: body?.showResultImmediately,
    source: "csv",
  });

  if (!payload.ok) {
    return NextResponse.json(
      { error: payload.errors[0], problems: [...problems, ...payload.errors] },
      { status: 400 }
    );
  }

  const save = body?.save !== false;
  let test = null;

  if (save) {
    await connectDB();
    test = await Test.create({ ...payload.value, createdBy: session.userId });
  }

  return NextResponse.json(
    {
      saved: save,
      test: test ? { id: test._id, title: test.title, totalMarks: test.totalMarks } : null,
      parsed: payload.value,
      problems,
      summary: {
        rowsRead: rows.length,
        imported: questions.length,
        skipped: rows.length - questions.length,
      },
    },
    { status: save ? 201 : 200 }
  );
}
