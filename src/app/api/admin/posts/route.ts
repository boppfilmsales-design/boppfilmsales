import { and, asc, desc, eq, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { guardDb } from "@/lib/api-db-error";
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
  // (13 / 16 / 41 / 49 …), while `news_posts.category_id` is the serial FK into
  // `news_categories.id`. Resolve either form, otherwise the column filter never
  // matches and every news column looks empty.
  const allCategories = await db
    .select()
    .from(newsCategories)
    .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));

  /**
   * ⚠️ 必须先按 `sourceId` 匹配，`id` 只能作为兜底 —— 顺序写反会张冠李戴。
   *
   * 2026-10-02 修复：原先写成 `find(id) ?? find(sourceId)`。因为
   * `news_categories.id` 与 `sourceId` 的取值空间重叠，数字会撞车：
   *
   *     13  = Certificate Download 的 id  = About Us 的 source_id
   *     16  = Main Products 的 id        = Honor 的 source_id
   *
   * 于是点开「关于我们 → About Us」（sourceId=13）时，第一条就命中了
   * Certificate Download，后台显示的是别的栏目的文章；在这个错误视图里编辑并
   * 保存，还会把内容写进错误的栏目。
   *
   * 后台侧边栏传的始终是 legacy sourceId，所以 sourceId 优先才是正确语义。
   */
  let resolvedCategoryId: number | undefined;
  if (categoryParam && categoryParam !== "all") {
    const numeric = Number.parseInt(categoryParam, 10);
    if (Number.isInteger(numeric)) {
      const bySource = allCategories.find((c) => c.sourceId === numeric);
      const byId = allCategories.find((c) => c.id === numeric);

      // 防复发：如果两个解释同时成立却指向不同栏目，说明又撞号了。
      // 以 sourceId 为准（后台传的就是它），但要在日志里喊一声，
      // 免得又变成"某栏目显示别人家文章"这种难查的问题。
      if (bySource && byId && bySource.id !== byId.id) {
        console.warn(
          `[admin/posts] category id ${numeric} is ambiguous: ` +
            `source_id -> "${bySource.name}" (news_categories.id=${bySource.id}), ` +
            `id -> "${byId.name}" (source_id=${byId.sourceId}). ` +
            `Using the source_id match; 新增栏目时请避开与其它栏目 id 相同的 source_id。`,
        );
      }

      resolvedCategoryId = bySource?.id ?? byId?.id;
    }
  }

  const filters: SQL[] = [];
  if (resolvedCategoryId !== undefined) {
    filters.push(eq(newsPosts.categoryId, resolvedCategoryId));
  }
  if (keyword) {
    const term = `%${keyword}%`;
    const searchFilter = or(like(newsPosts.title, term), like(newsPosts.bodyText, term));
    if (searchFilter) filters.push(searchFilter);
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(newsPosts).where(where);
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
      isPinned: newsPosts.isPinned,
      sourceId: newsPosts.sourceId,
      updatedAt: newsPosts.updatedAt,
    })
    .from(newsPosts)
    .where(where)
    .orderBy(desc(newsPosts.isPinned), desc(sql`coalesce(${newsPosts.sortDate}, ${newsPosts.createdAt})`), desc(newsPosts.id))
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

  const payload = (await request.json().catch(() => ({}))) as PostPayload;
  const unavailable = await guardDb("新建文章");
  if (unavailable) return unavailable;

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
