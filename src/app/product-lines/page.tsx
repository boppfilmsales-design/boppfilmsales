import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Production Lines - Bruckner / Mitsubishi Film Lines",
  description: "BOPP, BOPET, tape, thermal lamination, metallizing and POF film production lines.",
};

export function generateStaticParams() {
  return getContents("lines").map((c) => ({ id: String(c.sourceId) }));
}

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentColumnPage kind="lines" sourceId={id ? Number(id) : undefined} />
      <SiteFooter />
    </div>
  );
}
