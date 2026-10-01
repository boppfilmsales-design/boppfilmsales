import Link from "next/link";
import { getContentsForSite } from "@/lib/content-db";
import { contentNameZh } from "@/lib/site-helpers";

/**
 * Lightweight chrome for article columns (/cases, /service).
 *
 * `PageHero` and `ColumnStrip` used to live in `@/components/pages/Sections`,
 * whose module-level `import ... from "@/lib/site"` parses the ~784 KB
 * `site-catalog.json` on every Worker cold start — a contributor to Error 1102
 * (Worker exceeded resource limits) on the free plan's CPU budget. Nothing in
 * this file touches `@/lib/site`, so routes that only need the hero + tab
 * strip (e.g. /cases?id=54) skip that parse entirely.
 *
 * `Sections.tsx` re-exports both components so existing importers keep working.
 */

export type Lang = "en" | "zh";
/** 2026-10-01: 加入 "down" —— 下载中心四栏已改为富文本文章模式。 */
export type ContentKind = "about" | "lines" | "honor" | "service" | "cases" | "down";

export const baseOf = (lang: Lang) => (lang === "zh" ? "/zh" : "");
export const pick = (lang: Lang, en: string, zh: string) => (lang === "zh" ? zh : en);

export const COLUMN_HREF: Record<string, string> = {
  about: "/about",
  lines: "/product-lines",
  honor: "/honor",
  service: "/service",
  cases: "/cases",
  down: "/downloads",
};

export function PageHero({
  title,
  subtitle,
  breadcrumb,
  lang = "en",
}: {
  title: string;
  subtitle?: string;
  breadcrumb: string[];
  lang?: Lang;
}) {
  const home = lang === "zh" ? "/zh" : "/";
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,#1b1f2a_0%,#2c3342_55%,#c8102e_140%)] py-14 text-white">
      <div className="mx-auto w-full max-w-[1560px] px-4">
        <nav className="text-[12px] uppercase tracking-[2px] text-white/60">
          <Link className="hover:text-white" href={home}>
            {lang === "zh" ? "首页" : "Home"}
          </Link>
          {breadcrumb.map((item) => (
            <span key={item}> / {item}</span>
          ))}
        </nav>
        <h1 className="mt-3 text-[28px] font-black leading-tight md:text-[38px]">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-[880px] text-[14px] leading-[26px] text-white/80">{subtitle}</p> : null}
      </div>
    </section>
  );
}

/**
 * Column tab strip, backed by D1 (`admin_contents`) instead of the build-time
 * seed. `getContentsForSite()` still falls back to the seed (lazily) when
 * D1 is empty or unreachable, so the strip renders identically.
 */
export async function ColumnStrip({ kind, activeId, lang }: { kind: ContentKind; activeId: number; lang: Lang }) {
  const base = baseOf(lang);
  const href = COLUMN_HREF[kind] ?? "/";
  const columns = await getContentsForSite(kind);

  return (
    <div className="mb-2 grid grid-cols-2 overflow-hidden rounded border border-[#e5e7eb] bg-[#f3f4f6] md:grid-cols-4">
      {columns.map((column) => {
        const isActive = column.sourceId === activeId;
        const name = lang === "zh" ? contentNameZh(column.sourceId) ?? column.name : column.name;

        return (
          <Link
            key={column.sourceId}
            href={`${base}${href}?id=${column.sourceId}`}
            className={`px-3 py-3.5 text-center text-[13px] font-bold transition-colors ${
              isActive
                ? "bg-[#c8102e] text-white shadow-sm"
                : "bg-[#f3f4f6] text-[#374151] hover:bg-[#c8102e] hover:text-white"
            }`}
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}
