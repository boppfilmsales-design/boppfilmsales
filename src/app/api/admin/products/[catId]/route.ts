import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { getCategories } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ catId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  try {
    const { catId } = await params;
    
    const familyId = Number.parseInt((await params).catId, 10);
    const categories = getCategories();
    const currentCategory = categories.find((c) => c.sourceId === familyId);
    if (!currentCategory) return NextResponse.json({ ok: false, error: "Product category not found" }, { status: 404 });
    const rows = await db
      .select({ id: adminProducts.sourceId, categoryId: adminProducts.categoryId, sort: adminProducts.sort, title: adminProducts.title, subtitle: adminProducts.subtitle, image: adminProducts.image, status: adminProducts.status })
      .from(adminProducts)
      .where(eq(adminProducts.familyId, familyId))
      .orderBy(asc(adminProducts.sort), asc(adminProducts.sourceId));

    return NextResponse.json({
      ok: true,
      category: { sourceId: familyId, name: currentCategory.name, categories: currentCategory.subs.map((sub) => ({ id: sub.sourceId, slug: String(sub.sourceId), name: sub.name })) },
      rows,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}