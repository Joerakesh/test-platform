// @ts-nocheck
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn("MONGODB_URI is not set. Add it to .env.local");
}

let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export default async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
