import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { buildPostValues, type PostPayload } from "@/lib/post-payload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  // Never let a database outage look like "the column is empty": surface the
  // real error (e.g. Neon 402 quota exceeded) so the admin can act on it.
  try {
    return await listPostsForAdmin(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin/posts GET]", message);
    return Response.json(
      {
        ok: false,
        error: message,
        items: [],
        categories: [],
        resolvedCategoryId: null,
        total: 0,
        page: 1,
        perPage: 20,
        pages: 1,
      },
      { status: 500 },
    );
  }
}

async function listPostsForAdmin(request: Request) {
  await ensureSeedData();

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(5, Number.parseInt(url.searchParams.get("perPage") ?? "20", 10) || 20));
  const categoryParam =
    url.searchParams.get("categoryId") ??
    url.searchParams.get("sourceId") ??
    url.searchParams.get("c_id");
  const keyword = (url.searchParams.get("q") ?? "").trim();

  // The admin sidebar addresses columns by their *legacy* source id
  // (41 / 49 / 52), while `news_posts.category_id` is the serial FK into
  // `news_categories.id` (1 / 2 / 3). Resolve either form, otherwise the
  // column filter never matches and every news column looks empty.
  const allCategories = await db
    .select()
    .from(newsCategories)
    .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));

  let resolvedCategoryId: number | undefined;
  if (categoryParam && categoryParam !== "all") {
    const numeric = Number.parseInt(categoryParam, 10);
    if (Number.isInteger(numeric)) {
      resolvedCategoryId =
        allCategories.find((c) => c.id === numeric)?.id ??
        allCategories.find((c) => c.sourceId === numeric)?.id;
    }
  }

  const filters: SQL[] = [];
  if (resolvedCategoryId !== undefined) {
    filters.push(eq(newsPosts.categoryId, resolvedCategoryId));
  }
  if (keyword) {
    const term = `%${keyword}%`;
    const like = or(ilike(newsPosts.title, term), ilike(newsPosts.bodyText, term));
    if (like) filters.push(like);
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(newsPosts).where(where);
  const items = await db
    .select({
      id: newsPosts.id,
      categoryId: newsPosts.categoryId,
      title: newsPosts.title,
      listDate: newsPosts.listDate,
      newsDate: newsPosts.newsDate,
      excerpt: newsPosts.excerpt,
      image: newsPosts.image,
      isPublished: newsPosts.isPublished,
      sourceId: newsPosts.sourceId,
      updatedAt: newsPosts.updatedAt,
    })
    .from(newsPosts)
    .where(where)
    .orderBy(desc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`), desc(newsPosts.id))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return Response.json({
    ok: true,
    items,
    categories: allCategories,
    /** The DB id the requested column resolved to (null when "all"/unknown). */
    resolvedCategoryId: resolvedCategoryId ?? null,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  const payload = (await request.json().catch(() => ({}))) as PostPayload;
  try {
    const values = buildPostValues(payload, true);
    const [created] = await db
      .insert(newsPosts)
      .values(values as typeof newsPosts.$inferInsert)
      .returning({ id: newsPosts.id });
    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to create the article." },
      { status: 400 },
    );
  }
}
