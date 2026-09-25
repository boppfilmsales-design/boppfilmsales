import ProductDetailSection from "@/components/ProductDetailSection";
import ProductGallery from "@/components/ProductGallery";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { allProducts, productImageUrl, stripHtml, validProductPdfs } from "@/lib/site";
import { getProductForSite } from "@/lib/catalogue-db";

export const dynamic = "force-dynamic";

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
  const found = await getProductForSite(catId, itemId);
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
  const found = await getProductForSite(catId, itemId);
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

  const pdfs = validProductPdfs(found.product);
  const gallery = found.product.gallery || [];
  
  // 获取同类推荐产品作为 Related Products
  const relatedList = allProducts()
    .filter(p => String(p.category.sourceId) === catId && String(p.product.sourceId) !== itemId)
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-white text-[#333]">
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} type="application/ld+json" />
      
      {/* 顶部全局导航 */}
      <SiteHeader active="Products" />

      {/* 模仿源站 w1200 经典版心容器 */}
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        
        {/* 面包屑 / 页面路径导航 */}
        <div className="mb-4 text-[12px] text-[#666] border-b border-gray-200 pb-2">
          <Link href="/" className="hover:text-red-600">Home</Link>
          <span className="mx-2">&gt;</span>
          <Link href="/products" className="hover:text-red-600">Products</Link>
          <span className="mx-2">&gt;</span>
          <Link href={`/products/${catId}`} className="hover:text-red-600">
            {found.category.name}
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[#333]">{found.product.title}</span>
        </div>

        {/* 核心产品展示区：左侧图片，右侧标题与参数信息 */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
          
          {/* 左侧：产品大图区 */}
          <div className="lg:col-span-5 space-y-3">
            <ProductGallery images={gallery} noImageLabel="No Image" title={found.product.title} />
          </div>

          {/* 右侧：产品大标题、货号、价格及询盘按钮区 */}
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-[20px] font-bold leading-snug text-[#b91c1c]">
              {found.product.title}
            </h1>

            {/* 参数列表框：精准还原源站 Product code / H.S. code / Wholesale price */}
            <div className="border-t border-b border-gray-200 py-3 space-y-2.5 text-xs text-gray-700">
              <div className="flex items-center">
                <span className="w-32 text-gray-500 font-medium">Product code:</span>
                <span className="font-semibold text-gray-900">{found.product.code || `APIG-${found.product.sourceId}`}</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-500 font-medium">H.S. code:</span>
                <span className="font-semibold text-gray-800">3920620000</span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-500 font-medium">Wholesale price:</span>
                <span className="text-red-600 font-bold text-sm">$3.25 <span className="text-xs font-normal text-gray-500">/only</span></span>
              </div>
              <div className="flex items-center">
                <span className="w-32 text-gray-500 font-medium">Category:</span>
                <span className="text-gray-900">{found.category.name}</span>
              </div>
            </div>

            {/* 询盘/互动按钮 */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/contact"
                className="rounded bg-[#f97316] px-6 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-[#ea580c] shadow-sm"
              >
                Check Details
              </Link>
              <Link
                href="/contact"
                className="rounded bg-red-600 px-6 py-2.5 text-xs font-bold uppercase text-white transition hover:bg-red-700 shadow-sm"
              >
                Chat Now
              </Link>
            </div>

            {/* PDF 下载链接 */}
            {pdfs.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="text-xs font-bold text-gray-800 uppercase">Technical Documents:</div>
                {pdfs.map((pdf, idx) => (
                  <a
                    key={idx}
                    href={pdf.file}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded bg-gray-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-black mr-2 mb-2"
                  >
                    <span>📥</span>
                    <span>{pdf.label || "Download PDF"}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 经典 5 大红底折叠面板区域 */}
        <ProductDetailSection 
          description={found.product.description || found.product.bodyHtml}
          technicalDetails={found.product.technical}
          offerDetails={found.product.offer || "We offer competitive pricing (FOB / CNF terms available). Contact our sales team for an updated quotation."}
          helpfulLinks={pdfs.map(pdf => ({ title: pdf.label, url: pdf.file }))}
        />

        {/* 底部相关产品 (RELATED PRODUCTS) 栏目 */}
        <div className="mt-14">
          <div className="relative mb-6 flex items-center justify-between border-b-2 border-red-600 pb-2">
            <h2 className="bg-red-600 px-4 py-1.5 text-sm font-black tracking-wider text-white uppercase inline-block">
              RELATED PRODUCTS
            </h2>
            <Link
              href={`/products/${catId}`}
              className="rounded bg-gray-200 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-300 transition uppercase"
            >
              View More
            </Link>
          </div>

          {relatedList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedList.map((item, idx) => {
                const img = item.product.gallery?.[0];
                return (
                  <Link
                    key={idx}
                    href={`/products/${catId}/${item.product.sourceId}`}
                    className="group border border-gray-200 bg-white p-3 shadow-sm hover:border-red-600 transition"
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center mb-3 overflow-hidden">
                      {img ? (
                        <img
                          src={productImageUrl(img)}
                          alt={item.product.title}
                          className="h-full w-full object-contain p-2 group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Image</span>
                      )}
                    </div>
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-2 group-hover:text-red-600 transition">
                      {item.product.title}
                    </h3>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">No related products found in this category.</p>
          )}
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}