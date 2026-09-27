import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentColumnPage } from "@/components/pages/Sections";
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
  const content = await getContentForSite("honor", Number.isFinite(parsed) && parsed > 0 ? parsed : 16);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Honor" />
      <ContentColumnPage
        kind="honor"
        content={content}
        sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined}
        lang="en"
      />
      <SiteFooter />
    </div>
  );
}