import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Center - Useful Links, Announcements, Shipping Lines",
  description: "Useful links, company announcements, foreign trade knowledge and vessel shipping lines.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Service Center" />
      <ContentColumnPage kind="service" sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />
      <SiteFooter />
    </div>
  );
}
