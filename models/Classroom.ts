// @ts-nocheck
import mongoose from "mongoose";

const ClassroomSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, uppercase: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    academicYear: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

ClassroomSchema.index(
  { name: 1, section: 1, academicYear: 1 },
  { unique: true, name: "classroom_unique" }
);

export default mongoose.models.Classroom || mongoose.model("Classroom", ClassroomSchema);
