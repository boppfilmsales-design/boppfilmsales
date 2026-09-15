import { getAdminSections } from "@/lib/admin-columns";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const sections = getAdminSections();

  // Enrich news-db columns with actual post counts from the database.
  // Wrap in try/catch so a transient DB failure doesn't crash the entire
  // admin panel — the static itemCount (0) will be shown instead.
  try {
    for (const section of sections) {
      for (const col of section.columns) {
        if (col.dataSource === "news-db") {
          const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(newsPosts)
            .where(eq(newsPosts.sourceId, col.sourceId));
          col.itemCount = result[0]?.count ?? 0;
        }
      }
    }
  } catch (err) {
    console.error("[admin/sections] DB count failed, using static counts:", err);
  }

  return Response.json({ ok: true, sections });
}
