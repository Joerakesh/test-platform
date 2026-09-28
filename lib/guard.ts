// @ts-nocheck
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "./db";
import User from "@/models/User";
import { verifyToken, TOKEN_COOKIE } from "./auth";

export function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function noStore(json, status = 200) {
  const res = NextResponse.json(json, { status });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function getSession() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(roles) {
  const session = await getSession();
  if (!session) return { error: jsonError("Please sign in to continue.", 401) };
  if (roles && !roles.includes(session.role)) {
    return { error: jsonError("You do not have access to this action.", 403) };
  }
  return { session };
}

export async function loadUser(session) {
  if (!session?.userId) return null;
  await connectDB();
  return User.findById(session.userId).populate("classroomId", "name section academicYear");
}

export function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ""));
}
