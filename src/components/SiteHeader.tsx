import Link from "next/link";
import SiteFloatingBar from "@/components/SiteFloatingBar";
import SiteNav from "@/components/SiteNav";
import { SITE } from "@/lib/site-helpers";
import { getSiteSettings, setting } from "@/lib/site-settings";
import { getNavCategoriesLive } from "@/lib/site-summary";

export default async function SiteHeader({ active, lang = "en" }: { active?: string; lang?: "en" | "zh" }) {
  // Read the live product tree so the mega-menu reflects products moved by
  // 信息转移. Falls back to the seeded tree on any DB hiccup.
  const categories = await getNavCategoriesLive();

  /**
   * 旧版网站入口（"Website Old Version"）。
   *
   * 旧服务器 2026 年底到期后会关停，所以这个链接是**临时的** —— 做成站点设置
   * 而不是写死在代码里：到期后到「高级管理 → 站点设置」把
   * `header_old_site_url` 清空，链接就会消失，不需要改代码重新部署。
   * 设置里为空时这里什么都不渲染。
   */
  const settings = await getSiteSettings();
  const oldSiteUrl = setting(settings, "header_old_site_url").trim();

  return (
    <>
      {/* Fixed right-hand online-contact bar, present on every public page. */}
      <SiteFloatingBar lang={lang} />
      <header className="bg-white">
      {/* utility strip */}
      <div className="hidden border-b border-[#efefef] bg-[#fafafa] text-[12px] text-[#666] lg:block">
        <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between px-4 py-[7px]">
          <div className="flex items-center gap-4">
            <span className="font-bold text-[#c8102e]">
              {lang === "zh" ? "欢迎光临" : "Welcome to our website"}
            </span>
            <span className="text-[#c9a227]">www.boppfilmsales.com & www.apigcl.com</span>
          </div>
          <div className="flex items-center gap-5">
            <a className="transition-colors hover:text-[#c8102e]" href={`tel:${SITE.tel}`}>
              ☎ {SITE.tel}
            </a>
            <a className="transition-colors hover:text-[#c8102e]" href={`mailto:${SITE.email}`}>
              ✉ {SITE.email}
            </a>
            <Link className="transition-colors hover:text-[#c9a227]" href={lang === "zh" ? "/" : "/zh"}>
              {lang === "zh" ? "English" : "中文版"}
            </Link>
            {oldSiteUrl ? (
              // 指向旧服务器上的老站 —— 另一个站点，所以新开标签页打开，
              // 免得访客跳出当前浏览位置。rel="noreferrer" 顺手去掉来源信息。
              <a
                className="underline decoration-dotted underline-offset-2 transition-colors hover:text-[#c8102e]"
                href={oldSiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                {lang === "zh" ? "网站旧版" : "Website Old Version"}
              </a>
            ) : null}
            <Link className="font-bold text-[#c8102e] transition-colors hover:text-[#c9a227] hover:underline" href="/admin">
              {lang === "zh" ? "网站后台" : "Site background"}
            </Link>
          </div>
        </div>
      </div>

      {/* brand bar */}
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-6 px-4 py-5">
        <Link className="flex items-center gap-3.5" href={lang === "zh" ? "/zh" : "/"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/media/uploads/content/logo.png"
            alt={lang === "zh" ? SITE.nameZh : SITE.name}
            className="h-[52px] w-auto object-contain"
          />
          <span className="leading-tight">
            <span className="block text-[17px] font-black tracking-[-0.2px] text-[#22262e] md:text-[20px]">
              {lang === "zh" ? SITE.nameZh : SITE.name}
            </span>
            <span className="mt-[3px] block text-[11px] tracking-[1px] text-[#c9a227]">
              {lang === "zh"
                ? "BOPP / BOPET / POF 薄膜 · 胶带母卷 · 预涂膜 制造与出口"
                : "BOPP / BOPET / POF FILM · TAPE JUMBO ROLLS · THERMAL LAMINATION"}
            </span>
          </span>
        </Link>

        <form
          action={lang === "zh" ? "/zh/news" : "/search"}
          className="hidden items-center border-2 border-[#c8102e] md:flex"
          method="get"
        >
          <input
            aria-label="Search"
            className="h-[40px] w-[210px] px-3 text-[13px] outline-none lg:w-[260px]"
            name={lang === "zh" ? "category" : "keyWord"}
            placeholder={lang === "zh" ? "搜索产品 / 新闻..." : "Search products / news..."}
            type="search"
          />
          <button className="h-[40px] bg-[#c8102e] px-5 text-[13px] font-bold text-white" type="submit">
            {lang === "zh" ? "搜索" : "Search"}
          </button>
        </form>
      </div>

      <SiteNav categories={categories} lang={lang} />
      {active ? null : null}
    </header>
    </>
  );
}