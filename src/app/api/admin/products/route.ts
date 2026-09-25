import { guardDb } from "@/lib/api-db-error";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";

export const dynamic = "force-dynamic";

// 处理添加新产品的 POST 请求
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;

  try {
    const body = await request.json() as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    const familyId = Number(body.familyId);
    const categoryId = Number(body.categoryId);
    if (!title || !familyId || !categoryId) {
      return NextResponse.json({ ok: false, error: "产品栏目、分类和标题不能为空" }, { status: 400 });
    }
    const sourceId = Date.now();
    const gallery = Array.isArray(body.gallery) ? body.gallery.map(String) : [];
    const pdfs = Array.isArray(body.pdfs) ? body.pdfs : [];
    await db.insert(adminProducts).values({
      sourceId, familyId, categoryId, sort: Number(body.sort) || 0, title,
      titleZh: String(body.titleZh ?? ""), subtitle: String(body.subtitle ?? ""), subtitleZh: String(body.subtitleZh ?? ""),
      code: String(body.code ?? ""), price: String(body.price ?? ""), image: String(body.image ?? ""),
      galleryJson: JSON.stringify(gallery), status: String(body.status ?? "正常"),
      bodyHtml: String(body.bodyHtml ?? ""), bodyText: String(body.bodyText ?? ""), bodyHtmlZh: String(body.bodyHtmlZh ?? ""),
      description: String(body.description ?? ""), descriptionZh: String(body.descriptionZh ?? ""),
      technical: String(body.technical ?? ""), technicalZh: String(body.technicalZh ?? ""),
      offer: String(body.offer ?? ""), offerZh: String(body.offerZh ?? ""), pdfsJson: JSON.stringify(pdfs),
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
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;
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
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;
  const body = await request.json().catch(() => ({})) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : [];
  if (ids.length === 0) return NextResponse.json({ ok: false, error: "请选择要删除的产品" }, { status: 400 });
  const deleted = await db.delete(adminProducts).where(inArray(adminProducts.sourceId, ids)).returning({ id: adminProducts.sourceId });
  return NextResponse.json({ ok: true, count: deleted.length });
}