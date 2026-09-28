import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import QuestionBankItem from "@/models/QuestionBankItem";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";
import { normaliseQuestion } from "@/lib/validate";

export async function PATCH(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid question id.", 400);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  await connectDB();
  const item = await QuestionBankItem.findById(params.id);
  if (!item) return jsonError("Question not found.", 404);
  if (session.role === "teacher" && item.createdBy.toString() !== session.userId) {
    return jsonError("Forbidden.", 403);
  }

  if (body.text !== undefined || body.type !== undefined) {
    const errors = [];
    const question = normaliseQuestion({ ...item.toObject(), ...body }, 0, errors);
    if (!question) return jsonError(errors[0] || "Invalid question.", 400);
    Object.assign(item, question);
  }

  if (body.subject !== undefined) item.subject = String(body.subject).trim();
  if (body.className !== undefined) item.className = String(body.className).trim();
  if (body.usageCount !== undefined) item.usageCount = Number(body.usageCount) || 0;

  await item.save();
  return NextResponse.json({ item });
}

export async function DELETE(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid question id.", 400);

  await connectDB();
  const item = await QuestionBankItem.findById(params.id);
  if (!item) return jsonError("Question not found.", 404);
  if (session.role === "teacher" && item.createdBy.toString() !== session.userId) {
    return jsonError("Forbidden.", 403);
  }

  await item.deleteOne();
  return NextResponse.json({ ok: true });
}
