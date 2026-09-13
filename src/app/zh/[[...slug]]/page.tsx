import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import {
  ContentColumnPage,
  DownloadsPage,
  ProductCategoryPage,
  ProductDetail,
  ProductsIndex,
} from "@/components/pages/Sections";
import { findProduct, getCategory, SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug?: string[] }>;

const TITLES: Record<string, string> = {
  "": `${SITE.nameZh} - BOPP/BOPET 薄膜、胶带母卷、预涂膜生产厂家`,
  products: "产品中心 - 亚太工业集团有限公司",
  downloads: "下载中心 - 技术资料 / MSDS / 证书",
  about: "关于我们 - 亚太工业集团有限公司",
  honor: "荣誉资质 - 亚太工业集团有限公司",
  service: "服务中心 - 亚太工业集团有限公司",
  cases: "经典案例 - 亚太工业集团有限公司",
  "product-lines": "生产线 - 亚太工业集团有限公司",
  contact: "联系我们 - 亚太工业集团有限公司",
  news: "新闻中心 - 亚太工业集团有限公司",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug = [] } = await params;
  return { title: TITLES[slug[0] ?? ""] ?? TITLES[""], description: SITE.nameZh };
}

export default async function ZhPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ id?: string }>;
}) {
  const { slug = [] } = await params;
  const query = await searchParams;
  const [first, second, third] = slug;
  let content: React.ReactNode;

  if (!first) {
    content = <ProductsIndex lang="zh" />;
  } else if (first === "products" && second && third) {
    const found = findProduct(second, third);
    if (!found) notFound();
    content = <ProductDetail category={found.category} product={found.product} lang="zh" />;
  } else if (first === "products" && second) {
    const category = getCategory(second);
    if (!category) notFound();
    content = <ProductCategoryPage category={category} lang="zh" />;
  } else if (first === "downloads") {
    content = <DownloadsPage lang="zh" />;
  } else if (["about", "honor", "service", "cases", "product-lines"].includes(first)) {
    const kind = first === "product-lines" ? "lines" : (first as "about" | "honor" | "service" | "cases");
    const id = Number(query.id ?? query.c_id ?? second);
    content = (
      <ContentColumnPage kind={kind} lang="zh" sourceId={Number.isFinite(id) && id > 0 ? id : undefined} />
    );
  } else if (first === "news") {
    content = (
      <div className="py-16 text-center text-[14px] text-[#666]">
        中文新闻中心建设中，请先浏览
        <a className="ml-1 text-[#c8102e] underline" href="/news">英文新闻中心</a>。
      </div>
    );
  } else if (first === "contact") {
    content = (
      <div className="py-16 text-center text-[14px] leading-[30px] text-[#555]">
        <h1 className="text-[24px] font-bold text-[#22262e]">联系我们</h1>
        <p className="mt-4">{SITE.nameZh}</p>
        <p>地址：{SITE.address}</p>
        <p>电话：{SITE.tel}</p>
        <p>手机 / WhatsApp：{SITE.mobile}</p>
        <p>邮箱：<a className="text-[#c8102e] underline" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
        <a className="mt-6 inline-block bg-[#c8102e] px-6 py-[11px] text-[13px] font-bold text-white" href="/contact">
          在线询盘（英文表单）
        </a>
      </div>
    );
  } else {
    content = <ProductsIndex lang="zh" />;
  }

  const map: Record<string, string> = {
    products: "Products", about: "About Us", news: "News", downloads: "Download",
    "product-lines": "Products Lines", honor: "Honor", service: "Service Center",
    cases: "Classic Cases", contact: "Contact",
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active={map[first ?? ""] ?? "Home"} lang="zh" />
      {content}
      <SiteFooter />
    </div>
  );
}
