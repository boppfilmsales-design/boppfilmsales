import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Production Lines - Bruckner / Mitsubishi Film Lines",
  description: "BOPP, BOPET, tape, thermal lamination, metallizing and POF film production lines.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentColumnPage kind="lines" sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />
      <SiteFooter />
    </div>
  );
}
