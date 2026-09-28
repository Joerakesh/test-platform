import { csvResponse, slug } from "@/lib/csv";
import connectDB from "@/lib/db";
import QuestionBankItem from "@/models/QuestionBankItem";
import { requireUser, getSession } from "@/lib/guard";

export async function GET(req) {
  const { error } = await requireUser(["teacher", "admin"]);
  if (error) return error;

  const session = await getSession();
  await connectDB();

  const criteria = session.role === "teacher" ? { createdBy: session.userId } : {};
  const items = await QuestionBankItem.find(criteria).sort({ createdAt: -1 }).lean();

  const rows = items.map((q, i) => [
    i + 1,
    q.type,
    q.text,
    ...Array.from({ length: 6 }, (_, oi) => q.options?.[oi] || ""),
    q.type === "short"
      ? (q.correctAnswers || []).join(" | ")
      : q.type === "multiselect"
        ? (q.correctOptionIndexes || []).map((n) => String.fromCharCode(65 + n)).join("|")
        : q.correctOptionIndex != null
          ? String.fromCharCode(65 + q.correctOptionIndex)
          : "",
    q.marks ?? 1,
    q.negativeMarks ?? 0,
    q.chapter || "",
    q.topic || "",
    q.difficulty || "",
    q.explanation || "",
  ]);

  const headers = [
    "question_no", "type", "question",
    "option_a", "option_b", "option_c", "option_d", "option_e", "option_f",
    "correct_option", "correct_answer", "marks", "negative_marks",
    "chapter", "topic", "difficulty", "explanation",
  ];

  return csvResponse(`question-bank-${slug(new Date().toISOString().slice(0, 10))}.csv`, headers, rows);
}
