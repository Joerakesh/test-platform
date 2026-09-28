// @ts-nocheck
import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain, hash) {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plain, hash);
}
