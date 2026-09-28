// @ts-nocheck
import { NextResponse } from "next/server";
import { verifyToken, TOKEN_COOKIE } from "@/lib/auth";

const roleRoutes = {
  "/admin": ["admin"],
  "/teacher": ["teacher"],
  "/student": ["student"],
};

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const match = Object.keys(roleRoutes).find((p) => pathname.startsWith(p));
  if (!match) return NextResponse.next();

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = await verifyToken(token);
  if (!payload || !roleRoutes[match].includes(payload.role)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*"],
};
