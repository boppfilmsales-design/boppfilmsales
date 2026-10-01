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
 *
 * 2026-10-01: extended twice.
 *   · Download Center + the remaining Classic Cases columns
 *   · About Us (关于我们): all seven columns, so 公司简介 / 主营产品 / 荣誉资质 /
 *     企业文化 / 分公司 / 工厂与仓库 / 发展历程 are edited as articles. They used
 *     to be a single opaque rich-text blob per column with no list and no
 *     "添加信息" button, which is the design the operator reported as unusable.
 */
export type ArticleColumn = {
  sourceId: number;
  /** Which public section the column lives in (drives breadcrumb + tab strip). */
  kind: "about" | "cases" | "service" | "down";
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
  // ── 关于我们 / About Us ─────────────────────────────────────────────────
  13: {
    sourceId: 13,
    kind: "about",
    slug: "about-us",
    nameEn: "About Us",
    nameZh: "关于我们",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  55: {
    sourceId: 55,
    kind: "about",
    slug: "main-products",
    nameEn: "Main Products",
    nameZh: "主营产品",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  16: {
    sourceId: 16,
    kind: "about",
    slug: "honor",
    nameEn: "Honor",
    nameZh: "荣誉资质",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  56: {
    sourceId: 56,
    kind: "about",
    slug: "culture",
    nameEn: "Culture",
    nameZh: "企业文化",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  169: {
    sourceId: 169,
    kind: "about",
    slug: "branch-companies",
    nameEn: "Branch Companies",
    nameZh: "分公司",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  171: {
    sourceId: 171,
    kind: "about",
    slug: "factory-warehouse",
    nameEn: "Factory & Warehouse",
    nameZh: "工厂与仓库",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },
  172: {
    sourceId: 172,
    kind: "about",
    slug: "course",
    nameEn: "Course",
    nameZh: "发展历程",
    sectionEn: "About Us",
    sectionZh: "关于我们",
    href: "/about",
  },

  // ── 案例 / Classic Cases ───────────────────────────────────────────────
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

  // ── 服务 / Service Center ──────────────────────────────────────────────
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

  // ── 下载中心 / Download Center ─────────────────────────────────────────
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
  about: 13,
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
