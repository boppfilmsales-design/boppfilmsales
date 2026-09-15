import type { Metadata } from "next";
import Dashboard from "@/components/admin/Dashboard";
import LoginForm from "@/components/admin/LoginForm";
import { ensureSeedData } from "@/db/seed";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "XgxCms 后台管理系统 - Asia Pacific Industry Group",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // Try to ensure seed data, but don't crash the entire page if DB is down.
  // The login form and dashboard can still render; DB-dependent operations
  // will fail gracefully at their own call sites.
  try {
    await ensureSeedData();
  } catch (err) {
    console.error("[admin/page] ensureSeedData failed (continuing anyway):", err);
  }
  const session = await getAdminSession();
  if (!session) return <LoginForm />;
  return <Dashboard username={session.username} />;
}
