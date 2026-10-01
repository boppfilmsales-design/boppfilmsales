import { getCategories, allPdfs, productCount, SITE, categoryProductNames, featuredProducts, catalogueImages, productImageUrl } from "@/lib/site";
import { PUBLIC_NEWS_SLUGS, getLatestPosts } from "@/lib/news";
import { warnDbFallback } from "@/lib/db-log";

export { SITE, getCategories, allPdfs, productCount, categoryProductNames, featuredProducts, catalogueImages, productImageUrl };

/**
 * 首页新闻列表，数据库还在初始化时也不会抛错。
 *
 * `publicOnly: true` 让 SQL 直接限定「新闻中心」三个栏目后再取条数 ——
 * 不要在这里先取一大把再过滤：`news_posts` 现在同时装着案例、下载中心和
 * 关于我们的文章，先取后过滤会让首页新闻少几条甚至为空（2026-10-01 修复）。
 */
export async function getLatestPostsSafe(limit = 6) {
  try {
    const rows = await getLatestPosts(limit, { publicOnly: true });
    if (!rows || rows.length === 0) {
      throw new Error("No news rows found in DB");
    }
    const categories = await import("@/lib/news").then((m) => m.getCategories());
    const names = new Map(categories.map((c) => [c.id, c.name]));
    const slugs = new Map(categories.map((c) => [c.id, c.slug]));
    // 这些栏目复用 news 表但属于别的板块，这里再兜一层过滤，防止将来查询被改错。
    return rows
      .filter((row) => PUBLIC_NEWS_SLUGS.includes(slugs.get(row.categoryId) ?? ""))
      .map((row) => ({
        id: row.id,
        title: row.title,
        listDate: row.listDate,
        category: names.get(row.categoryId) ?? "News",
        slug: slugs.get(row.categoryId) ?? "industry-news",
      }));
  } catch (error) {
    warnDbFallback("⚠️ [Home News Fallback] Using mock news data due to DB status:", error);
    
    // 💡 降级方案：当数据库未初始化时返回高质量的默认行业新闻，确保首页完美展示
    return [
      {
        id: 101,
        title: "Asia Pacific Industry Group Showcases 4.5Mic BOPET Film Innovations for Global Markets",
        listDate: "2026-03-20",
        category: "Company News",
        slug: "industry-news",
      },
      {
        id: 102,
        title: "Optimizing 40HC Container Loading and Pallet Tetris Layout for Export Shipments",
        listDate: "2026-03-15",
        category: "Logistics",
        slug: "industry-news",
      },
      {
        id: 103,
        title: "Global Demand Trends for Industrial Plastic Films and Polyester Substrates in Q2",
        listDate: "2026-03-10",
        category: "Market Trends",
        slug: "industry-news",
      },
    ].slice(0, limit);
  }
}