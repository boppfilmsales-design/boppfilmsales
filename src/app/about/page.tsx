import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About Us - Asia Pacific Industry Group",
  description: "BOPP / BOPET film manufacturer in Hefei, China — company profile, culture, branch companies and warehouse.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="About Us" />
      <ContentColumnPage kind="about" sourceId={id ? Number(id) : undefined} />
      <SiteFooter />
    </div>
  );
}
