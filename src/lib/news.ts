import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData, CATEGORY_DEFS, type SeedItem } from "@/db/seed";
import newsSeedRaw from "@/data/news-seed.json";

export const PER_PAGE = 12;

export type CategoryRow = typeof newsCategories.$inferSelect;
export type PostRow = typeof newsPosts.$inferSelect;

// ---- Static fallback data (used when DB is unavailable) ----
const SEED_ITEMS = newsSeedRaw as unknown as SeedItem[];
/**
 * Slugs that belong on the public /news tabs. `development-cases` reuses the
 * news tables (so 案例 → Development Cases gets the rich-text article editor)
 * but is surfaced on /cases instead, so it must not appear as a news tab.
 */
export const PUBLIC_NEWS_SLUGS = ["industry-news", "company-news", "employees-literary"];

const STATIC_CATEGORIES: CategoryRow[] = CATEGORY_DEFS.map((c, i) => ({
  id: i + 1,
  slug: c.slug,
  name: c.name,
  sourceId: c.sourceId,
  sortOrder: c.sortOrder,
}));
const STATIC_CATEGORY_MAP = new Map(STATIC_CATEGORIES.map((c) => [c.slug, c]));
const STATIC_POSTS: PostRow[] = SEED_ITEMS.map((item, i) => {
  const cat = STATIC_CATEGORIES.find((c) => String(c.sourceId) === item.categoryId) || STATIC_CATEGORIES[0];
  const d = item.newsDate ? new Date(item.newsDate) : new Date();
  return {
    id: i + 1,
    categoryId: cat.id,
    sourceId: item.sourceId,
    title: item.title || item.listTitle || `News ${item.sourceId}`,
    listDate: item.listDate || "",
    newsDate: item.newsDate || "",
    excerpt: item.listExcerpt || "",
    bodyHtml: item.bodyHtml || "",
    bodyText: item.bodyText || "",
    image: item.image || "",
    isPublished: true,
    sortDate: d,
    createdAt: d,
    updatedAt: d,
  };
});

export async function getCategories(): Promise<CategoryRow[]> {
  try {
    await ensureSeedData();
    return await db.select().from(newsCategories).orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));
  } catch {
    return STATIC_CATEGORIES;
  }
}

/** Resolves a category by slug ("industry-news") or legacy numeric id ("41"). */
export async function resolveCategory(input?: string | null): Promise<CategoryRow | null> {
  const categories = await getCategories();
  if (categories.length === 0) return null;
  if (!input) return categories[0];
  const value = input.trim();
  const bySlug = categories.find((c) => c.slug === value);
  if (bySlug) return bySlug;
  const bySourceId = categories.find((c) => String(c.sourceId) === value);
  if (bySourceId) return bySourceId;
  const byId = categories.find((c) => String(c.id) === value);
  return byId ?? categories[0];
}

export type ListResult = {
  items: PostRow[];
  total: number;
  page: number;
  pages: number;
};

function staticListPosts(options: {
  categoryId?: number;
  page?: number;
  perPage?: number;
  search?: string;
}): ListResult {
  const perPage = options.perPage ?? PER_PAGE;
  const page = Math.max(1, options.page ?? 1);
  let items = STATIC_POSTS;
  if (options.categoryId) {
    items = items.filter((p) => p.categoryId === options.categoryId);
  }
  if (options.search && options.search.trim()) {
    const term = options.search.trim().toLowerCase();
    items = items.filter((p) =>
      p.title.toLowerCase().includes(term) ||
      p.excerpt.toLowerCase().includes(term) ||
      p.bodyText.toLowerCase().includes(term)
    );
  }
  const total = items.length;
  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function listPosts(options: {
  categoryId?: number;
  page?: number;
  perPage?: number;
  search?: string;
  includeUnpublished?: boolean;
}): Promise<ListResult> {
  try {
    await ensureSeedData();
    const perPage = options.perPage ?? PER_PAGE;
    const page = Math.max(1, options.page ?? 1);

    const filters: SQL[] = [];
    if (!options.includeUnpublished) filters.push(eq(newsPosts.isPublished, true));
    if (options.categoryId) filters.push(eq(newsPosts.categoryId, options.categoryId));
    if (options.search && options.search.trim()) {
      const term = `%${options.search.trim()}%`;
      const like = or(
        ilike(newsPosts.title, term),
        ilike(newsPosts.excerpt, term),
        ilike(newsPosts.bodyText, term),
      );
      if (like) filters.push(like);
    }
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(newsPosts)
      .where(where);

    const items = await db
      .select()
      .from(newsPosts)
      .where(where)
      .orderBy(desc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`), desc(newsPosts.id))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return { items, total, page, pages: Math.max(1, Math.ceil(total / perPage)) };
  } catch {
    return staticListPosts(options);
  }
}

export async function getPostById(id: number): Promise<PostRow | null> {
  try {
    await ensureSeedData();
    const rows = await db.select().from(newsPosts).where(eq(newsPosts.id, id)).limit(1);
    return rows[0] ?? null;
  } catch {
    return STATIC_POSTS.find((p) => p.id === id) ?? null;
  }
}

export async function getNeighbourPosts(post: PostRow) {
  try {
    const [prev] = await db
      .select({ id: newsPosts.id, title: newsPosts.title, categoryId: newsPosts.categoryId })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.categoryId, post.categoryId),
          sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt}) > coalesce(${post.sortDate}, ${post.createdAt})`,
        ),
      )
      .orderBy(asc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`))
      .limit(1);
    const [next] = await db
      .select({ id: newsPosts.id, title: newsPosts.title, categoryId: newsPosts.categoryId })
      .from(newsPosts)
      .where(
        and(
          eq(newsPosts.categoryId, post.categoryId),
          sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt}) < coalesce(${post.sortDate}, ${post.createdAt})`,
        ),
      )
      .orderBy(desc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`))
      .limit(1);
    return { prev: prev ?? null, next: next ?? null };
  } catch {
    const sameCat = STATIC_POSTS.filter((p) => p.categoryId === post.categoryId);
    const idx = sameCat.findIndex((p) => p.id === post.id);
    return {
      prev: idx > 0 ? { id: sameCat[idx - 1].id, title: sameCat[idx - 1].title, categoryId: sameCat[idx - 1].categoryId } : null,
      next: idx >= 0 && idx < sameCat.length - 1 ? { id: sameCat[idx + 1].id, title: sameCat[idx + 1].title, categoryId: sameCat[idx + 1].categoryId } : null,
    };
  }
}

export async function getCategoryCounts(): Promise<Record<number, number>> {
  try {
    await ensureSeedData();
    const rows = await db
      .select({ categoryId: newsPosts.categoryId, total: count() })
      .from(newsPosts)
      .where(eq(newsPosts.isPublished, true))
      .groupBy(newsPosts.categoryId);
    return Object.fromEntries(rows.map((row) => [row.categoryId, Number(row.total)]));
  } catch {
    const out: Record<number, number> = {};
    for (const p of STATIC_POSTS) {
      out[p.categoryId] = (out[p.categoryId] || 0) + 1;
    }
    return out;
  }
}

export async function getLatestPosts(limit = 6) {
  try {
    await ensureSeedData();
    return await db
      .select({
        id: newsPosts.id,
        title: newsPosts.title,
        listDate: newsPosts.listDate,
        excerpt: newsPosts.excerpt,
        image: newsPosts.image,
        categoryId: newsPosts.categoryId,
      })
      .from(newsPosts)
      .where(eq(newsPosts.isPublished, true))
      .orderBy(desc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`), desc(newsPosts.id))
      .limit(limit);
  } catch {
    return STATIC_POSTS
      .slice()
      .sort((a, b) => (b.sortDate?.getTime() || 0) - (a.sortDate?.getTime() || 0))
      .slice(0, limit)
      .map((p) => ({ id: p.id, title: p.title, listDate: p.listDate, excerpt: p.excerpt, image: p.image, categoryId: p.categoryId }));
  }
}

export function formatListDate(value: string, fallback?: Date | null): string {
  if (value && value.trim()) return value.trim();
  const date = fallback ?? new Date();
  const mm = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getUTCDate()}`.padStart(2, "0");
  return `${mm}/${dd}/${date.getUTCFullYear()}`;
}

export function toPlainExcerpt(html: string, fallback = "", max = 260): string {
  const text = html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  const source = text || fallback;
  return source.length > max ? `${source.slice(0, max)}...` : source;
}
