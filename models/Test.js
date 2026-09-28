import mongoose from "mongoose";

export const QUESTION_TYPES = ["mcq", "truefalse", "multiselect", "short"];

const QuestionSchema = new mongoose.Schema(
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
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", null],
      default: null,
    },
    marks: { type: Number, default: 1 },
    negativeMarks: { type: Number, default: 0 },
  },
  { _id: true }
);

const TestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    subject: { type: String, trim: true, default: "" },
    className: { type: String, trim: true, default: "" },
    sections: { type: [String], default: [] },
    academicYear: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questions: { type: [QuestionSchema], required: true },
    duration: { type: Number, required: true },
    negativeMarking: { type: Boolean, default: false },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    showResultImmediately: { type: Boolean, default: true },
    totalMarks: { type: Number, default: 0 },
    source: { type: String, enum: ["manual", "csv", "bank"], default: "manual" },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TestSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.models.Test || mongoose.model("Test", TestSchema);
