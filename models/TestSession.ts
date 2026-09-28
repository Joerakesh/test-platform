// @ts-nocheck
import mongoose from "mongoose";

const TestSessionSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedClassrooms: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    instructions: { type: String, trim: true, default: "" },
    resultsPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TestSessionSchema.index({ createdBy: 1, startTime: -1 });
TestSessionSchema.index({ startTime: 1, endTime: 1 });

export default mongoose.models.TestSession || mongoose.model("TestSession", TestSessionSchema);
