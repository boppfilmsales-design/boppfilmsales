"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCategories, productCount, SITE, categoryNameZh, categoryProductNamesZh } from "@/lib/site";

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
  { id: 43, name: "Company's Notice", nameZh: "公司公告" },
  { id: 76, name: "Technology Data", nameZh: "技术资料下载" },
  { id: 157, name: "Certificate Download", nameZh: "证书下载" },
  { id: 158, name: "MSDS Download", nameZh: "MSDS下载" },
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
  const categories = getCategories();
  const normalizedPath = pathname.replace(/^\/zh(?=\/|$)/, "") || "/";
  const englishPath = normalizedPath;
  const chinesePath = normalizedPath === "/" ? "/zh" : `/zh${normalizedPath}`;

  useEffect(() => {
    setOpen(false);
    setExpanded("");
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? normalizedPath === "/" : normalizedPath.startsWith(href);

  const simple = (label: string, href: string, subs?: { id: number; name: string; nameZh?: string }[]) => (
    <li className="relative group" key={label}>
      <Link
        className={`flex items-center gap-1 px-4 text-[13px] font-bold leading-[46px] transition-colors xl:px-5 ${
          isActive(href) ? "bg-white text-[#c8102e]" : "text-white hover:bg-white hover:text-[#c8102e]"
        }`}
        href={lang === "zh" ? `/zh${href === "/" ? "" : href}` : href}
      >
        {label}
      </Link>
      {subs && (
        <ul className="invisible absolute left-0 top-full z-40 w-[250px] border-t-[3px] border-[#c8102e] bg-white opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
          {subs.map((sub) => (
            <li key={sub.id}>
              <Link
                className="block border-b border-[#f1f1f1] px-4 py-[10px] text-[13px] text-[#555] hover:bg-[#f8f8f8] hover:text-[#c8102e]"
                href={`${lang === "zh" ? "/zh" : ""}${href}?id=${sub.id}`}
              >
                {lang === "zh" && sub.nameZh ? sub.nameZh : sub.name}
              </Link>
            </li>
          ))}
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
            {simple(lang === "zh" ? "新闻中心" : "News", "/news")}
            {/* products mega menu */}
            <li className="group relative">
              <Link
                className={`flex items-center gap-1 px-4 text-[13px] font-bold leading-[46px] transition-colors xl:px-5 ${
                  pathname.includes("/products")
                    ? "bg-white text-[#c8102e]"
                    : "text-white hover:bg-white hover:text-[#c8102e]"
                }`}
                href={lang === "zh" ? "/zh/products" : "/products"}
              >
                {lang === "zh" ? "产品中心" : "Products"}
                <span className="text-[9px]">▼</span>
              </Link>
              <div className="invisible absolute left-0 top-full z-40 w-[980px] border-t-[3px] border-[#c8102e] bg-white p-6 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="grid grid-cols-4 gap-x-6 gap-y-5">
                  {categories.map((category) => {
                    const catName = lang === "zh" ? (categoryNameZh(category.sourceId) ?? category.name) : category.name;
                    const prodItems = category.subs.flatMap((sub) => sub.items).slice(0, 4);
                    return (
                    <div key={category.sourceId}>
                      <Link
                        className="block border-b border-[#eee] pb-[6px] text-[13px] font-bold text-[#c8102e]"
                        href={`${lang === "zh" ? "/zh" : ""}/products/${category.sourceId}`}
                      >
                        {catName}
                        <span className="ml-1 text-[10px] font-normal text-[#aaa]">
                          ({productCount(category)})
                        </span>
                      </Link>
                      <ul className="mt-[6px] max-h-[150px] overflow-hidden">
                        {prodItems.map((product) => (
                          <li className="truncate" key={product.sourceId}>
                            <Link
                              className="block py-[3px] text-[12px] text-[#666] hover:text-[#c8102e]"
                              href={`${lang === "zh" ? "/zh" : ""}/products/${category.sourceId}/${product.sourceId}`}
                            >
                              {lang === "zh" && product.titleZh ? product.titleZh : product.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                </div>
                <Link
                  className="mt-5 inline-block bg-[#c8102e] px-5 py-[9px] text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
                  href={`${lang === "zh" ? "/zh" : ""}/products`}
                >
                  {lang === "zh" ? "浏览全部产品" : "View all products"} →
                </Link>
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
              className={`px-2 text-[12px] font-bold ${lang === "en" ? "text-white" : "text-white/60"}`}
               href={englishPath}
            >
              EN
            </Link>
            <span className="text-white/40">|</span>
            <Link
              className={`px-2 text-[12px] font-bold ${lang === "zh" ? "text-white" : "text-white/60"}`}
               href={chinesePath}
            >
              中文
            </Link>
          </div>

          {/* mobile toggle */}
          <button
            aria-label="Menu"
            className="flex h-[46px] items-center gap-2 px-3 text-[13px] font-bold text-white lg:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            ☰ {lang === "zh" ? "菜单" : "MENU"}
          </button>
          <a
            className="hidden bg-white/15 px-4 py-[8px] text-[12px] font-bold text-white md:block lg:hidden"
            href={`tel:${SITE.tel}`}
          >
            {SITE.tel}
          </a>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-white/20 bg-[#a30d25] lg:hidden">
          <ul className="px-3 py-2">
            {[
              { label: lang === "zh" ? "首页" : "Home", href: lang === "zh" ? "/zh" : "/" },
              { label: lang === "zh" ? "关于我们" : "About Us", href: `${lang === "zh" ? "/zh" : ""}/about` },
              { label: lang === "zh" ? "新闻中心" : "News", href: `${lang === "zh" ? "/zh" : ""}/news` },
              { label: lang === "zh" ? "产品中心" : "Products", href: `${lang === "zh" ? "/zh" : ""}/products` },
              { label: lang === "zh" ? "下载中心" : "Download", href: `${lang === "zh" ? "/zh" : ""}/downloads` },
              { label: lang === "zh" ? "生产线" : "Products Lines", href: `${lang === "zh" ? "/zh" : ""}/product-lines` },
              { label: lang === "zh" ? "荣誉资质" : "Honor", href: `${lang === "zh" ? "/zh" : ""}/honor` },
              { label: lang === "zh" ? "服务中心" : "Service", href: `${lang === "zh" ? "/zh" : ""}/service` },
              { label: lang === "zh" ? "经典案例" : "Cases", href: `${lang === "zh" ? "/zh" : ""}/cases` },
              { label: lang === "zh" ? "联系我们" : "Contact", href: `${lang === "zh" ? "/zh" : ""}/contact` },
            ].map((item) => {
              const isProducts = item.label === (lang === "zh" ? "产品中心" : "Products");
              return (
                <li key={item.label}>
                  {isProducts ? (
                    <button
                      aria-expanded={expanded === item.label}
                      className="flex w-full items-center justify-between border-b border-white/10 py-[11px] text-left text-[14px] font-bold text-white"
                      onClick={() => setExpanded((value) => (value === item.label ? "" : item.label))}
                      type="button"
                    >
                      {item.label}
                      <span className={`text-[10px] transition-transform ${expanded === item.label ? "rotate-180" : ""}`}>▼</span>
                    </button>
                  ) : (
                    <Link className="block border-b border-white/10 py-[11px] text-[14px] font-bold text-white" href={item.href}>
                      {item.label}
                    </Link>
                  )}
                  {isProducts && expanded === item.label && (
                    <ul className="border-b border-white/10 bg-black/10 px-3 py-2">
                      <li>
                        <Link className="block py-2 text-[12px] font-bold text-white" href={item.href}>
                          {lang === "zh" ? "查看全部产品" : "View all products"} →
                        </Link>
                      </li>
                      {categories.map((c) => (
                        <li key={c.sourceId}>
                          <Link
                            className="block border-t border-white/5 py-[8px] text-[12px] text-white/85"
                            href={`${lang === "zh" ? "/zh" : ""}/products/${c.sourceId}`}
                          >
                            · {c.name} <span className="text-white/50">({productCount(c)})</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            <li className="flex items-center gap-4 py-3 text-[13px] font-bold text-white">
              <Link href={englishPath}>EN</Link>
              <Link href={chinesePath}>中文</Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

export { NEWS_TABS };
