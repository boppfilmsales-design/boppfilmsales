import siteSeedJson from "@/data/site-seed.json";
import validFilesList from "@/data/valid-files.json";
import {
  contentNameZh,
  productImageUrl,
  stripHtml,
  subNameZh,
} from "./site-helpers";

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

/* Re-export helpers that components still import from this file. */
export {
  SITE,
  productImageUrl,
  contentImageUrl,
  stripHtml,
  CATEGORY_ZH,
  CONTENT_NAME_ZH,
  categoryNameZh,
  contentNameZh,
  subNameZh,
} from "./site-helpers";

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

export function homeAboutZhHtml(): string {
  return contentBody(getContent('about', 13), 'zh') || '';
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

/* --------------------------------- lines -------------------------------- */

export function getProductLines(): SiteContent[] {
  return getContents('lines');
}

export function getProductLineContent(sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => c.kind === 'lines' && String(c.sourceId) === String(sourceId));
}
