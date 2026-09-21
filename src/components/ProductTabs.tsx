"use client";

import { useState } from "react";

export type ProductTabItem = {
  id: string;
  label: string;
  html: string;
};

type Props = {
  tabs: ProductTabItem[];
  lang?: "en" | "zh";
  inquiryHref?: string;
};

/**
 * Mirrors the three legacy tabs of product_show.php:
 * Description / TECHNICAL PARAMETERS / OFFER DETAILS.
 */
export default function ProductTabs({ tabs, lang = "en", inquiryHref = "/contact" }: Props) {
  const visible = tabs.filter((tab) => tab.html && tab.html.trim().length > 0);
  const list = visible.length ? visible : [{ id: "description", label: lang === "zh" ? "产品描述" : "Description", html: "" }];
  const [active, setActive] = useState(0);
  const current = list[Math.min(active, list.length - 1)];
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  return (
    <div className="border border-[#e8e8e8] bg-white">
      <div className="flex flex-wrap border-b border-[#e8e8e8] bg-[#fafafa]">
        {list.map((tab, index) => (
          <button
            className={`relative px-5 py-[14px] text-[13px] font-bold uppercase tracking-[1px] transition-colors ${
              index === Math.min(active, list.length - 1)
                ? "bg-white text-[#c8102e]"
                : "text-[#555] hover:text-[#c8102e]"
            }`}
            key={tab.id}
            onClick={() => setActive(index)}
            type="button"
          >
            {tab.label}
            {index === Math.min(active, list.length - 1) ? (
              <i className="absolute inset-x-0 top-0 block h-[3px] bg-[#c8102e]" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="px-5 py-6 md:px-8 md:py-8">
        <div
          className="news-body text-[14px] leading-[190%] text-[#3d3d3d]"
          dangerouslySetInnerHTML={{
            __html: current.html || `<p>${t("Content is being prepared.", "内容整理中。")}</p>`,
          }}
        />

        <div className="mt-8 flex flex-wrap gap-3 border-t border-[#f0f0f0] pt-6">
          <a
            className="border border-[#c8102e] bg-[#c8102e] px-5 py-[10px] text-[12px] font-bold uppercase tracking-[1px] text-white hover:bg-[#a30d25]"
            href={inquiryHref}
          >
            {t("Ask questions now", "立即咨询")}
          </a>
          <a
            className="border border-[#c8102e] px-5 py-[10px] text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e] hover:bg-[#c8102e] hover:text-white"
            href={`${inquiryHref}#msg`}
          >
            {t("Make an inquiry now", "立即询盘")}
          </a>
        </div>
      </div>
    </div>
  );
}

