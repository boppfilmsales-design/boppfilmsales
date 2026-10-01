/**
 * Columns that are managed as *rich-text articles* (`news_posts`) instead of
 * the legacy static image/text lists.
 *
 * Admin 内容管理 → <section> → <column> then behaves exactly like
 * 新闻中心 → Employees Literary: "+ 添加信息" plus the full TipTap editor, and
 * articles are published at /news/<slug>/<id>.
 *
 * To turn another column into an article column:
 *   1. add it here
 *   2. add a matching CATEGORY_DEFS entry in `src/db/seed.ts`
 *   3. switch its AdminColumn entry in `src/lib/admin-columns.ts` to
 *      displayType "news-list" / dataSource "news-db"
 *   4. insert the category row into `news_categories`
 *      (see .zh-work/add-article-cats.mjs)
 *
 * 2026-10-01: extended to the Download Center columns. `kind` gained "down"
 * because `/downloads` needs its own breadcrumb/tab strip, and the four download
 * columns previously rendered as a flat file list with a form that could not
 * edit the body text — the "设计不行" the operator reported.
 */
export type ArticleColumn = {
  sourceId: number;
  /** Which public section the column lives in (drives breadcrumb + tab strip). */
  kind: "cases" | "service" | "down";
  /** news_categories.slug — also the detail URL: /news/<slug>/<id>. */
  slug: string;
  nameEn: string;
  nameZh: string;
  sectionEn: string;
  sectionZh: string;
  /** Public list page for the section. */
  href: string;
};

export const ARTICLE_COLUMNS: Record<number, ArticleColumn> = {
  54: {
    sourceId: 54,
    kind: "cases",
    slug: "development-cases",
    nameEn: "Development Cases",
    nameZh: "发展案例",
    sectionEn: "Classic Cases",
    sectionZh: "经典案例",
    href: "/cases",
  },
  147: {
    sourceId: 147,
    kind: "cases",
    slug: "to-ourselves",
    nameEn: "To Ourselves",
    nameZh: "致自己",
    sectionEn: "Classic Cases",
    sectionZh: "经典案例",
    href: "/cases",
  },
  // ── 2026-10-01 新增：Classic Cases 下的另外两栏 ──────────────────────────
  145: {
    sourceId: 145,
    kind: "cases",
    slug: "to-buyers",
    nameEn: "To Buyers",
    nameZh: "致买家",
    sectionEn: "Classic Cases",
    sectionZh: "经典案例",
    href: "/cases",
  },
  146: {
    sourceId: 146,
    kind: "cases",
    slug: "to-markets",
    nameEn: "To Markets",
    nameZh: "致市场",
    sectionEn: "Classic Cases",
    sectionZh: "经典案例",
    href: "/cases",
  },
  141: {
    sourceId: 141,
    kind: "service",
    slug: "company-announcement",
    nameEn: "Company Announcement",
    nameZh: "公司公告",
    sectionEn: "Service Center",
    sectionZh: "服务中心",
    href: "/service",
  },
  148: {
    sourceId: 148,
    kind: "service",
    slug: "useful-knowledge",
    nameEn: "Useful Knowledge",
    nameZh: "实用知识",
    sectionEn: "Service Center",
    sectionZh: "服务中心",
    href: "/service",
  },
  // ── 2026-10-01 新增：下载中心四栏 ────────────────────────────────────────
  43: {
    sourceId: 43,
    kind: "down",
    slug: "companys-notice",
    nameEn: "Company's Notice",
    nameZh: "公司通知",
    sectionEn: "Download",
    sectionZh: "下载中心",
    href: "/downloads",
  },
  76: {
    sourceId: 76,
    kind: "down",
    slug: "technology-data",
    nameEn: "Technology Data",
    nameZh: "技术资料",
    sectionEn: "Download",
    sectionZh: "下载中心",
    href: "/downloads",
  },
  157: {
    sourceId: 157,
    kind: "down",
    slug: "certificate-download",
    nameEn: "Certificate Download",
    nameZh: "证书下载",
    sectionEn: "Download",
    sectionZh: "下载中心",
    href: "/downloads",
  },
  158: {
    sourceId: 158,
    kind: "down",
    slug: "msds-download",
    nameEn: "MSDS Download",
    nameZh: "MSDS 下载",
    sectionEn: "Download",
    sectionZh: "下载中心",
    href: "/downloads",
  },
};

/** Fallback (still static) column for each section. */
export const DEFAULT_ARTICLE_SOURCE_ID: Record<ArticleColumn["kind"], number> = {
  cases: 54,
  service: 79,
  down: 43,
};

export function getArticleColumn(sourceId: number | undefined): ArticleColumn | null {
  if (!sourceId) return null;
  return ARTICLE_COLUMNS[sourceId] ?? null;
}

/** All article columns that belong to one public section. */
export function getArticleColumnsForKind(kind: ArticleColumn["kind"]): ArticleColumn[] {
  return Object.values(ARTICLE_COLUMNS).filter((c) => c.kind === kind);
}
