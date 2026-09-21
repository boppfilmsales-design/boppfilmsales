import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Honor & Certificates - Asia Pacific Industry Group",
  description:
    "View our company honors, certificates, customer visit photos and certification reports.",
};

export default async function HonorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Honor" />
      <ContentColumnPage
        kind="honor"
        sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined}
        lang="en"
      />
      <SiteFooter />
    </div>
  );
}