import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, adminMessages } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["open", "replied", "closed"] as const;

function optionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureSeedData();
  } catch {
    /* non-fatal */
  }
  const status = new URL(request.url).searchParams.get("status");
  const rows = await db
    .select()
    .from(adminMessages)
    .where(status && status !== "all" ? eq(adminMessages.status, status) : undefined)
    .orderBy(desc(adminMessages.isPinned), desc(adminMessages.createdAt));

  const all = await db.select({ status: adminMessages.status }).from(adminMessages);
  const counts = { all: all.length, open: 0, replied: 0, closed: 0 };
  for (const row of all) {
    if (row.status === "open") counts.open += 1;
    else if (row.status === "replied") counts.replied += 1;
    else if (row.status === "closed") counts.closed += 1;
  }

  return Response.json({ ok: true, rows, counts });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = String(body.body ?? "").trim();
  if (!text) return Response.json({ ok: false, error: "留言内容不能为空" }, { status: 400 });

  const session = await getAdminSession();
  const [row] = await db
    .insert(adminMessages)
    .values({
      author: session?.username ?? "system",
      title: String(body.title ?? "").trim() || "（无标题）",
      body: text,
      sectionPid: optionalInt(body.sectionPid),
      columnSourceId: optionalInt(body.columnSourceId),
      status: "open",
      isPinned: body.isPinned === true,
    })
    .returning();

  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "message.create",
    detail: `新增留言 ${row.title}`,
  });

  return Response.json({ ok: true, row });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少留言 ID" }, { status: 400 });

  const [current] = await db.select().from(adminMessages).where(eq(adminMessages.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "留言不存在" }, { status: 404 });

  const session = await getAdminSession();
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string") patch.title = body.title.trim() || "（无标题）";
  if (typeof body.body === "string" && body.body.trim()) patch.body = body.body.trim();
  if (body.isPinned !== undefined) patch.isPinned = body.isPinned === true;

  if (typeof body.status === "string" && (STATUSES as readonly string[]).includes(body.status)) {
    patch.status = body.status;
  }
  if (typeof body.reply === "string") {
    patch.reply = body.reply.trim();
    if (body.reply.trim()) {
      patch.repliedBy = session?.username ?? "";
      patch.repliedAt = new Date();
      // Replying always advances an open thread.
      if (!patch.status && current.status === "open") patch.status = "replied";
    }
  }

  if (Object.keys(patch).length === 0) return Response.json({ ok: true, row: current });

  const [row] = await db.update(adminMessages).set(patch).where(eq(adminMessages.id, id)).returning();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "message.update",
    detail: `更新留言 ${row.title}（${row.status}）`,
  });
  return Response.json({ ok: true, row });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少留言 ID" }, { status: 400 });

  const [deleted] = await db.delete(adminMessages).where(eq(adminMessages.id, id)).returning({
    id: adminMessages.id,
    title: adminMessages.title,
  });
  if (!deleted) return Response.json({ ok: false, error: "留言不存在" }, { status: 404 });

  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "message.delete",
    detail: `删除留言 ${deleted.title}`,
  });
  return Response.json({ ok: true });
}
