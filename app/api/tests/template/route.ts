// @ts-nocheck
import { toCsv, TEST_CSV_HEADERS } from "@/lib/csv";
import { requireUser } from "@/lib/guard";

const SAMPLE = [
  [1, "mcq", "Which organ pumps blood through the body?", "Heart", "Liver", "Kidney", "Lung", "", "", "A", "", 1, 0, "Circulatory System", "", "easy", "The heart is the centre of the circulatory system."],
  [2, "truefalse", "Water boils at 100°C at sea level.", "", "", "", "", "", "", "True", "", 1, 0.25, "Matter", "", "easy", ""],
  [3, "multiselect", "Select all prime numbers.", "2", "4", "6", "9", "", "", "A|D", "", 2, 0.5, "Numbers", "", "medium", ""],
  [4, "short", "Write the chemical name of common salt.", "", "", "", "", "", "", "", "Sodium chloride", 3, 0, "Matter", "", "medium", ""],
];

export async function GET() {
  const { error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  return new Response(toCsv(TEST_CSV_HEADERS, SAMPLE), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="question-paper-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
