import { getCategory, productImageUrl } from "@/lib/site";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: number;
  sort: number;
  title: string;
  subtitle: string;
  image: string;
  subCategory: string;
  status: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ catId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { catId } = await params;
  const category = getCategory(catId);
  if (!category) {
    return Response.json({ ok: false, error: "Category not found" }, { status: 404 });
  }

  const rows: ProductRow[] = [];
  let id = 1;
  for (const sub of category.subs) {
    for (const product of sub.items) {
      rows.push({
        id: id++,
        sort: id * 10,
        title: product.title,
        subtitle: product.titleZh || "",
        image: product.gallery?.[0] ? productImageUrl(product.gallery[0]) : "",
        subCategory: sub.name,
        status: "正常",
      });
    }
  }

  return Response.json({
    ok: true,
    category: { sourceId: category.sourceId, name: category.name },
    rows,
  });
}
