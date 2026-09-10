import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContents } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Honor & Certificates - Asia Pacific Industry Group",
  description: "Certificates, customer references and certification reports of Asia Pacific Industry Group.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Honor" />
      <ContentColumnPage kind="honor" sourceId={id ? Number(id) : undefined} />
      <SiteFooter />
    </div>
  );
}
