import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import HomeContent from "@/components/pages/HomeContent";
import { SITE } from "@/lib/site-helpers";
import { getLatestPostsSafe } from "@/lib/home-data";
import { getHomeSummary } from "@/lib/site-summary";
import { getHomeSummaryLive } from "@/lib/home-live";
import { logDbFallback } from "@/lib/db-log";

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

export const metadata: Metadata = {
  title: `${SITE.name} - 4.5Mic BOPET film, BOPP film, BOPP tape, thermal laminating film`,
  description:
    "Asia Pacific Industry Group Co., Limited — 4.5Mic BOPET film, BOPP film, BOPP tape, BOPP thermal laminating film, polyester film, bopp tobacco film, pearlized film, capacitor film, BOPET TTR film, POF shrink film and film machine lines.",
  keywords:
    "Asia Pacific Industry Group,4.5Mic BOPET film,BOPP film,BOPP tape,BOPP thermal laminating film,polyester film,bopp tobacco film,BOPP pearlized film,BOPP capacitor film,BOPET TTR film",
};

export default async function HomePage() {
  // Live from D1; falls back to the build-time snapshot if the DB is unavailable.
  const summary = await getHomeSummaryLive(getHomeSummary());

  let news: Awaited<ReturnType<typeof getLatestPostsSafe>> = [];
  try {
    news = await getLatestPostsSafe(6).catch(() => []);
  } catch (e) {
    logDbFallback("Failed to load news:", e);
  }

  const initialData = {
    categories: summary.categories,
    pdfs: summary.pdfs,
    featured: summary.featured,
    gallery: summary.gallery,
    news,
    totalProducts: summary.totalProducts,
    aboutZhHtml: summary.aboutZhHtml,
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Home" />
      <HomeContent lang="en" initialData={initialData} />
      <SiteFooter />
    </div>
  );
}
