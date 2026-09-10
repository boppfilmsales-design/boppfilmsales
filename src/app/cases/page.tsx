import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Classic Cases - To Buyers, To Markets, To Ourselves",
  description: "Development cases of Asia Pacific Industry Group: to buyers, to markets and to ourselves.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Classic Cases" />
      <ContentColumnPage kind="cases" sourceId={id ? Number(id) : undefined} />
      <SiteFooter />
    </div>
  );
}
