import type { Metadata } from "next";
import Dashboard from "@/components/admin/Dashboard";
import LoginForm from "@/components/admin/LoginForm";
import { ensureSeedData } from "@/db/seed";
import { getAdminSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Site Background - News Administration",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureSeedData();
  const session = await getAdminSession();
  if (!session) return <LoginForm />;
  return <Dashboard username={session.username} />;
}
