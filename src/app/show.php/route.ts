import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { getContent } from "@/lib/site";

export const dynamic = "force-dynamic";

const KINDS = ["about", "lines", "honor", "service", "cases"] as const;

/**
 * Legacy URL compatibility for show.php:
 *   show.php?c_id=52&i_id=503  -> /news/employees-literary/<new id>
 *   show.php?c_id=145&i_id=135 -> /entry/cases/145/135
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cId = Number.parseInt(url.searchParams.get("c_id") ?? "", 10);
  const iId = Number.parseInt(url.searchParams.get("i_id") ?? "", 10);

  for (const kind of KINDS) {
    if (getContent(kind, cId)?.entries?.some((entry) => entry.sourceId === iId)) {
      redirect(kind === "about" ? `/about?id=${cId}` : `/entry/${kind}/${cId}/${iId}`);
    }
  }

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

  if (Number.isFinite(cId) && Number.isFinite(iId)) notFound();
  redirect("/news");
}
