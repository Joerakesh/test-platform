// @ts-nocheck
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export const TOKEN_COOKIE = "ghs_token";
export const TOKEN_TTL_SECONDS = 60 * 60 * 12;

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}
