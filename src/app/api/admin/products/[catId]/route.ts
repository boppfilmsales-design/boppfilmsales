import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getCategories, featuredProducts } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ catId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { catId } = await params;
    
    // 从现有的 site.ts 静态数据中获取对应分类的产品，保证后台有内容展示
    const categories = getCategories();
    const currentCategory = categories.find((c) => c.sourceId === catId);
    
    const rawProducts = currentCategory ? currentCategory.products : featuredProducts(20).map(f => f.product);

    const rows = rawProducts.map((item: any, index: number) => ({
      id: item.id || index + 1,
      sort: item.sort || index + 1,
      title: item.title || "未命名产品",
      subtitle: item.subtitle || "",
      image: item.image || (item.gallery && item.gallery[0]) || "",
      subCategory: "标准子分类",
      status: "正常",
    }));

    return NextResponse.json({
      ok: true,
      category: { sourceId: catId, name: currentCategory ? currentCategory.name : "产品分类" },
      rows,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}