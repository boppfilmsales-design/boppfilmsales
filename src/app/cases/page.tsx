import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ArticleColumnPage from "@/components/pages/ArticleColumn";
import { ContentColumnPage } from "@/components/pages/Sections";
import { DEFAULT_ARTICLE_SOURCE_ID, getArticleColumn } from "@/lib/article-columns";
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
  title: "Classic Cases - To Buyers, To Markets, To Ourselves",
  description: "Development cases of Asia Pacific Industry Group: to buyers, to markets and to ourselves.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string; p?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  const sourceId = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ARTICLE_SOURCE_ID.cases;
  const page = Number.parseInt(query.p ?? "1", 10) || 1;

  // 案例 → Development Cases / To Ourselves are rich-text article columns
  // (news-backed, same editor as 新闻中心).
  const articleColumn = getArticleColumn(sourceId);
  if (articleColumn) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="Classic Cases" />
        <ArticleColumnPage column={articleColumn} lang="en" page={page} />
        <SiteFooter />
      </div>
    );
  }

  const content = await getContentForSite("cases", sourceId);
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Classic Cases" />
      <ContentColumnPage content={content} kind="cases" lang="en" sourceId={sourceId} />
      <SiteFooter />
    </div>
  );
}
