import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { permanentRedirect } from "next/navigation";
import ArticleColumnPage from "@/components/pages/ArticleColumn";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getArticleColumn } from "@/lib/article-columns";
import { getContent } from "@/lib/site";
import { getContentForSite } from "@/lib/content-db";

/* Rendered on the server for every ?id= column, so the HTML always contains
   the complete column (the old client-side rendering produced blank pages). */
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

/** The legacy About menu also contains "Honor" (column 16) and the honour
 *  columns 17/50/51, which belong to the /honor page. */
const OTHER_KINDS: { kind: "honor" | "lines" | "service" | "cases"; href: string }[] = [
  { kind: "honor", href: "/honor" },
  { kind: "lines", href: "/product-lines" },
  { kind: "service", href: "/service" },
  { kind: "cases", href: "/cases" },
];

export const metadata: Metadata = {
  title: "About Us - Asia Pacific Industry Group",
  description: "BOPP / BOPET film manufacturer in Hefei, China — company profile, culture, branch companies and warehouse.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string; p?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  const sourceId = Number.isFinite(parsed) && parsed > 0 ? parsed : 13;
  const page = Number.parseInt(query.p ?? "1", 10) || 1;

  /**
   * 2026-10-01: 关于我们七栏已改为富文本文章模式（news_posts 支撑），
   * 渲染方式与 新闻中心 → Employees Literary 一致：列表 + 详情页。
   * 没有匹配到时回落到原来的单页渲染，旧链接仍然可用。
   */
  const articleColumn = getArticleColumn(sourceId);
  if (articleColumn) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="About Us" />
        <ArticleColumnPage column={articleColumn} lang="en" page={page} />
        <SiteFooter />
      </div>
    );
  }

  const content = await getContentForSite("about", sourceId);
  if (Number.isFinite(parsed) && parsed > 0 && !content) {
    const owner = OTHER_KINDS.find((item) => getContent(item.kind, parsed));
    if (owner) permanentRedirect(`${owner.href}?id=${parsed}`);
  }
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="About Us" />
      <ContentColumnPage content={content} kind="about" sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />
      <SiteFooter />
    </div>
  );
}
