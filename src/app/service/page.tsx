import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "auto";

export const metadata: Metadata = {
  title: "Service Center - Useful Links, Announcements, Shipping Lines",
  description: "Useful links, company announcements, foreign trade knowledge and vessel shipping lines.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Service Center" />
      <ContentColumnPage kind="service" sourceId={id ? Number(id) : undefined} />
      <SiteFooter />
    </div>
  );
}
