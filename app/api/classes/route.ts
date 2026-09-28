// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Classroom from "@/models/Classroom";
import User from "@/models/User";
import { requireUser, noStore, jsonError } from "@/lib/guard";
import { CLASSES, SECTIONS, SCHOOL } from "@/lib/school";

export async function GET(req) {
  const { session, error } = await requireUser(["admin", "teacher"]);
  if (error) return error;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const includeCounts = searchParams.get("counts") === "1";

  const classrooms = await Classroom.find({}).sort({ name: 1, section: 1 }).lean();

  let counts = new Map();
  if (includeCounts && classrooms.length > 0) {
    const scope = session.role === "teacher" ? { createdBy: session.userId } : {};
    const students = await User.find({ role: "student", ...scope }).select("classroomId").lean();
    for (const s of students) {
      const key = String(s.classroomId || "");
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return noStore({
    classrooms: classrooms.map((c) => ({
      id: c._id,
      name: c.name,
      section: c.section,
      academicYear: c.academicYear,
      studentCount: counts.get(String(c._id)) || 0,
    })),
    available: { classes: CLASSES, sections: SECTIONS, academicYear: SCHOOL.academicYear },
  });
}

export async function POST(req) {
  const { session, error } = await requireUser(["admin", "teacher"]);
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const name = String(body?.name || "").trim().toUpperCase();
  const section = String(body?.section || "A").trim().toUpperCase();

  if (!name) return jsonError("Class name is required.", 400);
  if (!/^[A-Z0-9]{1,4}$/.test(name)) return jsonError("Class name may be 1–4 letters or digits (e.g. 9, 10).", 400);
  if (!/^[A-Z]{1,3}$/.test(section)) return jsonError("Section must be a letter (e.g. A).", 400);

  const academicYear = String(body?.academicYear || SCHOOL.academicYear).trim();

  await connectDB();

  try {
    const classroom = await Classroom.create({
      name,
      section,
      academicYear,
      createdBy: session.userId,
    });
    return NextResponse.json(
      { classroom: { id: classroom._id, name, section, academicYear, studentCount: 0 } },
      { status: 201 }
    );
  } catch (err) {
    if (err?.code === 11000) {
      return jsonError(`Class ${name}-${section} already exists for ${academicYear}.`, 409);
    }
    throw err;
  }
}
