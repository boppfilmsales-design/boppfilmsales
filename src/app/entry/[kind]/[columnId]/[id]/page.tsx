import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ContentEntryPage } from "@/components/pages/Sections";
import { getContent, getContents, stripHtml } from "@/lib/site";
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

const KINDS = ["about", "lines", "honor", "service", "cases"] as const;
type ContentKind = (typeof KINDS)[number];

const ACTIVE: Record<string, string> = {
  about: "About Us",
  lines: "Products Lines",
  honor: "Honor",
  service: "Service Center",
  cases: "Classic Cases",
};

export function generateStaticParams() {
  return KINDS.flatMap((kind) =>
    getContents(kind).flatMap((column) =>
      (column.entries ?? [])
        .filter((entry) => !entry.isLink)
        .map((entry) => ({
          kind,
          columnId: String(column.sourceId),
          id: String(entry.sourceId),
        })),
    ),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string; columnId: string; id: string }>;
}): Promise<Metadata> {
  const { kind, columnId, id } = await params;
  const column = getContent(kind as ContentKind, columnId);
  const entry = column?.entries?.find((item) => String(item.sourceId) === id);
  if (!entry) return { title: "Content" };
  return {
    title: `${entry.title} - Asia Pacific Industry Group`,
    description: stripHtml(entry.bodyHtml, 155) || entry.title,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; columnId: string; id: string }>;
}) {
  const { kind, columnId, id } = await params;
  if (!KINDS.includes(kind as ContentKind)) notFound();
  const column = await getContentForSite(kind as ContentKind, columnId);
  const entry = column?.entries?.find((item) => String(item.sourceId) === id);
  if (!column || !entry) notFound();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active={ACTIVE[kind]} />
      <ContentEntryPage columnId={columnId} content={column} kind={kind as ContentKind} lang="en" sourceId={id} />
      <SiteFooter />
    </div>
  );
}

