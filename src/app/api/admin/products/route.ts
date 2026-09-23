import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
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