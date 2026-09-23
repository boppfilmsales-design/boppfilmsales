import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ProductCategoryPage } from "@/components/pages/Sections";
import { getCategories, productCount } from "@/lib/site";
import { getCategoryForSite } from "@/lib/catalogue-db";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return getCategories().map((category) => ({ catId: String(category.sourceId) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catId: string }>;
}): Promise<Metadata> {
  const { catId } = await params;
  const category = await getCategoryForSite(catId);
  return {
    title: category ? `${category.name} - Products - Asia Pacific Industry Group` : "Products",
    description: category
      ? `${category.name} — ${productCount(category)} products with PDF technical data sheets.`
      : undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ catId: string }> }) {
  const { catId } = await params;
  const category = await getCategoryForSite(catId);
  if (!category) notFound();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products" />
      <ProductCategoryPage category={category} />
      <SiteFooter />
    </div>
  );
}
