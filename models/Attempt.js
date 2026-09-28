import mongoose from "mongoose";

const AnswerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedOptionIndexes: { type: [Number], default: [] },
    textAnswer: { type: String, default: "" },
    markedForReview: { type: Boolean, default: false },
    isCorrect: { type: Boolean, default: null },
    marksAwarded: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["correct", "wrong", "skipped", "pending"],
      default: "skipped",
    },
  },
  { _id: false }
);

const AttemptSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "TestSession", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: { type: [AnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    negativeScore: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    wrongCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    isFullyGraded: { type: Boolean, default: true },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AttemptSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttemptSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.models.Attempt || mongoose.model("Attempt", AttemptSchema);
