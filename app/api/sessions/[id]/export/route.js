import connectDB from "@/lib/db";
import TestSession from "@/models/TestSession";
import Test from "@/models/Test";
import Attempt from "@/models/Attempt";
import User from "@/models/User";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";
import { resolveAudience } from "@/lib/paper";
import {
  buildMarksRegisterCsv,
  buildResultsSummaryCsv,
  buildAnswerDetailCsv,
  buildQuestionAnalysisCsv,
  csvResponse,
} from "@/lib/csv";

const TYPES = new Set(["register", "summary", "detail", "analysis"]);

export async function GET(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid session id.", 400);

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "summary";
  if (!TYPES.has(type)) {
    return jsonError(`Unknown export type "${type}". Use register, summary, detail or analysis.`, 400);
  }

  await connectDB();
  const doc = await TestSession.findById(params.id);
  if (!doc) return jsonError("Test session not found.", 404);
  if (doc.createdBy.toString() !== session.userId && session.role !== "admin") {
    return jsonError("Forbidden.", 403);
  }

  const test = await Test.findById(doc.testId);
  if (!test) return jsonError("The question paper could not be found.", 404);

  const audience = await resolveAudience(
    { assignedStudents: doc.assignedStudents, assignedClassrooms: doc.assignedClassrooms },
    session.role === "teacher" ? doc.createdBy.toString() : null
  );

  const students = await User.find({ _id: { $in: audience } })
    .populate("classroomId", "name section")
    .select("name email username rollNo classroomId")
    .lean();

  const attempts = await Attempt.find({ sessionId: doc._id }).lean();

  if (type === "register") {
    const out = buildMarksRegisterCsv({
      session: { testId: { title: test.title } },
      test,
      questions: test.questions,
      students,
      attempts,
    });
    return csvResponse(out.filename, out.headers, out.rows);
  }

  if (type === "detail") {
    const out = buildAnswerDetailCsv({ test, questions: test.questions, students, attempts });
    return csvResponse(out.filename, out.headers, out.rows);
  }

  if (type === "analysis") {
    const out = buildQuestionAnalysisCsv({ test, questions: test.questions, attempts });
    return csvResponse(out.filename, out.headers, out.rows);
  }

  const out = buildResultsSummaryCsv({ test, students, attempts });
  return csvResponse(out.filename, out.headers, out.rows);
}
