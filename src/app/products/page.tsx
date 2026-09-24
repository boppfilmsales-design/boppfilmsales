import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { AllPdfsSection, ProductsIndex } from "@/components/pages/Sections";
import { allPdfs, productCount } from "@/lib/site";

/**
 * Rendered per request: the per-page count comes from 高级管理 → 站点设置
 * (`products_per_page`), so a static render would freeze whatever value was
 * live at build time.
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
