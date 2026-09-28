import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { requireUser, jsonError } from "@/lib/guard";
import { hashPassword } from "@/lib/passwords";
import { findOrCreateClassroom } from "@/lib/paper";
import { parseCsv, studentsFromCsvRows } from "@/lib/csv";
import { validatePassword } from "@/lib/validate";

const ALLOWED_CREATION = { admin: "teacher", teacher: "student" };

function makePassword() {
  const words = ["palayanur", "vaagai", "thamil", "thamarai", "kuruvi", "sena", "kalvi", "victory"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function POST(req) {
  const { session, error } = await requireUser();
  if (error) return error;

  const targetRole = ALLOWED_CREATION[session.role];
  if (!targetRole) return jsonError("You cannot import accounts.", 403);

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
    return jsonError("No data rows found. The first line must contain the column headings.", 400);
  }
  if (rows.length > 1000) return jsonError("Please import at most 1000 rows at a time.", 400);

  const { students, errors: rowErrors } = studentsFromCsvRows(rows);
  if (students.length === 0) {
    return NextResponse.json(
      { error: "No valid rows could be read from that file.", problems: [...parseErrors, ...rowErrors] },
      { status: 400 }
    );
  }

  const defaultPassword = String(body?.defaultPassword || "").trim();
  if (defaultPassword && !validatePassword(defaultPassword)) {
    return jsonError("The default password must be at least 6 characters.", 400);
  }

  await connectDB();

  const created = [];
  const skipped = [];
  const failures = [...parseErrors, ...rowErrors];

  for (const student of students) {
    const criteria = [];
    if (student.email) criteria.push({ email: student.email });
    if (student.username) criteria.push({ username: student.username });
    if (session.role === "teacher" && student.rollNo) criteria.push({ rollNo: student.rollNo });

    if (criteria.length > 0) {
      const existing = await User.findOne({ $or: criteria }).select("name email username");
      if (existing) {
        skipped.push({
          name: student.name,
          reason: `Already registered as ${existing.name} (${existing.username || existing.email}).`,
        });
        continue;
      }
    }

    const password = student.password || defaultPassword || makePassword();
    if (!validatePassword(password)) {
      failures.push({ row: null, message: `${student.name}: password must be at least 6 characters.` });
      continue;
    }

    const classroom =
      student.className || student.section
        ? await findOrCreateClassroom(
            {
              className: body?.className || student.className,
              section: body?.section || student.section,
              academicYear: body?.academicYear,
            },
            session.userId
          )
        : null;

    try {
      const user = await User.create({
        name: student.name,
        email: student.email,
        username: student.username,
        rollNo: student.rollNo,
        passwordHash: await hashPassword(password),
        role: targetRole,
        createdBy: session.userId,
        classroomId: classroom ? classroom._id : null,
      });
      created.push({
        id: user._id,
        name: user.name,
        registerNo: user.username,
        rollNo: user.rollNo,
        classLabel: classroom ? `${classroom.name}-${classroom.section}` : "",
        password: student.password || defaultPassword ? "" : password,
      });
    } catch (err) {
      failures.push({
        row: null,
        message:
          err?.code === 11000
            ? `${student.name}: register number or email already exists.`
            : `${student.name}: ${err.message}`,
      });
    }
  }

  return NextResponse.json({
    created,
    skipped,
    problems: failures.map((f) => f.message),
    summary: {
      rowsRead: rows.length,
      valid: students.length,
      created: created.length,
      skipped: skipped.length,
      failed: failures.length,
    },
  });
}
