// Creates demo accounts for testing: admin, teacher, student.
// Run with: npm run seed:demo
// Remove these accounts before the school uses this system.
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DEMOS = [
  { name: "Admin User", email: "admin@school.com", username: "admin", password: "admin123", role: "admin" },
  { name: "Teacher User", email: "teacher@school.com", username: "teacher", password: "teacher123", role: "teacher" },
  { name: "Student User", email: "student@school.com", username: "student", password: "student123", role: "student" },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("Set MONGODB_URI in .env.local first.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const UserSchema = new mongoose.Schema(
    {
      name: String,
      email: String,
      username: String,
      passwordHash: String,
      role: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  let adminId = null;
  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    adminId = existingAdmin._id;
    console.log("Admin already exists:", existingAdmin.email);
  }

  for (const demo of DEMOS) {
    const exists = await User.findOne({ email: demo.email });
    if (exists) {
      console.log(`${demo.role} already exists:`, demo.email);
      continue;
    }
    const passwordHash = await bcrypt.hash(demo.password, 10);
    await User.create({
      name: demo.name,
      email: demo.email,
      username: demo.username,
      passwordHash,
      role: demo.role,
      createdBy: adminId,
      isActive: true,
    });
    console.log(`${demo.role} created ->`, demo.email, "/ password:", demo.password);
  }

  console.log("\nDemo accounts ready. You can now log in with:");
  console.log("  admin   / admin123");
  console.log("  teacher / teacher123");
  console.log("  student / student123");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
