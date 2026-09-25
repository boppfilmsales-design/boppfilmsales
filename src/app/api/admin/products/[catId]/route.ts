import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import adminMeta from "@/data/admin-columns-meta.json";
import { CATEGORY_ZH } from "@/lib/site-helpers";

export const dynamic = "force-dynamic";

type AdminMeta = {
  categories: {
    sourceId: number;
    name: string;
    itemCount: number;
    subs?: { sourceId: number; name: string; nameZh: string; itemCount: number }[];
  }[];
  subNameZh: Record<string, string>;
};

const meta = adminMeta as unknown as AdminMeta;
const metaCategories = meta.categories ?? [];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ catId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  try {
    const { catId } = await params;
    const familyId = Number.parseInt(catId, 10);
    const currentCategory = metaCategories.find((c) => c.sourceId === familyId);
    if (!currentCategory) return NextResponse.json({ ok: false, error: "Product category not found" }, { status: 404 });
    const rows = await db
      .select({ id: adminProducts.sourceId, categoryId: adminProducts.categoryId, sort: adminProducts.sort, title: adminProducts.title, subtitle: adminProducts.subtitle, image: adminProducts.image, status: adminProducts.status })
      .from(adminProducts)
      .where(eq(adminProducts.familyId, familyId))
      .orderBy(asc(adminProducts.sort), asc(adminProducts.sourceId));

    return NextResponse.json({
      ok: true,
      category: {
        sourceId: familyId,
        name: currentCategory.name,
        nameZh: CATEGORY_ZH[familyId] ?? "",
        // Include declared empty sub-categories too, so the admin can file
        // products into every legacy sub-category instead of only those that
        // currently contain rows.
        categories: (currentCategory.subs ?? []).map((sub) => ({
          id: sub.sourceId,
          slug: String(sub.sourceId),
          name: sub.name,
          nameZh: sub.nameZh || meta.subNameZh[String(sub.sourceId)] || "",
          itemCount: sub.itemCount,
        })),
      },
      rows: rows.map((row) => ({
        ...row,
        subCategory: currentCategory.subs?.find((sub) => sub.sourceId === row.categoryId)?.name
          ?? meta.subNameZh[String(row.categoryId)]
          ?? `Sub ${row.categoryId}`,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}