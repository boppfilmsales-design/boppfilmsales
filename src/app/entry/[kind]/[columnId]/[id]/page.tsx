import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentEntryPage } from "@/components/pages/Sections";
import { getContent, getContents, stripHtml } from "@/lib/site";
import { getContentForSite } from "@/lib/content-db";

/**
 * 实时渲染：后台改完内容，前台立刻生效。
 *
 * 2026-10-02 之前这里是 `revalidate = 60`（增量缓存 60 秒）。当时的理由是免费版
 * Workers 只有 10 毫秒 CPU 预算，而 `force-dynamic` 会让每次访问都重建整棵页面树
 * 并重扫 D1，进而触发 Error 1102（Worker exceeded resource limits）。
 *
 * 现已升级 Workers Paid（30 秒 CPU / 请求，额度是免费版的 3000 倍），所以改回
 * 实时渲染。代价是每次访问都会读一次 D1 —— 首页那种一次读上百行的页面如果流量
 * 很大，要留意 D1 的每日读取额度。
 */
export const dynamic = "force-dynamic";

const KINDS = ["about", "lines", "honor", "service", "cases"] as const;
type ContentKind = (typeof KINDS)[number];

const ACTIVE: Record<string, string> = {
  about: "About Us",
  lines: "Products Lines",
  honor: "Honor",
  service: "Service Center",
  cases: "Classic Cases",
};

export function generateStaticParams() {
  return KINDS.flatMap((kind) =>
    getContents(kind).flatMap((column) =>
      (column.entries ?? [])
        .filter((entry) => !entry.isLink)
        .map((entry) => ({
          kind,
          columnId: String(column.sourceId),
          id: String(entry.sourceId),
        })),
    ),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string; columnId: string; id: string }>;
}): Promise<Metadata> {
  const { kind, columnId, id } = await params;
  const column = getContent(kind as ContentKind, columnId);
  const entry = column?.entries?.find((item) => String(item.sourceId) === id);
  if (!entry) return { title: "Content" };
  return {
    title: `${entry.title} - Asia Pacific Industry Group`,
    description: stripHtml(entry.bodyHtml, 155) || entry.title,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; columnId: string; id: string }>;
}) {
  const { kind, columnId, id } = await params;
  if (!KINDS.includes(kind as ContentKind)) notFound();
  const column = await getContentForSite(kind as ContentKind, columnId);
  const entry = column?.entries?.find((item) => String(item.sourceId) === id);
  if (!column || !entry) notFound();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active={ACTIVE[kind]} />
      <ContentEntryPage columnId={columnId} content={column} kind={kind as ContentKind} lang="en" sourceId={id} />
      <SiteFooter />
    </div>
  );
}

