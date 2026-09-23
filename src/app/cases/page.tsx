import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContentForSite } from "@/lib/content-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Classic Cases - To Buyers, To Markets, To Ourselves",
  description: "Development cases of Asia Pacific Industry Group: to buyers, to markets and to ourselves.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  const content = await getContentForSite("cases", Number.isFinite(parsed) && parsed > 0 ? parsed : 54);
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Classic Cases" />
      <ContentColumnPage content={content} kind="cases" sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />
      <SiteFooter />
    </div>
  );
}
