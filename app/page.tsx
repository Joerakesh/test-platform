// @ts-nocheck
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken, TOKEN_COOKIE } from "@/lib/auth";

export default async function Home() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  redirect(payload?.role ? `/${payload.role}` : "/login");
}
