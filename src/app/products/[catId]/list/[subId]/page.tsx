import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ProductSubPage } from "@/components/pages/Sections";
import { getCategories, getCategory, getSub, subProducts } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getCategories().flatMap((family) =>
    family.subs.map((sub) => ({ catId: String(family.sourceId), subId: String(sub.sourceId) })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catId: string; subId: string }>;
}): Promise<Metadata> {
  const { catId, subId } = await params;
  const family = getCategory(catId);
  const sub = family ? getSub(family, subId) : undefined;
  if (!family || !sub) return { title: "Products" };
  const path = `/products/${catId}/list/${subId}`;
  return {
    title: `${sub.name} - ${family.name} - Asia Pacific Industry Group`,
    description: `${sub.name}: ${subProducts(sub).length} products mirrored from the ${family.name} catalogue.`,
    alternates: {
      canonical: path,
      languages: { "en-US": path, "zh-CN": `/zh${path}` },
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ catId: string; subId: string }>;
}) {
  const { catId, subId } = await params;
  const family = getCategory(catId);
  const sub = family ? getSub(family, subId) : undefined;
  if (!family || !sub) notFound();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products" />
      <ProductSubPage category={family} lang="en" sub={sub} />
      <SiteFooter />
    </div>
  );
}

