"use client";

import Link from "next/link";
import { useState } from "react";

export type ProductFamilyCard = {
  key: number;
  href: string;
  title: string;
  image: string;
  itemCount: number;
  names: string[];
};

type Props = {
  families: ProductFamilyCard[];
  lang?: "en" | "zh";
  perPage?: number;
};

/**
 * Family grid of the /products index with a real pager.
 *
 * The individual category pages already had one (`ProductListing`), but the
 * index that the top navigation points at rendered all 18 families at once, so
 * the last rows were cut off with no way to reach them. Same navigation
 * affordance as the legacy `product.php` listing: count · first · previous ·
 * page numbers · next · end.
 */
export default function ProductFamilyGrid({ families, lang = "en", perPage = 9 }: Props) {
  // The pager resets when the result set changes. Rather than syncing that in
  // an effect, the parent remounts this grid with `key={families.length}`
  // (see Sections.tsx), which is the pattern React recommends for "reset state
  // when a prop changes" and avoids an extra render pass.
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(families.length / perPage));
  const current = Math.min(page, pageCount);
  const slice = families.slice((current - 1) * perPage, current * perPage);
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  if (families.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#888]">
        {t("No product published yet.", "暂无产品。")}
      </p>
    );
  }

  /** Windowed page numbers: always show 1 and last, ±1 around current. */
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (value) => value === 1 || value === pageCount || Math.abs(value - current) <= 1,
  );

  const navBtn =
    "border border-[#e4e4e4] bg-white px-[10px] py-[6px] text-[12px] text-[#666] transition-colors hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-40 disabled:hover:border-[#e4e4e4] disabled:hover:text-[#666]";

  function goTo(target: number) {
    const next = Math.min(Math.max(1, target), pageCount);
    setPage(next);
    if (typeof document !== "undefined") {
      document.getElementById("product-families")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div id="product-families">
      <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {slice.map((family) => (
          <li className="flex" key={family.key}>
            <Link
              className="group flex w-full flex-col overflow-hidden border border-[#e8e8e8] bg-white transition-all hover:-translate-y-1 hover:border-[#c8102e] hover:shadow-2xl"
              href={family.href}
            >
              {family.image ? (
                <div className="flex h-[220px] items-center justify-center overflow-hidden bg-[#f4f5f7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={family.title}
                    className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.03]"
                    src={family.image}
                  />
                </div>
              ) : null}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-[16px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]">
                    {family.title}
                  </h2>
                  <span className="shrink-0 rounded-full bg-[#f4f4f4] px-2 py-[2px] text-[11px] font-bold text-[#888]">
                    {family.itemCount}
                  </span>
                </div>
                <ul className="mt-4 space-y-[6px]">
                  {family.names.map((name, index) => (
                    <li className="truncate text-[13px] text-[#666]" key={index}>
                      · {name}
                    </li>
                  ))}
                </ul>
                <span className="mt-auto inline-block pt-5 text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e]">
                  {t("Explore range", "查看系列")} →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <span className="px-2 text-[12px] text-[#999]">
            {families.length} {t("families", "个产品大类")} ·{" "}
            {t(`page ${current} / ${pageCount}`, `第 ${current} / ${pageCount} 页`)}
          </span>
          <button className={navBtn} disabled={current === 1} onClick={() => goTo(1)} type="button">
            {t("first", "首页")}
          </button>
          <button className={navBtn} disabled={current === 1} onClick={() => goTo(current - 1)} type="button">
            {t("previous", "上一页")}
          </button>
          {pageNumbers.map((target, index) => (
            <span className="flex items-center gap-2" key={target}>
              {index > 0 && target - pageNumbers[index - 1] > 1 ? (
                <span className="px-1 text-[12px] text-[#bbb]">…</span>
              ) : null}
              <button
                className={`min-w-[34px] border px-[10px] py-[6px] text-[12px] font-bold transition-colors ${
                  target === current
                    ? "border-[#c8102e] bg-[#c8102e] text-white"
                    : "border-[#e4e4e4] bg-white text-[#666] hover:border-[#c8102e] hover:text-[#c8102e]"
                }`}
                onClick={() => goTo(target)}
                type="button"
              >
                {target}
              </button>
            </span>
          ))}
          <button className={navBtn} disabled={current === pageCount} onClick={() => goTo(current + 1)} type="button">
            {t("next", "下一页")}
          </button>
          <button className={navBtn} disabled={current === pageCount} onClick={() => goTo(pageCount)} type="button">
            {t("end", "末页")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
