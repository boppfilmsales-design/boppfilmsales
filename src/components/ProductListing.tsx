"use client";

import Link from "next/link";
import { useState } from "react";
import ProductCardImage from "@/components/ProductCardImage";

export type ProductCard = {
  id: number;
  href: string;
  title: string;
  summary: string;
  code: string;
  price: string;
  image: string;
  subName: string;
  pdfCount: number;
};

type Props = {
  cards: ProductCard[];
  lang?: "en" | "zh";
  perPage?: number;
};

/**
 * The product grid of the legacy site: the same cards and the same
 * "N row / first / 1 2 3 / next / end" pager, 10 products per page.
 */
export default function ProductListing({ cards, lang = "en", perPage = 10 }: Props) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(cards.length / perPage));
  const current = Math.min(page, pageCount);
  const slice = cards.slice((current - 1) * perPage, current * perPage);
  const t = (en: string, zh: string) => (lang === "zh" ? zh : en);

  if (cards.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-[#888]">
        {t("No product published in this group yet.", "该分类暂无产品。")}
      </p>
    );
  }

  const pageLink = (target: number) => (
    <button
      className={`min-w-[34px] border px-[10px] py-[6px] text-[12px] font-bold transition-colors ${
        target === current
          ? "border-[#c8102e] bg-[#c8102e] text-white"
          : "border-[#e4e4e4] bg-white text-[#666] hover:border-[#c8102e] hover:text-[#c8102e]"
      }`}
      key={target}
      onClick={() => setPage(target)}
      type="button"
    >
      {target}
    </button>
  );

  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slice.map((card) => (
          <li
            className="group flex flex-col overflow-hidden border border-[#e8e8e8] bg-white transition-all hover:-translate-y-[3px] hover:border-[#c8102e] hover:shadow-xl"
            key={card.id}
          >
            <Link className="block h-[210px] overflow-hidden bg-[#f7f7f7]" href={card.href}>
              <ProductCardImage image={card.image} title={card.title} />
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link
                className="text-[14px] font-bold leading-snug text-[#22262e] group-hover:text-[#c8102e]"
                href={card.href}
              >
                {card.title}
              </Link>
              {card.summary ? (
                <p className="mt-2 line-clamp-3 text-[12px] leading-[20px] text-[#777]">{card.summary}</p>
              ) : null}
              <dl className="mt-3 space-y-[6px] border-t border-[#f0f0f0] pt-3 text-[12px]">
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[#999]">{t("Product code", "产品编码")}:</dt>
                  <dd className="truncate font-bold text-[#333]">{card.code || "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-[#999]">{t("Wholesale price", "批发价格")}:</dt>
                  <dd className="font-bold text-[#c8102e]">{card.price ? `$ ${card.price}` : "—"}</dd>
                </div>
              </dl>
              <div className="mt-auto flex items-center justify-between pt-3 text-[11px]">
                <span className="truncate text-[#999]">{card.subName}</span>
                {card.pdfCount > 0 ? (
                  <span className="font-bold text-[#c8102e]">PDF x{card.pdfCount}</span>
                ) : null}
              </div>
              <Link
                className="mt-2 text-[12px] font-bold uppercase tracking-[1px] text-[#c8102e]"
                href={card.href}
              >
                {t("view MORE", "查看详情")} →
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {pageCount > 1 ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          <span className="px-2 text-[12px] text-[#999]">
            {cards.length} {t("row", "条")}
          </span>
          <button
            className="border border-[#e4e4e4] px-[10px] py-[6px] text-[12px] text-[#666] hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-40"
            disabled={current === 1}
            onClick={() => setPage(1)}
            type="button"
          >
            {t("first", "首页")}
          </button>
          <button
            className="border border-[#e4e4e4] px-[10px] py-[6px] text-[12px] text-[#666] hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-40"
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            type="button"
          >
            {t("previous", "上一页")}
          </button>
          {Array.from({ length: pageCount }, (_, index) => pageLink(index + 1))}
          <button
            className="border border-[#e4e4e4] px-[10px] py-[6px] text-[12px] text-[#666] hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-40"
            disabled={current === pageCount}
            onClick={() => setPage(current + 1)}
            type="button"
          >
            {t("next", "下一页")}
          </button>
          <button
            className="border border-[#e4e4e4] px-[10px] py-[6px] text-[12px] text-[#666] hover:border-[#c8102e] hover:text-[#c8102e] disabled:opacity-40"
            disabled={current === pageCount}
            onClick={() => setPage(pageCount)}
            type="button"
          >
            {t("end", "末页")}
          </button>
        </div>
      ) : null}
    </>
  );
}

