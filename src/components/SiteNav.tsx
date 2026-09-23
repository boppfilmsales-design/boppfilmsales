"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { categoryNameZh, SITE } from "@/lib/site-helpers";
import { getNavCategories } from "@/lib/site-summary";

const NEWS_TABS = [
  { slug: "industry-news", name: "Industry News", nameZh: "行业新闻" },
  { slug: "company-news", name: "Company News", nameZh: "公司新闻" },
  { slug: "employees-literary", name: "Employees Literary", nameZh: "员工文苑" },
];

const ABOUT_SUBS = [
  { id: 13, name: "About Us", nameZh: "企业简介" },
  { id: 55, name: "Main Products", nameZh: "主营产品" },
  { id: 16, name: "Honor", nameZh: "荣誉资质" },
  { id: 56, name: "Culture", nameZh: "企业文化" },
  { id: 169, name: "Branch Companies", nameZh: "子公司" },
  { id: 171, name: "Factory & Warehouse", nameZh: "工厂和车间" },
  { id: 172, name: "Course", nameZh: "奋斗历程" },
];

const DOWNLOAD_SUBS = [
  { slug: "company-notice", name: "Company's Notice", nameZh: "公司公告" },
  { slug: "technology-data", name: "Technology Data", nameZh: "技术资料下载" },
  { slug: "certificate-download", name: "Certificate Download", nameZh: "证书下载" },
  { slug: "msds-download", name: "MSDS Download", nameZh: "MSDS下载" },
];

const LINES_SUBS = [
  { id: 45, name: "Packing Film Lines", nameZh: "包装薄膜生产线" },
  { id: 142, name: "BOPP Film Lines", nameZh: "BOPP薄膜生产线" },
  { id: 143, name: "BOPET Film Lines", nameZh: "BOPET薄膜生产线" },
  { id: 144, name: "Tape Lines", nameZh: "胶带生产线" },
  { id: 149, name: "Thermal Lamination Lines", nameZh: "预涂膜生产线" },
  { id: 164, name: "Bruckner Lines (Germany)", nameZh: "布鲁克纳生产线（德国）" },
  { id: 165, name: "Mitsubishi Lines (Japan)", nameZh: "三菱生产线（日本）" },
  { id: 167, name: "Copy Paper Lines", nameZh: "复印纸生产线" },
  { id: 173, name: "Silver Metallized Lines", nameZh: "镀铝膜生产线" },
  { id: 174, name: "POF Film Lines", nameZh: "POF薄膜生产线" },
];

const HONOR_SUBS = [
  { id: 17, name: "Certificate", nameZh: "证书" },
  { id: 50, name: "To Customer", nameZh: "致客户" },
  { id: 51, name: "Certification Report", nameZh: "认证报告" },
];

const SERVICE_SUBS = [
  { id: 79, name: "Useful Links", nameZh: "常用链接" },
  { id: 141, name: "Company Announcement", nameZh: "公司公告" },
  { id: 148, name: "Useful Knowledge", nameZh: "实用知识" },
  { id: 199, name: "Vessel Shipping Lines", nameZh: "船运航线" },
];

const CASES_SUBS = [
  { id: 54, name: "Development Cases", nameZh: "发展历程" },
  { id: 145, name: "To Buyers", nameZh: "致客户" },
  { id: 146, name: "To Markets", nameZh: "致市场" },
  { id: 147, name: "To Ourselves", nameZh: "致自己" },
];

type Props = { lang?: "en" | "zh" };

export default function SiteNav({ lang = "en" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string>("");
  const categories = getNavCategories();
  const normalizedPath = pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
  const englishPath = normalizedPath;
  const chinesePath = normalizedPath === "/" ? "/zh" : `/zh${normalizedPath}`;

  useEffect(() => {
    setOpen(false);
    setExpanded("");
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? normalizedPath === "/" : normalizedPath.startsWith(href);

  const simple = (
    label: string, 
    href: string, 
    subs?: { id?: number; slug?: string; name: string; nameZh?: string }[]
  ) => (
    <li className="relative group" key={label}>
      <Link
        className={`flex items-center gap-1 px-4 text-[14px] font-bold leading-[46px] transition-colors xl:px-5 ${
          isActive(href) ? "bg-white text-[#c8102e]" : "text-white hover:bg-white hover:text-[#c8102e]"
        }`}
        href={lang === "zh" ? `/zh${href === "/" ? "" : href}` : href}
      >
        {label}
      </Link>
      {subs && (
        <ul className="invisible absolute left-0 top-full z-40 w-[270px] border-t-[3px] border-[#c8102e] bg-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
          {subs.map((sub) => {
            const subHref = sub.slug
              ? `${lang === "zh" ? "/zh" : ""}${href}?category=${sub.slug}`
              : `${lang === "zh" ? "/zh" : ""}${href}?id=${sub.id}`;
            return (
              <li key={sub.slug || sub.id}>
                <Link
                  className="block border-b border-[#f1f1f1] px-4 py-[11px] text-[14px] text-[#444] hover:bg-[#f8f8f8] hover:text-[#c8102e]"
                  href={subHref}
                >
                  {lang === "zh" && sub.nameZh ? sub.nameZh : sub.name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#c8102e] shadow-md">
      <div className="mx-auto w-full max-w-[1560px] px-3">
        <div className="flex items-center justify-between">
          {/* desktop menu */}
          <ul className="hidden flex-1 items-center lg:flex">
            {simple(lang === "zh" ? "首页" : "Home", "/")}
            {simple(lang === "zh" ? "关于我们" : "About Us", "/about", ABOUT_SUBS)}
            {simple(lang === "zh" ? "新闻中心" : "News", "/news", NEWS_TABS)}
            {/* products mega menu */}
            <li className="group relative">
              <Link
                className={`flex items-center gap-1 px-4 text-[14px] font-bold leading-[46px] transition-colors xl:px-5 ${
                  pathname.includes("/products")
                    ? "bg-white text-[#c8102e]"
                    : "text-white hover:bg-white hover:text-[#c8102e]"
                }`}
                href={lang === "zh" ? "/zh/products" : "/products"}
              >
                {lang === "zh" ? "产品中心" : "Products"}
                <span className="text-[10px]">▼</span>
              </Link>
              <div className="invisible absolute left-0 top-full z-40 w-[1280px] border-t-[3px] border-[#c8102e] bg-white p-7 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-4 gap-x-6 gap-y-6">
                  {categories.map((category) => {
                    const catName = lang === "zh" ? (categoryNameZh(category.sourceId) ?? category.name) : category.name;
                    return (
                      <div key={category.sourceId} className="flex flex-col space-y-2.5">
                        <div className="bg-[#f5f5f5] px-3 py-2.5 border-l-3 border-[#c8102e]">
                          <Link
                            className="text-[14px] font-extrabold text-[#22262e] hover:text-[#c8102e] block leading-tight"
                            href={`${lang === "zh" ? "/zh" : ""}/products/${category.sourceId}`}
                          >
                            {catName}
                            <span className="ml-1.5 text-[11px] font-normal text-[#777]">
                              ({category.count})
                            </span>
                          </Link>
                        </div>
                        <ul className="space-y-2 pl-1">
                          {category.subs.map((sub) => (
                            <li key={sub.sourceId}>
                              <Link
                                className="text-[13px] text-[#444] hover:text-[#c8102e] leading-snug block break-words transition-colors"
                                href={`${lang === "zh" ? "/zh" : ""}/products/${category.sourceId}/${sub.firstItemId || ""}`}
                              >
                                <span className="text-[#c8102e] mr-2 font-bold">▪</span>
                                {lang === "zh" && sub.nameZh ? sub.nameZh : sub.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-7 border-t border-[#eee] pt-5">
                  <Link
                    className="inline-block bg-[#c8102e] px-6 py-[10px] text-[13px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
                    href={`${lang === "zh" ? "/zh" : ""}/products`}
                  >
                    {lang === "zh" ? "浏览全部产品" : "View all products"} →
                  </Link>
                </div>
              </div>
            </li>
            {simple(lang === "zh" ? "下载中心" : "Download", "/downloads", DOWNLOAD_SUBS)}
            {simple(lang === "zh" ? "生产线" : "Products Lines", "/product-lines", LINES_SUBS)}
            {simple(lang === "zh" ? "荣誉资质" : "Honor", "/honor", HONOR_SUBS)}
            {simple(lang === "zh" ? "服务中心" : "Service", "/service", SERVICE_SUBS)}
            {simple(lang === "zh" ? "经典案例" : "Cases", "/cases", CASES_SUBS)}
            {simple(lang === "zh" ? "联系我们" : "Contact", "/contact")}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              className={`px-2 text-[13px] font-bold ${lang === "en" ? "text-white" : "text-white/60"}`}
              href={englishPath}
            >
              EN
            </Link>
            <span className="text-white/40">|</span>
            <Link
              className={`px-2 text-[13px] font-bold ${lang === "zh" ? "text-white" : "text-white/60"}`}
              href={chinesePath}
            >
              中文
            </Link>
          </div>

          <button
            aria-label="Menu"
            className="flex h-[46px] items-center gap-2 px-3 text-[14px] font-bold text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            ☰ {lang === "zh" ? "菜单" : "MENU"}
          </button>
        </div>
      </div>
    </nav>
  );
}

export { NEWS_TABS, DOWNLOAD_SUBS };