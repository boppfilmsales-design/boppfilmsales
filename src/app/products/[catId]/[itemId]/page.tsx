import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ProductDetail } from "@/components/pages/Sections";
import { findProduct } from "@/lib/site";

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catId: string; itemId: string }>;
}): Promise<Metadata> {
  const { catId, itemId } = await params;
  const found = findProduct(catId, itemId);
  return {
    title: found ? `${found.product.title} - Asia Pacific Industry Group` : "Product",
    description: found ? `${found.product.title} — PDF technical data sheet available.` : undefined,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ catId: string; itemId: string }>;
}) {
  const { catId, itemId } = await params;
  const found = findProduct(catId, itemId);
  if (!found) notFound();
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products" />
      <ProductDetail category={found.category} product={found.product} />
      <SiteFooter />
    </div>
  );
}
