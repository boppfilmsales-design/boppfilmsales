import { getAdminSections } from "@/lib/admin-columns";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { adminContents, inquiries, newsCategories, newsPosts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Counts the rows a stored content column would render.
 *
 * Mirrors `extractRows()` in `/api/admin/content/[sourceId]`: a `items` array
 * counts its entries, a single-page `about` block counts as 1, and `entries`
 * is the fallback. Kept in sync deliberately — the sidebar badge must agree
 * with the table the operator sees after clicking the column.
 */
function storedRowCount(dataJson: string, kind: string): number {
  let parsed: { items?: unknown; entries?: unknown };
  try {
    parsed = JSON.parse(dataJson || "{}");
  } catch {
    return 0;
  }
  if (Array.isArray(parsed.items) && parsed.items.length > 0) return parsed.items.length;
  if (parsed.items && typeof parsed.items === "object" && !Array.isArray(parsed.items)) {
    return Object.keys(parsed.items).length > 0 ? 1 : 0;
  }
  if (Array.isArray(parsed.entries) && parsed.entries.length > 0) return parsed.entries.length;
  void kind;
  return 0;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sections = getAdminSections();

  // Enrich every column with the *real* row count from the database, falling
  // back to the static seed count when the column has no DB row yet. Without
  // this the sidebar showed 0 for the columns that only exist in the DB
  // (banner / 友情链接 / 公司介绍-首页 / General Information / Get Contacts …).
  // Wrapped in try/catch so a transient DB failure degrades to static counts
  // instead of crashing the whole panel.
  try {
    const stored = await db
      .select({ sourceId: adminContents.sourceId, kind: adminContents.kind, dataJson: adminContents.dataJson })
      .from(adminContents);
    const storedMap = new Map(stored.map((row) => [row.sourceId, row]));

    for (const section of sections) {
      for (const col of section.columns) {
        if (col.dataSource === "news-db") {
          // The sidebar addresses news columns by their *legacy* sourceId
          // (41 / 49 / 52), but `news_posts.category_id` is the serial FK to
          // `news_categories.id` (1 / 2 / 3). Filtering on `newsPosts.sourceId`
          // therefore always returned 0 — resolve through `news_categories`
          // first, exactly like `/api/admin/posts` does.
          const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(newsPosts)
            .innerJoin(newsCategories, eq(newsPosts.categoryId, newsCategories.id))
            .where(eq(newsCategories.sourceId, col.sourceId));
          col.itemCount = result[0]?.count ?? 0;
          continue;
        }
        if (col.dataSource === "inquiries") {
          const result = await db.select({ count: sql<number>`count(*)::int` }).from(inquiries);
          col.itemCount = result[0]?.count ?? 0;
          continue;
        }
        // static / products columns: prefer the live DB row when present.
        const row = storedMap.get(col.sourceId);
        if (row) col.itemCount = storedRowCount(row.dataJson, row.kind);
      }
    }
  } catch (err) {
    console.error("[admin/sections] DB count failed, using static counts:", err);
  }

  return Response.json({ ok: true, sections });
}
