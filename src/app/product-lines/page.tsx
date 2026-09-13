import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Lines - Bruckner / Mitsubishi Film Lines",
  description: "BOPP, BOPET, tape, thermal lamination, metallizing and POF film production lines.",
};

export function generateStaticParams() {
  return getContents("lines").map((c) => ({ id: String(c.sourceId) }));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; c_id?: string }> }) {
  const { id, c_id } = await searchParams;
  const sid = id ?? c_id;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentColumnPage kind="lines" sourceId={sid ? Number(sid) : undefined} />
      <SiteFooter />
    </div>
  );
}
