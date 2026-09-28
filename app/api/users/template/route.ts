// @ts-nocheck
import { STUDENT_CSV_HEADERS, toCsv } from "@/lib/csv";
import { requireUser } from "@/lib/guard";

const SAMPLE = [
  ["Aravind Kumar", "9A001", "1", "9", "A", "", ""],
  ["Banu Priya", "9A002", "2", "9", "A", "", ""],
  ["Chandini S", "9A003", "3", "9", "A", "chandini@example.com", ""],
  ["Durai M", "9A004", "4", "9", "A", "", "durai@123"],
];

export async function GET() {
  const { error } = await requireUser(["admin", "teacher"]);
  if (error) return error;

  return new Response(toCsv(STUDENT_CSV_HEADERS, SAMPLE), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="student-roster-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
