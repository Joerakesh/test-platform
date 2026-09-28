// One-time script to create the first admin account (admin@... can't be
// created through the API since only an existing admin/teacher can create
// the next role down). Run with: npm run seed:admin
require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
      passwordHash: String,
      role: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const email = (process.env.SEED_ADMIN_EMAIL || "admin@school.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin already exists:", email);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.create({ name: "Admin", email, passwordHash, role: "admin" });
  console.log("Admin created ->", email, "/ password:", password);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
