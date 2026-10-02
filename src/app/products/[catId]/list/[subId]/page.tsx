import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ProductSubPage } from "@/components/pages/Sections";
import { getCategories, getSub, subProducts } from "@/lib/site";
import { getCategoryForSite } from "@/lib/catalogue-db";

/**
 * 实时渲染：后台改完内容，前台立刻生效。
 *
 * 2026-10-02 之前这里是 `revalidate = 60`（增量缓存 60 秒）。当时的理由是免费版
 * Workers 只有 10 毫秒 CPU 预算，而 `force-dynamic` 会让每次访问都重建整棵页面树
 * 并重扫 D1，进而触发 Error 1102（Worker exceeded resource limits）。
 *
 * 现已升级 Workers Paid（30 秒 CPU / 请求，额度是免费版的 3000 倍），所以改回
 * 实时渲染。代价是每次访问都会读一次 D1 —— 首页那种一次读上百行的页面如果流量
 * 很大，要留意 D1 的每日读取额度。
 */
export const dynamic = "force-dynamic";

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
  const family = await getCategoryForSite(catId);
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
  const family = await getCategoryForSite(catId);
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

