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
  await ensureSeedData();

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(100, Math.max(5, Number.parseInt(url.searchParams.get("perPage") ?? "20", 10) || 20));
  const categoryParam = url.searchParams.get("categoryId");
  const keyword = (url.searchParams.get("q") ?? "").trim();

  const filters: SQL[] = [];
  if (categoryParam && categoryParam !== "all") {
    filters.push(eq(newsPosts.categoryId, Number.parseInt(categoryParam, 10)));
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

  const categories = await db
    .select()
    .from(newsCategories)
    .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));

  return Response.json({
    ok: true,
    items,
    categories,
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
