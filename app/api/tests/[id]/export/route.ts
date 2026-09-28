// @ts-nocheck
import { csvResponse, testToCsvRows, TEST_CSV_HEADERS, slug } from "@/lib/csv";
import { requireUser, jsonError, isValidObjectId } from "@/lib/guard";
import connectDB from "@/lib/db";
import Test from "@/models/Test";

export async function GET(req, { params }) {
  const { session, error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  if (!isValidObjectId(params.id)) return jsonError("Invalid test id.", 400);

  await connectDB();
  const test = await Test.findById(params.id);
  if (!test) return jsonError("Test not found.", 404);
  if (session.role === "teacher" && test.createdBy.toString() !== session.userId) {
    return jsonError("This test belongs to another teacher.", 403);
  }

  return csvResponse(`test-${slug(test.title)}.csv`, TEST_CSV_HEADERS, testToCsvRows(test));
}
