import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";

export const dynamic = "force-dynamic";

// 处理添加新产品的 POST 请求
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  try {
    const body = await request.json() as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    const familyId = Number(body.familyId);
    const categoryId = Number(body.categoryId);
    if (!title || !familyId || !categoryId) {
      return NextResponse.json({ ok: false, error: "产品栏目、分类和标题不能为空" }, { status: 400 });
    }
    const sourceId = Date.now();
    await db.insert(adminProducts).values({
      sourceId, familyId, categoryId, sort: Number(body.sort) || 0, title,
      subtitle: String(body.subtitle ?? ""), image: String(body.image ?? ""),
      status: String(body.status ?? "正常"), bodyHtml: String(body.bodyHtml ?? ""), bodyText: String(body.bodyText ?? ""),
    });

    return NextResponse.json({ 
      ok: true, 
      message: "产品添加成功",
      id: sourceId,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();
  const body = await request.json().catch(() => ({})) as { ids?: unknown; status?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : [];
  const status = String(body.status ?? "").trim();
  if (ids.length === 0 || !["正常", "置顶", "下架"].includes(status)) {
    return NextResponse.json({ ok: false, error: "请选择产品和有效状态" }, { status: 400 });
  }
  const updated = await db.update(adminProducts).set({ status, updatedAt: new Date() }).where(inArray(adminProducts.sourceId, ids)).returning({ id: adminProducts.sourceId });
  return NextResponse.json({ ok: true, count: updated.length });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : [];
  if (ids.length === 0) return NextResponse.json({ ok: false, error: "请选择要删除的产品" }, { status: 400 });
  const deleted = await db.delete(adminProducts).where(inArray(adminProducts.sourceId, ids)).returning({ id: adminProducts.sourceId });
  return NextResponse.json({ ok: true, count: deleted.length });
}