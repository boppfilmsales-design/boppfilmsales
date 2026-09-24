import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, inquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "processing", "replied", "archived"] as const;

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get("status");
  const rows = await db.select().from(inquiries)
    .where(status && status !== "all" ? eq(inquiries.status, status) : undefined)
    .orderBy(desc(inquiries.createdAt));

  const all = await db.select({ status: inquiries.status, isPublic: inquiries.isPublic }).from(inquiries);
  const counts = { all: all.length, new: 0, processing: 0, replied: 0, archived: 0, public: 0 };
  for (const row of all) {
    if (row.status === "new") counts.new += 1;
    else if (row.status === "processing") counts.processing += 1;
    else if (row.status === "replied") counts.replied += 1;
    else if (row.status === "archived") counts.archived += 1;
    if (row.isPublic) counts.public += 1;
  }

  return Response.json({ ok: true, rows, counts });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return Response.json({ ok: false, error: "Invalid inquiry id" }, { status: 400 });
  }

  const [current] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "Inquiry not found" }, { status: 404 });

  const session = await getAdminSession();
  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const status = String(body.status);
    if (!(STATUSES as readonly string[]).includes(status)) {
      return Response.json({ ok: false, error: "Invalid inquiry status" }, { status: 400 });
    }
    patch.status = status;
  }

  if (typeof body.reply === "string") {
    const reply = body.reply.trim();
    patch.reply = reply;
    if (reply) {
      patch.repliedBy = session?.username ?? "";
      patch.repliedAt = new Date();
      // Replying to a fresh inquiry advances it automatically.
      if (!patch.status && (current.status === "new" || current.status === "processing")) {
        patch.status = "replied";
      }
    }
  }

  if (body.isPublic !== undefined) patch.isPublic = body.isPublic === true;

  if (Object.keys(patch).length === 0) return Response.json({ ok: true, row: current });

  const [updated] = await db.update(inquiries).set(patch).where(eq(inquiries.id, id)).returning();

  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "inquiry.update",
    detail: `更新客户留言 #${id}（${updated.status}${updated.isPublic ? " · 公开" : ""}）`,
  });

  return Response.json({ ok: true, row: updated });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "Invalid inquiry" }, { status: 400 });
  const [deleted] = await db.delete(inquiries).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  if (deleted) {
    const session = await getAdminSession();
    await db.insert(adminAuditLog).values({
      actor: session?.username ?? "",
      action: "inquiry.delete",
      detail: `删除客户留言 #${id}`,
    });
  }
  return deleted ? Response.json({ ok: true }) : Response.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
}
