import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import DevelopmentCasesPage from "@/components/pages/DevelopmentCases";
import { getContentForSite } from "@/lib/content-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Classic Cases - To Buyers, To Markets, To Ourselves",
  description: "Development cases of Asia Pacific Industry Group: to buyers, to markets and to ourselves.",
};

/** 案例 → Development Cases is a rich-text article column (news-backed). */
const DEVELOPMENT_CASES_ID = 54;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string; p?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  const sourceId = Number.isFinite(parsed) && parsed > 0 ? parsed : DEVELOPMENT_CASES_ID;
  const page = Number.parseInt(query.p ?? "1", 10) || 1;

  if (sourceId === DEVELOPMENT_CASES_ID) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="Classic Cases" />
        <DevelopmentCasesPage lang="en" page={page} />
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
