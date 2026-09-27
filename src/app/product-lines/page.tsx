import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";
import { getContentForSite } from "@/lib/content-db";

/**
 * Rendered once and then served from the incremental cache.
 *
 * `force-dynamic` made every visit re-render the whole tree and re-scan D1;
 * on Workers that pushed isolates to ~124 MB against the 128 MB ceiling and
 * Cloudflare killed the request with Error 1102. 60 s keeps admin edits
 * visible almost immediately while removing almost all of that work.
 */
export const revalidate = 60;

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
  const content = validSourceId ? await getContentForSite("lines", validSourceId) : undefined;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products Lines" />
      <ContentColumnPage content={content} kind="lines" sourceId={validSourceId} />
      <SiteFooter />
    </div>
  );
}