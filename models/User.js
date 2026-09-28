import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true, default: null },
    username: { type: String, uppercase: true, trim: true, default: null },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "teacher", "student"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", default: null },
    rollNo: { type: String, trim: true, default: null },
    subject: { type: String, trim: true, default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, createdBy: 1 });
UserSchema.index({ classroomId: 1 });

export default mongoose.models.User || mongoose.model("User", UserSchema);
