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
};

export type DownloadRow = {
  name: string;
  serial: string;
  format: string;
  date: string;
  file?: string;
};

export type HonorItem = { image: string; title: string };

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

export function getContents(kind: SiteContent["kind"]): SiteContent[] {
  return contents.filter((c) => c.kind === kind);
}

export function getContent(kind: SiteContent["kind"], sourceId: number | string): SiteContent | undefined {
  return contents.find((c) => c.kind === kind && String(c.sourceId) === String(sourceId));
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
    if (Array.isArray(c.items)) out.push(...(c.items as HonorItem[]).filter((i) => i && i.image));
  }
  return out;
}

export function honorItemsByColumn(sourceId: number): HonorItem[] {
  const c = getContent("honor", sourceId);
  if (!c || !Array.isArray(c.items)) return [];
  return (c.items as HonorItem[]).filter((i) => i && i.image);
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

export function stripHtml(value: string, max = 220): string {
  const text = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
