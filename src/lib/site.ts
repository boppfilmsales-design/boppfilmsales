import siteSeed from "@/data/site-seed.json";
import validFilesList from "@/data/valid-files.json";

export type PdfRef = { file: string; label: string };

export type SiteProduct = {
  sourceId: string;
  title: string;
  titleZh: string;
  code: string;
  price: string;
  gallery: string[];
  bodyHtml: string;
  bodyHtmlZh: string;
  pdfs: PdfRef[];
};

export type SiteSubCategory = {
  sourceId: number;
  name: string;
  items: SiteProduct[];
};

export type SiteCategory = {
  sourceId: number;
  name: string;
  subs: SiteSubCategory[];
};

export type SiteContent = {
  kind: "about" | "down" | "lines" | "honor" | "service" | "cases";
  sourceId: number;
  name: string;
  items: unknown;
  itemsZh: unknown;
  bodyHtmlZh?: string;
  entries?: ContentEntry[];
};

export type DownloadRow = {
  name: string;
  serial: string;
  format: string;
  date: string;
  file?: string;
};

export type HonorItem = { image: string; title: string; titleZh?: string };

export type ContentEntry = {
  kind: string;
  columnId: number;
  sourceId: number;
  title: string;
  date: string;
  bodyHtml: string;
  images: string[];
  externalUrl?: string;
  isLink?: boolean;
  name?: string;
  bodyHtmlZh?: string;
  titleZh?: string;
};

const products = (siteSeed as { products: SiteCategory[] }).products ?? [];
const contents = ((siteSeed as { contents: SiteContent[] }).contents ?? []) as SiteContent[];

export const SITE = {
  name: "Asia Pacific Industry Group Co., Limited",
  nameZh: "亚太工业集团有限公司",
  tel: "86-551-64687285",
  mobile: "86-18919654871",
  email: "sales@boppfilmsales.com",
  email2: "admin@apigcl.com",
  address: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA",
  skype: ["asiapacificsale", "boppfilmsales", "boppfilmsale"],
  qq: ["840715367", "2538474128", "156641365", "2500526557"],
  whatsapp: ["18919654871", "18919659471", "18955113807"],
};

export function productImageUrl(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/products/${source}`;
}

export function contentImageUrl(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/content/${source}`;
}

export function getCategories(): SiteCategory[] {
  return products;
}

export function getCategory(id: string | number): SiteCategory | undefined {
  const value = String(id);
  return products.find((c) => String(c.sourceId) === value);
}

export function findProduct(
  catId: string,
  itemId: string,
): { category: SiteCategory; sub: SiteSubCategory; product: SiteProduct } | null {
  const category = getCategory(catId);
  if (!category) return null;
  for (const sub of category.subs) {
    const product = sub.items.find((p) => String(p.sourceId) === String(itemId));
    if (product) return { category, sub, product };
  }
  return null;
}

export function allProducts(): { category: SiteCategory; sub: SiteSubCategory; product: SiteProduct }[] {
  const out: { category: SiteCategory; sub: SiteSubCategory; product: SiteProduct }[] = [];
  for (const category of products) {
    for (const sub of category.subs) {
      for (const product of sub.items) out.push({ category, sub, product });
    }
  }
  return out;
}

export function productCount(category?: SiteCategory): number {
  if (category) return category.subs.reduce((sum, s) => sum + s.items.length, 0);
  return products.reduce((sum, c) => sum + productCount(c), 0);
}

/** Real product titles belonging to a category (used for family cards). */
export function categoryProductNames(category: SiteCategory, limit = 3): string[] {
  const names: string[] = [];
  for (const sub of category.subs) {
    for (const item of sub.items) {
      const title = (item.title || "").trim();
      if (title) names.push(title);
      if (names.length >= limit) return names;
    }
  }
  return names;
}

/** Chinese counterpart of categoryProductNames (falls back to the English title). */
export function categoryProductNamesZh(category: SiteCategory, limit = 3): string[] {
  const names: string[] = [];
  for (const sub of category.subs) {
    for (const item of sub.items) {
      const title = (item.titleZh || item.title || "").trim();
      if (title) names.push(title);
      if (names.length >= limit) return names;
    }
  }
  return names;
}

/** One representative product per family that actually has a photo. */
export function featuredProducts(limit = 10): { category: SiteCategory; product: SiteProduct }[] {
  const out: { category: SiteCategory; product: SiteProduct }[] = [];
  for (const category of products) {
    for (const sub of category.subs) {
      const withImage = sub.items.find((p) => (p.gallery ?? []).length > 0);
      if (withImage) {
        out.push({ category, product: withImage });
        break;
      }
    }
    if (out.length >= limit) break;
  }
  return out;
}

/** All product photos across the catalogue (used for the factory gallery). */
export function catalogueImages(limit = 12): { src: string; title: string }[] {
  const out: { src: string; title: string }[] = [];
  for (const category of products) {
    for (const sub of category.subs) {
      for (const item of sub.items) {
        for (const img of item.gallery ?? []) {
          out.push({ src: productImageUrl(img), title: item.title || category.name });
          if (out.length >= limit) return out;
        }
      }
    }
  }
  return out;
}

export function getContents(kind?: SiteContent["kind"]): SiteContent[] {
  if (kind === undefined) return contents;
  return contents.filter((c) => c.kind === kind);
}

export function getContent(kind: SiteContent["kind"], sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => c.kind === kind && String(c.sourceId) === String(sourceId));
}

export function getContentBySourceId(sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => String(c.sourceId) === String(sourceId));
}

export function allDownloads(): { column: string; rows: DownloadRow[] }[] {
  return getContents("down").map((c) => ({
    column: c.name,
    rows: (Array.isArray(c.items) ? (c.items as DownloadRow[]) : []).filter((r) => r && r.name),
  }));
}

// ---- Valid PDF / file validation ----
const VALID_FILES = new Set<string>(validFilesList as string[]);

export function isValidFile(file: string): boolean {
  if (!file) return false;
  const name = file.split("/").pop() || file;
  return VALID_FILES.has(name);
}

export function validProductPdfs(
  product: SiteProduct,
): { label: string; file: string }[] {
  return (product.pdfs ?? []).filter((p) => isValidFile(p.file));
}

export function allPdfs(): { label: string; file: string; product: string }[] {
  const out: { label: string; file: string; product: string }[] = [];
  for (const { category, product } of allProducts()) {
    for (const pdf of validProductPdfs(product)) {
      out.push({ label: pdf.label, file: pdf.file, product: product.title || category.name });
    }
  }
  for (const group of allDownloads()) {
    for (const row of group.rows) {
      if (row.file && isValidFile(row.file)) {
        out.push({ label: row.name, file: row.file, product: group.column });
      }
    }
  }
  return out;
}

export function honorItems(): HonorItem[] {
  const out: HonorItem[] = [];
  for (const c of getContents("honor")) {
    if (Array.isArray(c.items)) {
      out.push(
        ...(c.items as Array<{ image?: string; title?: string; titleZh?: string }>)
          .filter((i) => i && i.image)
          .map((i) => ({ image: i.image as string, title: i.title ?? "", titleZh: i.titleZh })),
      );
    }
  }
  return out;
}

export function honorItemsByColumn(sourceId: number, lang?: "en" | "zh"): HonorItem[] {
  const c = getContent("honor", sourceId);
  if (!c) return [];
  const raw = lang === "zh" && Array.isArray(c.itemsZh) ? c.itemsZh : c.items;
  if (!Array.isArray(raw)) return [];
  return (raw as Array<{ image?: string; title?: string; titleZh?: string }>)
    .filter((i) => i && i.image)
    .map((i) => ({ image: i.image as string, title: i.title ?? "", titleZh: i.titleZh }));
}

export function contentEntries(
  kind: SiteContent["kind"],
  sourceId?: number,
): ContentEntry[] {
  const sections = getContents(kind);
  const target = sourceId
    ? sections.find((c) => c.sourceId === sourceId)
    : sections[0];
  if (!target) return [];
  const entries = (target as Record<string, unknown>).entries;
  return Array.isArray(entries) ? (entries as ContentEntry[]) : [];
}

export function contentBody(
  content: SiteContent | undefined,
  lang: "en" | "zh",
): string {
  if (!content) return "";
  if (lang === "zh") {
    const zh = (content.itemsZh ?? {}) as { bodyHtml?: string };
    const inline = content.bodyHtmlZh ?? "";
    return zh.bodyHtml || inline || (content.items as { bodyHtml?: string })?.bodyHtml || "";
  }
  return ((content.items ?? {}) as { bodyHtml?: string })?.bodyHtml ?? "";
}

export function contentImages(content: SiteContent | undefined): string[] {
  if (!content) return [];
  const items = (content.items ?? {}) as { images?: string[] };
  return items.images ?? [];
}

/** Chinese display names for the 18 product families (mirrors apigcl.com/ch). */
export const CATEGORY_ZH: Record<number, string> = {
  34: "BOPET薄膜（聚酯薄膜）",
  48: "BOPP薄膜（聚丙烯薄膜）",
  57: "BOPP封箱胶带母卷",
  58: "BOPP/BOPET预涂膜",
  59: "POF收缩膜（聚烯烃）",
  60: "BOPS窗口信封膜",
  61: "CPP薄膜",
  62: "PE、PVC薄膜",
  64: "复印纸、相纸",
  65: "铝箔及钢材",
  67: "不干胶标签及条码碳带",
  68: "自粘撕裂带",
  69: "撕裂扣及捆扎带",
  70: "BOPS片材",
  152: "BOPA薄膜",
  178: "薄膜设备生产线",
  184: "安装与维护工程师",
  200: "电流互感器",
};

export function categoryNameZh(sourceId: number | string): string | undefined {
  return CATEGORY_ZH[Number(sourceId)];
}

/** Chinese names for content columns (about/service/lines/honor/cases sidebars). */
export const CONTENT_NAME_ZH: Record<number, string> = {
  // about
  13: "关于我们",
  55: "主营产品",
  16: "荣誉",
  56: "企业文化",
  169: "分公司",
  171: "工厂与仓储",
  172: "发展历程",
  // service
  79: "实用链接服务",
  141: "公司公告",
  148: "实用知识",
  199: "船公司航线",
  // lines
  45: "包装薄膜生产线",
  142: "BOPP薄膜生产线",
  143: "BOPET薄膜生产线",
  144: "胶带生产线",
  149: "预涂膜生产线",
  164: "布鲁克纳生产线（德国）",
  165: "三菱生产线（日本）",
  167: "复印纸生产线",
  173: "镀铝膜生产线",
  174: "POF薄膜生产线",
  // honor
  17: "证书",
  50: "致客户",
  51: "认证报告",
  // cases
  54: "发展案例",
  145: "致买家",
  146: "致市场",
  147: "致自己",
};

export function contentNameZh(sourceId: number | string): string | undefined {
  return CONTENT_NAME_ZH[Number(sourceId)];
}

/** Chinese company-profile intro used on the Chinese homepage (source sid=13). */
export function homeAboutZhHtml(): string {
  const content = getContent("about", 13);
  return contentBody(content, "zh") || "";
}

export function stripHtml(value: string, max = 220): string {
  const text = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
