// @ts-nocheck
"use client";
import { useRouter } from "next/navigation";

export default function Header({ title }: any) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="header">
      <h1>{title}</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
