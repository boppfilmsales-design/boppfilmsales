import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";

export const PER_PAGE = 12;

export type CategoryRow = typeof newsCategories.$inferSelect;
export type PostRow = typeof newsPosts.$inferSelect;

export async function getCategories(): Promise<CategoryRow[]> {
  await ensureSeedData();
  return db.select().from(newsCategories).orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));
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

export async function listPosts(options: {
  categoryId?: number;
  page?: number;
  perPage?: number;
  search?: string;
  includeUnpublished?: boolean;
}): Promise<ListResult> {
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
}

export async function getPostById(id: number): Promise<PostRow | null> {
  await ensureSeedData();
  const rows = await db.select().from(newsPosts).where(eq(newsPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getNeighbourPosts(post: PostRow) {
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
}

export async function getCategoryCounts(): Promise<Record<number, number>> {
  await ensureSeedData();
  const rows = await db
    .select({ categoryId: newsPosts.categoryId, total: count() })
    .from(newsPosts)
    .where(eq(newsPosts.isPublished, true))
    .groupBy(newsPosts.categoryId);
  return Object.fromEntries(rows.map((row) => [row.categoryId, Number(row.total)]));
}

export async function getLatestPosts(limit = 6) {
  await ensureSeedData();
  return db
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
