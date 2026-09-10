import { redirect } from "next/navigation";
import { getCategories } from "@/lib/news";

export const dynamic = "force-dynamic";

/**
 * Legacy URL compatibility: http://apigcl.com/news.php?c_id=41&p=2
 * now permanently served by /news?category=industry-news&p=2
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cId = url.searchParams.get("c_id") ?? url.searchParams.get("top_id");
  const page = url.searchParams.get("p") ?? "1";
  const categories = await getCategories();
  const category = cId ? categories.find((row) => String(row.sourceId) === cId) : categories[0];
  redirect(`/news?category=${category?.slug ?? ""}&p=${page}`);
}
