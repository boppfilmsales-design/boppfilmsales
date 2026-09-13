import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ProductDetail } from "@/components/pages/Sections";
import { allProducts, findProduct, productImageUrl, stripHtml, validProductPdfs } from "@/lib/site";

export const dynamic = "force-static";

export function generateStaticParams() {
  return allProducts().map(({ category, product }) => ({
    catId: String(category.sourceId),
    itemId: String(product.sourceId),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ catId: string; itemId: string }>;
}): Promise<Metadata> {
  const { catId, itemId } = await params;
  const found = findProduct(catId, itemId);
  if (!found) return { title: "Product" };
  const path = `/products/${catId}/${itemId}`;
  return {
    title: found.product.title,
    description: stripHtml(found.product.bodyHtml, 155) || `${found.product.title} with technical PDF downloads.`,
    alternates: {
      canonical: path,
      languages: { "en-US": path, "zh-CN": `/zh${path}` },
    },
    openGraph: {
      type: "website",
      title: found.product.title,
      description: stripHtml(found.product.bodyHtml, 155),
      images: found.product.gallery?.[0] ? [productImageUrl(found.product.gallery[0])] : undefined,
    },
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: found.product.title,
    description: stripHtml(found.product.bodyHtml, 400),
    category: found.category.name,
    sku: found.product.code || String(found.product.sourceId),
    image: found.product.gallery.map((image) => `https://www.boppfilmsales.com${productImageUrl(image)}`),
    brand: { "@type": "Brand", name: "Asia Pacific Industry Group" },
    manufacturer: { "@type": "Organization", name: "Asia Pacific Industry Group Co., Limited" },
    subjectOf: validProductPdfs(found.product).map((pdf) => ({
      "@type": "DigitalDocument",
      name: pdf.label,
      encodingFormat: "application/pdf",
      url: `https://www.boppfilmsales.com${pdf.file}`,
    })),
  };
  return (
    <div className="min-h-screen bg-white">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
      <SiteHeader active="Products" />
      <ProductDetail category={found.category} product={found.product} />
      <SiteFooter />
    </div>
  );
}
