import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import ArticleColumnPage from "@/components/pages/ArticleColumn";
import { ContentColumnPage } from "@/components/pages/Sections";
import { DEFAULT_ARTICLE_SOURCE_ID, getArticleColumn } from "@/lib/article-columns";
import { getContentForSite } from "@/lib/content-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Center - Useful Links, Announcements, Shipping Lines",
  description: "Useful links, company announcements, foreign trade knowledge and vessel shipping lines.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string; p?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  const sourceId = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ARTICLE_SOURCE_ID.service;
  const page = Number.parseInt(query.p ?? "1", 10) || 1;

  // 服务 → Company Announcement / Useful Knowledge are rich-text article
  // columns (news-backed, same editor as 新闻中心).
  const articleColumn = getArticleColumn(sourceId);
  if (articleColumn) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="Service Center" />
        <ArticleColumnPage column={articleColumn} lang="en" page={page} />
        <SiteFooter />
      </div>
    );
  }

  const content = await getContentForSite("service", sourceId);
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Service Center" />
      <ContentColumnPage content={content} kind="service" lang="en" sourceId={sourceId} />
      <SiteFooter />
    </div>
  );
}
