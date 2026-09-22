import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// 处理添加新产品的 POST 请求
export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    
    // TODO: 在这里编写将新产品写入数据库或存储文件的逻辑
    // body 包含: categoryId, sort, title, subtitle, image, status, bodyHtml, bodyText

    return NextResponse.json({ 
      ok: true, 
      message: "产品添加成功",
      id: Date.now() 
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}