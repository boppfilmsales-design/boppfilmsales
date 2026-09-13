import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honor & Certificates - Asia Pacific Industry Group",
  description: "Certificates, customer references and certification reports of Asia Pacific Industry Group.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; c_id?: string }> }) {
  const { id, c_id } = await searchParams;
  const sid = id ?? c_id;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Honor" />
      <ContentColumnPage kind="honor" sourceId={sid ? Number(sid) : undefined} />
      <SiteFooter />
    </div>
  );
}
