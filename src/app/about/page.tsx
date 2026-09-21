import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { permanentRedirect } from "next/navigation";
import { ContentColumnPage } from "@/components/pages/Sections";
import { getContent } from "@/lib/site";

/* Rendered on the server for every ?id= column, so the HTML always contains
   the complete column (the old client-side rendering produced blank pages). */
export const dynamic = "force-dynamic";

/** The legacy About menu also contains "Honor" (column 16) and the honour
 *  columns 17/50/51, which belong to the /honor page. */
const OTHER_KINDS: { kind: "honor" | "lines" | "service" | "cases"; href: string }[] = [
  { kind: "honor", href: "/honor" },
  { kind: "lines", href: "/product-lines" },
  { kind: "service", href: "/service" },
  { kind: "cases", href: "/cases" },
];

export const metadata: Metadata = {
  title: "About Us - Asia Pacific Industry Group",
  description: "BOPP / BOPET film manufacturer in Hefei, China — company profile, culture, branch companies and warehouse.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; c_id?: string }>;
}) {
  const query = await searchParams;
  const parsed = Number(query.id ?? query.c_id ?? "");
  if (Number.isFinite(parsed) && parsed > 0 && !getContent("about", parsed)) {
    const owner = OTHER_KINDS.find((item) => getContent(item.kind, parsed));
    if (owner) permanentRedirect(`${owner.href}?id=${parsed}`);
  }
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="About Us" />
      <ContentColumnPage kind="about" sourceId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />
      <SiteFooter />
    </div>
  );
}
