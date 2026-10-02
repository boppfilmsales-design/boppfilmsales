import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { AllPdfsSection } from "@/components/pages/AllPdfsSection";
import { ProductsIndex } from "@/components/pages/Sections";
import { allPdfs, productCount } from "@/lib/site";

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

export const metadata: Metadata = {
  title: "Products - BOPET / BOPP / POF Film, Tape & Machine Lines",
  description:
    "18 product families and 110 detailed items: 4.5Mic BOPET film, BOPP film, BOPP tape jumbo rolls, thermal laminating film, POF shrink film, BOPS, CPP, aluminium foil, labels, ribbons and film machine lines.",
};

export default function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="Products" />
      <ProductsIndex />
      <section className="py-14">
        <div className="mx-auto w-full max-w-[1560px] px-4 text-center">
          <h2 className="text-[26px] font-black text-[#22262e]">
            {productCount()} products · {allPdfs().length} PDF data sheets
          </h2>
          <p className="mx-auto mt-4 max-w-[820px] text-[14px] leading-[26px] text-[#666]">
            Every product page carries its own specification table, gallery and downloadable PDF technical
            data sheet. Cannot find a grade? Email sales@boppfilmsales.com and our engineers will recommend
            a matching film within 12 working hours.
          </p>
        </div>
      </section>
      <AllPdfsSection />
      <SiteFooter />
    </div>
  );
}
