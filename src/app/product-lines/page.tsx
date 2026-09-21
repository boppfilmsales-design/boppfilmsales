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

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  
  // 获取所有 lines 列表，防止没有 id 时拿不到合法的默认 sourceId
  const linesColumns = getContents("lines");
  const defaultSourceId = linesColumns[0]?.sourceId;

  const validSourceId = Number.isFinite(parsed) && parsed > 0 
    ? parsed 
    : (defaultSourceId && defaultSourceId > 0 ? defaultSourceId : undefined);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentColumnPage kind="lines" sourceId={validSourceId} />
      <SiteFooter />
    </div>
  );
}