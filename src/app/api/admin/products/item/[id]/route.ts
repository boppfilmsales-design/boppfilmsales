import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// 获取单个产品详情（用于编辑回填）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    
    // 示例返回结构（你可以根据你的实际数据源进行调整）
    const product = {
      id: Number(id),
      categoryId: 1,
      sort: 10,
      title: "示例产品",
      subtitle: "",
      image: "",
      bodyHtml: "",
      bodyText: "",
      status: "正常",
    };

    return NextResponse.json({ ok: true, product });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// 更新产品 (PUT)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    
    // TODO: 编写更新数据库或存储中对应 id 产品的逻辑

    return NextResponse.json({ ok: true, message: `产品 #${id} 更新成功` });
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

  try {
    const { id } = await params;
    
    // TODO: 编写从数据库或存储中删除对应 id 产品的逻辑

    return NextResponse.json({ ok: true, message: `产品 #${id} 已删除` });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}