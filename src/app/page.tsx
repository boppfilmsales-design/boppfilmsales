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
 * Rendered once and then served from the incremental cache.
 *
 * `force-dynamic` made every visit re-render the whole tree and re-scan D1;
 * on Workers that pushed isolates to ~124 MB against the 128 MB ceiling and
 * Cloudflare killed the request with Error 1102. 60 s keeps admin edits
 * visible almost immediately while removing almost all of that work.
 */
export const revalidate = 60;

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
