// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireUser, noStore, jsonError } from "@/lib/guard";
import { hashPassword } from "@/lib/passwords";
import { findOrCreateClassroom } from "@/lib/paper";
import { validateEmail, validatePassword, validateRegisterNumber } from "@/lib/validate";
import { escapeRegex } from "@/lib/text";

const ALLOWED_CREATION = { admin: "teacher", teacher: "student" };

function randomPassword() {
  const words = ["palayanur", "vaagai", "thamil", "victory", "thamarai", "kuruvi", "sena", "kalvi"];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function GET(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  await connectDB();
  const targetRole = ALLOWED_CREATION[session.role];
  if (!targetRole) return noStore({ users: [] });

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const classroomId = searchParams.get("classroomId");
  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

  const criteria = { role: targetRole };
  if (session.role === "teacher") criteria.createdBy = session.userId;
  if (classroomId) criteria.classroomId = classroomId;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    criteria.$or = [{ name: rx }, { email: rx }, { username: rx }, { rollNo: rx }];
  }

  const users = await User.find(criteria)
    .populate("classroomId", "name section academicYear")
    .sort({ name: 1 })
    .limit(limit);

  return noStore({ users });
}

export async function POST(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  const targetRole = ALLOWED_CREATION[session.role];
  if (!targetRole) return jsonError("You cannot create accounts.", 403);

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const name = String(body?.name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase() || null;
  const username = String(body?.username || "").trim().toUpperCase() || null;
  const rollNo = String(body?.rollNo || "").trim() || null;
  const className = String(body?.className || "").trim();
  const section = String(body?.section || "").trim();
  const subject = String(body?.subject || "").trim() || null;
  const providedPassword = body?.password ? String(body.password) : null;
  const password = providedPassword || randomPassword();

  if (!name) return jsonError("Name is required.", 400);
  if (targetRole === "teacher" && !email) return jsonError("Teachers need an email address.", 400);
  if (targetRole === "student" && !username && !email) {
    return jsonError("Students need a register number (used to sign in).", 400);
  }
  if (username && !validateRegisterNumber(username)) {
    return jsonError("Register number must be 3–20 characters (letters, digits, dash).", 400);
  }
  if (email && !validateEmail(email)) return jsonError("Enter a valid email address.", 400);
  if (!validatePassword(password)) return jsonError("Password must be at least 6 characters.", 400);

  await connectDB();

  const clashes = [];
  if (email) clashes.push({ email });
  if (username) clashes.push({ username });
  if (targetRole === "student" && rollNo) clashes.push({ rollNo });

  const conflict = await User.findOne({ $or: clashes }).select("email username rollNo");
  if (conflict) {
    if (email && conflict.email === email) return jsonError("That email address is already registered.", 409);
    if (username && conflict.username === username) return jsonError(`Register number ${username} is already in use.`, 409);
    return jsonError("That roll number is already in use.", 409);
  }

  const classroom = className
    ? await findOrCreateClassroom({ className, section, academicYear: body?.academicYear }, session.userId)
    : null;

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await User.create({
      name,
      email,
      username,
      rollNo: rollNo || username,
      subject,
      passwordHash,
      role: targetRole,
      createdBy: session.userId,
      classroomId: classroom ? classroom._id : null,
    });
  } catch (err) {
    if (err?.code === 11000) return jsonError("That account already exists.", 409);
    throw err;
  }

  return NextResponse.json(
    {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        rollNo: user.rollNo,
        role: user.role,
        classroomId: classroom ? { name: classroom.name, section: classroom.section } : null,
      },
      temporaryPassword: providedPassword ? undefined : password,
    },
    { status: 201 }
  );
}
