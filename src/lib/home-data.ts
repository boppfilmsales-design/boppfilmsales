import { getCategories, allPdfs, productCount, SITE } from "@/lib/site";
import { getLatestPosts } from "@/lib/news";

export { SITE, getCategories, allPdfs, productCount };

/** Home page news list that never throws when the DB is still initialising. */
export async function getLatestPostsSafe(limit = 6) {
  try {
    const rows = await getLatestPosts(limit);
    const categories = await import("@/lib/news").then((m) => m.getCategories());
    const names = new Map(categories.map((c) => [c.id, c.name]));
    const slugs = new Map(categories.map((c) => [c.id, c.slug]));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      listDate: row.listDate,
      category: names.get(row.categoryId) ?? "News",
      slug: slugs.get(row.categoryId) ?? "industry-news",
    }));
  } catch {
    return [] as { id: number; title: string; listDate: string; category: string; slug: string }[];
  }
}
