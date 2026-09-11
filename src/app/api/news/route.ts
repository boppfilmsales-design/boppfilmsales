import { getCategories, listPosts, resolveCategory } from "@/lib/news";

export const dynamic = "force-dynamic";

/**
 * Public JSON feed for the mirrored news columns (Industry News, Company News,
 * Employees Literary). Example: /api/news?category=employees-literary&p=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category") ?? url.searchParams.get("c_id");
  const page = Math.max(1, Number.parseInt(url.searchParams.get("p") ?? "1", 10) || 1);
  const perPage = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("perPage") ?? "12", 10) || 12));
  const keyword = (url.searchParams.get("q") ?? "").trim();

    const category = await resolveCategory(categoryParam);
  const categories = await getCategories();
  const result = await listPosts({
    categoryId: keyword ? undefined : category?.id,
    page,
    perPage,
    search: keyword || undefined,
  });

  return Response.json({
    ok: true,
    category: category ? { slug: category.slug, name: category.name, sourceId: category.sourceId } : null,
    categories: categories.map((row) => ({ slug: row.slug, name: row.name, sourceId: row.sourceId })),
    total: result.total,
    page: result.page,
    pages: result.pages,
    items: result.items.map((post) => ({
      id: post.id,
      legacyId: post.sourceId,
      categoryId: post.categoryId,
      title: post.title,
      listDate: post.listDate,
      newsDate: post.newsDate,
      excerpt: post.excerpt,
      image: post.image,
      bodyHtml: url.searchParams.get("includeBody") === "1" ? post.bodyHtml : undefined,
      bodyText: url.searchParams.get("includeBody") === "1" ? post.bodyText : undefined,
      url: `/news/${categories.find((c) => c.id === post.categoryId)?.slug ?? "news"}/${post.id}`,
      legacyUrl: `/show.php?c_id=${categories.find((c) => c.id === post.categoryId)?.sourceId ?? ""}&i_id=${post.sourceId ?? ""}`,
    })),
  });
}
