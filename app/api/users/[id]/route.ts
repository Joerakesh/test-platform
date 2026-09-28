// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Attempt from "@/models/Attempt";
import TestSession from "@/models/TestSession";
import { requireUser, noStore, jsonError, isValidObjectId } from "@/lib/guard";
import { hashPassword } from "@/lib/passwords";
import { findOrCreateClassroom } from "@/lib/paper";
import { validateEmail, validatePassword, validateRegisterNumber } from "@/lib/validate";

const ALLOWED_EDIT = { admin: "teacher", teacher: "student" };

export async function PATCH(req, { params }) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid account id.", 400);

  await connectDB();
  const user = await User.findById(params.id);
  if (!user) return jsonError("Account not found.", 404);

  const editableRole = ALLOWED_EDIT[session.role];
  if (!editableRole || user.role !== editableRole) return jsonError("Forbidden.", 403);
  if (session.role === "teacher" && user.createdBy?.toString() !== session.userId) {
    return jsonError("You can only manage your own students.", 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return jsonError("Name cannot be empty.", 400);
    user.name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase() || null;
    if (email && !validateEmail(email)) return jsonError("Enter a valid email address.", 400);
    if (user.role === "teacher" && !email) return jsonError("Teachers need an email address.", 400);
    user.email = email;
  }
  if (body.username !== undefined) {
    const username = String(body.username).trim().toUpperCase() || null;
    if (username && !validateRegisterNumber(username)) {
      return jsonError("Register number must be 3–20 characters (letters, digits, dash).", 400);
    }
    if (user.role === "student" && !username && !user.email) {
      return jsonError("The student needs a register number or an email to sign in.", 400);
    }
    user.username = username;
  }
  if (body.rollNo !== undefined) user.rollNo = String(body.rollNo).trim() || null;
  if (body.subject !== undefined && user.role === "teacher") {
    user.subject = String(body.subject).trim() || null;
  }
  if (body.isActive !== undefined) {
    if (user._id.toString() === session.userId) return jsonError("You cannot deactivate your own account.", 400);
    user.isActive = Boolean(body.isActive);
  }

  if (body.className !== undefined || body.section !== undefined) {
    const className = String(body.className ?? user.classroomId?.name ?? "").trim();
    const section = String(body.section ?? user.classroomId?.section ?? "A").trim();
    if (className) {
      const classroom = await findOrCreateClassroom({ className, section }, session.userId);
      user.classroomId = classroom._id;
    } else {
      user.classroomId = null;
    }
  }

  if (body.password) {
    if (!validatePassword(String(body.password))) {
      return jsonError("Password must be at least 6 characters.", 400);
    }
    user.passwordHash = await hashPassword(String(body.password));
  }

  try {
    await user.save();
  } catch (err) {
    if (err?.code === 11000) return jsonError("Another account already uses those details.", 409);
    throw err;
  }

  return NextResponse.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      rollNo: user.rollNo,
      isActive: user.isActive,
      classroomId: user.classroomId,
    },
    passwordReset: Boolean(body.password),
  });
}

export async function DELETE(req, { params }) {
  const { session, error } = await requireUser();
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid account id.", 400);

  await connectDB();
  const user = await User.findById(params.id);
  if (!user) return jsonError("Account not found.", 404);

  const editableRole = ALLOWED_EDIT[session.role];
  if (!editableRole || user.role !== editableRole) return jsonError("Forbidden.", 403);
  if (session.role === "teacher" && user.createdBy?.toString() !== session.userId) {
    return jsonError("You can only remove your own students.", 403);
  }
  if (user._id.toString() === session.userId) return jsonError("You cannot delete your own account.", 400);

  const attemptCount = await Attempt.countDocuments({ studentId: user._id });
  if (attemptCount > 0) {
    return jsonError(
      `This account has ${attemptCount} submitted test(s) and is part of the permanent record. Set it to inactive instead.`,
      409
    );
  }

  const liveSession = await TestSession.findOne({
    assignedStudents: user._id,
    endTime: { $gt: new Date() },
  });
  if (liveSession) {
    return jsonError("This student is assigned to a test session that has not finished yet.", 409);
  }

  await Promise.all([
    Attempt.deleteMany({ studentId: user._id }),
    TestSession.updateMany({ assignedStudents: user._id }, { $pull: { assignedStudents: user._id } }),
  ]);
  await user.deleteOne();

  return noStore({ ok: true });
}
