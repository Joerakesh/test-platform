import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Classroom from "@/models/Classroom";
import User from "@/models/User";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";

export async function DELETE(req, { params }) {
  const { session, error } = await requireUser(["admin", "teacher"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid class id.", 400);

  await connectDB();
  const classroom = await Classroom.findById(params.id);
  if (!classroom) return jsonError("Class not found.", 404);

  const count = await User.countDocuments({ classroomId: classroom._id });
  if (count > 0) {
    return jsonError(
      `${count} student(s) are in class ${classroom.name}-${classroom.section}. Move them to another class first.`,
      409
    );
  }

  await classroom.deleteOne();
  return NextResponse.json({ ok: true });
}
