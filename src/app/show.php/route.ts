import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";

export const dynamic = "force-dynamic";

/**
 * Legacy URL compatibility: http://apigcl.com/show.php?c_id=52&i_id=503
 * now permanently served by /news/employees-literary/<new id>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cId = Number.parseInt(url.searchParams.get("c_id") ?? "", 10);
  const iId = Number.parseInt(url.searchParams.get("i_id") ?? "", 10);
  await ensureSeedData();

  if (Number.isFinite(cId) && Number.isFinite(iId)) {
    const [row] = await db
      .select({ id: newsPosts.id, slug: newsCategories.slug })
      .from(newsPosts)
      .innerJoin(newsCategories, eq(newsPosts.categoryId, newsCategories.id))
      .where(and(eq(newsCategories.sourceId, cId), eq(newsPosts.sourceId, iId)))
      .limit(1);
    if (row) redirect(`/news/${row.slug}/${row.id}`);
  }
  redirect("/news");
}
