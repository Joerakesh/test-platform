// @ts-nocheck
import mongoose from "mongoose";
import { QUESTION_TYPES } from "./Test";

const QuestionBankItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: QUESTION_TYPES, default: "mcq" },
    text: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctOptionIndex: { type: Number, default: null },
    correctOptionIndexes: { type: [Number], default: [] },
    correctAnswers: { type: [String], default: [] },
    manualGrade: { type: Boolean, default: false },
    explanation: { type: String, default: "" },
    chapter: { type: String, trim: true, default: "" },
    topic: { type: String, trim: true, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard", null], default: null },
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
    subject: { type: String, trim: true, default: "" },
    className: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

QuestionBankItemSchema.index({ createdBy: 1, createdAt: -1 });
QuestionBankItemSchema.index({ createdBy: 1, subject: 1, chapter: 1 });

export default (
  mongoose.models.QuestionBankItem ||
  mongoose.model("QuestionBankItem", QuestionBankItemSchema)
);
