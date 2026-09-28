// @ts-nocheck
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { signToken, TOKEN_COOKIE, TOKEN_TTL_SECONDS } from "@/lib/auth";
import { verifyPassword } from "@/lib/passwords";
import { checkLoginRate, recordLoginFailure, clearLoginFailures } from "@/lib/rateLimit";
import { validatePassword } from "@/lib/validate";

function clientKey(req, identifier) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return `${ip}|${String(identifier || "").toLowerCase()}`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const identifier = String(body?.identifier || body?.email || body?.username || "").trim();
  const password = String(body?.password || "");

  if (!identifier || !password) {
    return NextResponse.json({ error: "Enter your register number / email and password." }, { status: 400 });
  }

  const key = clientKey(req, identifier);
  const limit = checkLoginRate(key);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many failed attempts. Please try again in ${Math.ceil(limit.retryIn / 60)} minute(s).` },
      { status: 429 }
    );
  }

  await connectDB();

  const normalised = identifier.toLowerCase();
  const upper = identifier.toUpperCase();
  const user = await User.findOne({
    $or: [{ email: normalised }, { username: upper }],
  }).select("+passwordHash");

  const invalid = NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

  if (!user || !user.isActive) {
    recordLoginFailure(key);
    return invalid;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    recordLoginFailure(key);
    return invalid;
  }

  clearLoginFailures(key);

  const token = await signToken({
    userId: user._id.toString(),
    role: user.role,
    name: user.name,
  });

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const res = NextResponse.json({
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      email: user.email,
      username: user.username,
    },
  });

  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });

  return res;
}
