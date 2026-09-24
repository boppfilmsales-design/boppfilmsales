import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { getCategory, getItem, type ProductFamily, type ProductItem, type ProductSub } from "@/lib/site";

function parseArray<T>(value: string, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : fallback;
  } catch {
    return fallback;
  }
}

function productFromRow(row: typeof adminProducts.$inferSelect, fallback?: ProductItem): ProductItem {
  return {
    sourceId: row.sourceId,
    catId: row.categoryId,
    title: row.title,
    titleZh: row.titleZh || fallback?.titleZh || "",
    summary: row.subtitle,
    summaryZh: row.subtitleZh || fallback?.summaryZh || "",
    code: row.code,
    price: row.price,
    gallery: parseArray(row.galleryJson, row.image ? [row.image] : fallback?.gallery ?? []),
    description: row.description || row.bodyHtml || fallback?.description || "",
    descriptionZh: row.descriptionZh || fallback?.descriptionZh || "",
    technical: row.technical || fallback?.technical || "",
    technicalZh: row.technicalZh || fallback?.technicalZh || "",
    offer: row.offer || fallback?.offer || "",
    offerZh: row.offerZh || fallback?.offerZh || "",
    bodyHtml: row.bodyHtml || row.description || fallback?.bodyHtml || "",
    bodyHtmlZh: row.bodyHtmlZh || fallback?.bodyHtmlZh || "",
    pdfs: parseArray(row.pdfsJson, fallback?.pdfs ?? []),
  };
}

export async function getCategoryForSite(catId: string | number): Promise<ProductFamily | undefined> {
  const fallback = getCategory(catId);
  if (!fallback) return undefined;
  try {
    await ensureSeedData();
    const rows = await db.select().from(adminProducts)
      .where(eq(adminProducts.familyId, fallback.sourceId))
      .orderBy(asc(adminProducts.sort), asc(adminProducts.sourceId));
    if (rows.length === 0) return fallback;

    const knownItems = new Map<number, ProductItem>();
    for (const sub of fallback.subs) {
      for (const item of sub.items) knownItems.set(item.sourceId, item);
    }
    const subMap = new Map<number, ProductSub>();
    for (const sub of fallback.subs) subMap.set(sub.sourceId, { ...sub, items: [], itemIds: [] });
    for (const row of rows) {
      const product = productFromRow(row, knownItems.get(row.sourceId));
      const sub = subMap.get(row.categoryId) ?? {
        sourceId: row.categoryId,
        name: `Products ${row.categoryId}`,
        nameZh: `产品分类 ${row.categoryId}`,
        itemIds: [],
        items: [],
      };
      sub.items.push(product);
      sub.itemIds.push(product.sourceId);
      subMap.set(row.categoryId, sub);
    }
    // Keep every declared sub-category, even one whose products were all moved
    // away. Dropping empties made `/products/<cat>/list/<sub>` 404 for a
    // category the admin had just re-filed, and also hid the sub from the
    // family strip so it could not be navigated to at all.
    return {
      ...fallback,
      subs: Array.from(subMap.values()),
      itemIds: rows.map((row) => row.sourceId),
    };
  } catch (error) {
    console.error("[catalogue-db] falling back to site seed", error);
    return fallback;
  }
}

export async function getProductForSite(catId: string | number, itemId: string | number): Promise<{
  category: ProductFamily;
  sub: ProductSub | undefined;
  product: ProductItem;
} | null> {
  const category = await getCategoryForSite(catId);
  if (!category) return null;
  const product = category.subs.flatMap((sub) => sub.items)
    .find((item) => String(item.sourceId) === String(itemId));
  if (!product) {
    const fallback = getItem(catId, itemId);
    if (!fallback) return null;
    return {
      category,
      sub: category.subs.find((sub) => sub.items.some((item) => item.sourceId === fallback.sourceId)),
      product: fallback,
    };
  }
  return {
    category,
    sub: category.subs.find((sub) => sub.items.some((item) => item.sourceId === product.sourceId)),
    product,
  };
}
