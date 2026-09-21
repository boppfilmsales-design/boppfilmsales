import siteSeedJson from "@/data/site-seed.json";
import validFilesList from "@/data/valid-files.json";

export type PdfRef = { file: string; label: string };

/** One product exactly as it is published on the legacy product_show.php page. */
export type ProductItem = {
  sourceId: number;
  catId: number;
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  code: string;
  price: string;
  gallery: string[];
  description: string;
  descriptionZh: string;
  technical: string;
  technicalZh: string;
  offer: string;
  offerZh: string;
  /** Alias of `description`, kept for the legacy card summaries. */
  bodyHtml: string;
  bodyHtmlZh: string;
  pdfs: PdfRef[];
};

export type ProductSub = {
  sourceId: number;
  name: string;
  nameZh: string;
  itemIds: number[];
  items: ProductItem[];
};

export type ProductFamily = {
  sourceId: number;
  name: string;
  nameZh: string;
  /** Product ids in the same order as the legacy `product.php?c_id=<family>` list. */
  itemIds: number[];
  subs: ProductSub[];
};

export type DownloadRow = {
  name: string;
  serial: string;
  format: string;
  date: string;
  bodyHtml?: string;
  file?: string;
};

export type ContentCard = {
  sourceId: number;
  title: string;
  titleZh?: string;
  image: string;
  externalUrl?: string;
  hot?: boolean;
};

export type ContentEntry = {
  kind: string;
  columnId: number;
  sourceId: number;
  title: string;
  titleZh?: string;
  date: string;
  dateZh?: string;
  bodyHtml: string;
  bodyHtmlZh?: string;
  images: string[];
  externalUrl?: string;
  isLink?: boolean;
  name?: string;
};

export type SiteContent = {
  kind: 'about' | 'down' | 'lines' | 'honor' | 'service' | 'cases';
  sourceId: number;
  name: string;
  nameZh: string;
  items: unknown;
  itemsZh?: unknown;
  entries?: ContentEntry[];
};

/* Legacy aliases so existing components keep compiling. */
export type SiteProduct = ProductItem;
export type SiteSubCategory = ProductSub;
export type SiteCategory = ProductFamily;
export type HonorItem = ContentCard;

type Seed = {
  products: ProductFamily[];
  items: Record<string, ProductItem>;
  contents: SiteContent[];
};

const seed = siteSeedJson as unknown as Seed;
const families: ProductFamily[] = seed.products ?? [];
const itemsById: Record<string, ProductItem> = seed.items ?? {};
const contents: SiteContent[] = seed.contents ?? [];

export const SITE = {
  name: "Asia Pacific Industry Group Co., Limited",
  nameZh: "亚太工业集团有限公司",
  tel: "86-551-64687285",
  mobile: "86-18919654871",
  email: "sales@boppfilmsales.com",
  email2: "admin@apigcl.com",
  address: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA",
  skype: ["asiapacificsale", "boppfilmsales", "boppfilm sale"],
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

/* ------------------------------ catalogue ------------------------------ */

export function itemKey(catId: number | string, itemId: number | string): string {
  return `${catId}:${itemId}`;
}

export function getCategories(): ProductFamily[] {
  return families;
}

export function getCategory(id: string | number): ProductFamily | undefined {
  const value = String(id);
  return families.find((c) => String(c.sourceId) === value);
}

export function getItem(catId: string | number, itemId: string | number): ProductItem | undefined {
  return itemsById[itemKey(catId, itemId)];
}

/** Products of a family, in the legacy list order (10 per page on the source site). */
export function familyProducts(family: ProductFamily): ProductItem[] {
  const ordered = (family.itemIds ?? [])
    .map((id) => itemsById[itemKey(family.sourceId, id)])
    .filter(Boolean) as ProductItem[];
  if (ordered.length) return ordered;
  return family.subs.flatMap((sub) => sub.items);
}

export function subProducts(sub: ProductSub): ProductItem[] {
  const ordered = (sub.itemIds ?? [])
    .map((id) => itemsById[itemKey(sub.sourceId, id)])
    .filter(Boolean) as ProductItem[];
  return ordered.length ? ordered : sub.items;
}

export function getSub(category: ProductFamily, subId: string | number): ProductSub | undefined {
  return category.subs.find((sub) => String(sub.sourceId) === String(subId));
}

export function subOfItem(item: ProductItem): ProductSub | undefined {
  const family = getCategory(item.catId);
  if (!family) return undefined;
  return family.subs.find((sub) => sub.items.some((p) => p.sourceId === item.sourceId)) ?? getSub(family, item.catId);
}

export function findProduct(
  catId: string,
  itemId: string,
): { category: ProductFamily; sub: ProductSub | undefined; product: ProductItem } | null {
  const category = getCategory(catId);
  if (!category) return null;
  const product = getItem(catId, itemId) ?? category.subs.flatMap((sub) => sub.items).find((p) => String(p.sourceId) === String(itemId));
  if (!product) return null;
  const sub = category.subs.find((s) => s.items.some((p) => p.sourceId === product.sourceId));
  return { category, sub, product };
}

export function allProducts(): { category: ProductFamily; sub: ProductSub; product: ProductItem }[] {
  const out: { category: ProductFamily; sub: ProductSub; product: ProductItem }[] = [];
  for (const category of families) {
    for (const sub of category.subs) {
      for (const product of sub.items) out.push({ category, sub, product });
    }
  }
  return out;
}

export function productCount(category?: ProductFamily): number {
  if (category) return familyProducts(category).length;
  return families.reduce((sum, c) => sum + productCount(c), 0);
}

export function categoryProductNames(category: ProductFamily, limit = 3): string[] {
  return familyProducts(category).slice(0, limit).map((item) => item.title).filter(Boolean);
}

export function categoryProductNamesZh(category: ProductFamily, limit = 3): string[] {
  return familyProducts(category)
    .slice(0, limit)
    .map((item) => item.titleZh || item.title)
    .filter(Boolean);
}

export function featuredProducts(limit = 10): { category: ProductFamily; product: ProductItem }[] {
  const out: { category: ProductFamily; product: ProductItem }[] = [];
  for (const category of families) {
    const product = familyProducts(category).find((p) => (p.gallery ?? []).length > 0);
    if (product) out.push({ category, product });
    if (out.length >= limit) break;
  }
  return out;
}

export function catalogueImages(limit = 12): { src: string; title: string }[] {
  const out: { src: string; title: string }[] = [];
  for (const category of families) {
    for (const product of familyProducts(category)) {
      for (const image of product.gallery ?? []) {
        out.push({ src: productImageUrl(image), title: product.title || category.name });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/* ------------------------------- content ------------------------------- */

export function getContents(kind?: SiteContent['kind']): SiteContent[] {
  if (kind === undefined) return contents;
  return contents.filter((c) => c.kind === kind);
}

export function getContent(kind: SiteContent['kind'], sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => c.kind === kind && String(c.sourceId) === String(sourceId));
}

export function getContentBySourceId(sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => String(c.sourceId) === String(sourceId));
}

export function contentCards(content: SiteContent | undefined): ContentCard[] {
  if (!content || !Array.isArray(content.items)) return [];
  return (content.items as ContentCard[]).filter((card) => card && (card.title || card.image));
}

export function contentEntries(kind: SiteContent['kind'], sourceId?: number): ContentEntry[] {
  const column = sourceId ? getContent(kind, sourceId) : getContents(kind)[0];
  return column?.entries ?? [];
}

export function findEntry(kind: string, columnId: number | string, sourceId: number | string): ContentEntry | undefined {
  const column = getContent(kind as SiteContent['kind'], columnId);
  return column?.entries?.find((entry) => String(entry.sourceId) === String(sourceId));
}

export function contentBody(content: SiteContent | undefined, lang: 'en' | 'zh'): string {
  if (!content) return '';
  const items = (content.items ?? {}) as { bodyHtml?: string };
  if (lang === 'zh') {
    const zh = (content.itemsZh ?? {}) as { bodyHtml?: string };
    return zh.bodyHtml || items.bodyHtml || '';
  }
  return items.bodyHtml ?? '';
}

export function contentImages(content: SiteContent | undefined): string[] {
  if (!content) return [];
  return ((content.items ?? {}) as { images?: string[] }).images ?? [];
}

export function allDownloads(): { sourceId: number; column: string; columnZh: string; rows: DownloadRow[] }[] {
  return getContents('down').map((content) => ({
    sourceId: content.sourceId,
    column: content.name,
    columnZh: content.nameZh,
    rows: (Array.isArray(content.items) ? (content.items as DownloadRow[]) : []).filter((row) => row && row.name),
  }));
}

export function categoryNameZh(sourceId: number | string): string | undefined {
  return getCategory(sourceId)?.nameZh || CATEGORY_ZH[Number(sourceId)];
}

export function subNameZh(sub: ProductSub): string {
  return sub.nameZh || sub.name;
}

export function contentNameZh(sourceId: number | string): string | undefined {
  return getContentBySourceId(sourceId)?.nameZh || CONTENT_NAME_ZH[Number(sourceId)];
}

export function homeAboutZhHtml(): string {
  return contentBody(getContent('about', 13), 'zh') || '';
}

export function stripHtml(value: string, max = 220): string {
  const text = (value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/* --------------------------------- files -------------------------------- */

const VALID_FILES = new Set<string>(validFilesList as string[]);

export function isValidFile(file: string): boolean {
  if (!file) return false;
  const name = file.split('/').pop() || file;
  return VALID_FILES.has(name);
}

export function validProductPdfs(product: ProductItem): PdfRef[] {
  return (product.pdfs ?? []).filter((pdf) => pdf?.file && isValidFile(pdf.file));
}

export function allPdfs(): { label: string; file: string; product: string }[] {
  const out: { label: string; file: string; product: string }[] = [];
  const seen = new Set<string>();
  for (const { category, product } of allProducts()) {
    for (const pdf of validProductPdfs(product)) {
      if (pdf.file && !seen.has(pdf.file)) {
        seen.add(pdf.file);
        out.push({ label: pdf.label, file: pdf.file, product: product.title || category.name });
      }
    }
  }
  return out;
}

export const CATEGORY_ZH: Record<number, string> = {
  34: 'BOPET薄膜（聚酯薄膜）', 48: 'BOPP薄膜（聚丙烯薄膜）', 57: 'BOPP封箱胶带母卷',
  58: 'BOPP/BOPET预涂膜', 59: 'POF收缩膜（聚烯烃）', 60: 'BOPS窗口信封膜',
  61: 'CPP薄膜', 62: 'PE、PVC薄膜', 64: '复印纸、相纸', 65: '铝箔及钢材',
  67: '不干胶标签及条码碳带', 68: '自粘撕裂带', 69: '撕裂扣及捆扎带', 70: 'BOPS片材',
  152: 'BOPA薄膜', 178: '薄膜设备生产线', 184: '安装与维护工程师', 200: '电流互感器',
};

export const CONTENT_NAME_ZH: Record<number, string> = {
  13: '关于我们', 55: '主营产品', 16: '荣誉', 56: '企业文化', 169: '分公司',
  171: '工厂与仓储', 172: '发展历程', 202: 'SEAGULL_LFI_TEST',
  17: '证书', 50: '致客户', 51: '认证报告',
  79: '实用链接服务', 141: '公司公告', 148: '实用知识', 199: '船公司航线',
  45: '包装薄膜生产线', 142: 'BOPP薄膜生产线', 143: 'BOPET薄膜生产线', 144: '胶带生产线',
  149: '预涂膜生产线', 164: '布鲁克纳生产线（德国）', 165: '三菱生产线（日本）',
  167: '复印纸生产线', 173: '镀铝膜生产线', 174: 'POF薄膜生产线',
  54: '发展案例', 145: '致买家', 146: '致市场', 147: '致自己',
  43: '公司公告', 76: '技术资料下载', 157: '证书下载', 158: 'MSDS下载',
};

