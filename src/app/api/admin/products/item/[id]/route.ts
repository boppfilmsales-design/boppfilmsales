import { guardDb } from "@/lib/api-db-error";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminProducts } from "@/db/schema";

export const dynamic = "force-dynamic";

// 获取单个产品详情（用于编辑回填）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;

  try {
    const { id } = await params;
    
    const [product] = await db.select().from(adminProducts).where(eq(adminProducts.sourceId, Number(id))).limit(1);
    if (!product) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });

    return NextResponse.json({ ok: true, product: {
      ...product,
      gallery: parseJson(product.galleryJson),
      pdfs: parseJson(product.pdfsJson),
    } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

function parseJson(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 更新产品 (PUT)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;

  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const gallery = Array.isArray(body.gallery) ? body.gallery.map(String) : [];
    const pdfs = Array.isArray(body.pdfs) ? body.pdfs : [];
    const [updated] = await db.update(adminProducts).set({
      categoryId: Number(body.categoryId), sort: Number(body.sort) || 0,
      title: String(body.title ?? "").trim(), titleZh: String(body.titleZh ?? ""),
      subtitle: String(body.subtitle ?? ""), subtitleZh: String(body.subtitleZh ?? ""),
      code: String(body.code ?? ""), price: String(body.price ?? ""),
      image: String(body.image ?? ""), galleryJson: JSON.stringify(gallery),
      status: String(body.status ?? "正常"), bodyHtml: String(body.bodyHtml ?? ""),
      bodyText: String(body.bodyText ?? ""), bodyHtmlZh: String(body.bodyHtmlZh ?? ""),
      description: String(body.description ?? ""), descriptionZh: String(body.descriptionZh ?? ""),
      technical: String(body.technical ?? ""), technicalZh: String(body.technicalZh ?? ""),
      offer: String(body.offer ?? ""), offerZh: String(body.offerZh ?? ""),
      pdfsJson: JSON.stringify(pdfs), updatedAt: new Date(),
    }).where(eq(adminProducts.sourceId, Number(id))).returning({ id: adminProducts.sourceId });
    if (!updated) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: updated.id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// 删除产品 (DELETE)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const dbUnavailable = await guardDb("产品");
  if (dbUnavailable) return dbUnavailable;

  try {
    const { id } = await params;
    
    const [deleted] = await db.delete(adminProducts).where(eq(adminProducts.sourceId, Number(id))).returning({ id: adminProducts.sourceId });
    if (!deleted) return NextResponse.json({ ok: false, error: "Product not found" }, { status: 404 });
    return NextResponse.json({ ok: true, id: deleted.id });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}