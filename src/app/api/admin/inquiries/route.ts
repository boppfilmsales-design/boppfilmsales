import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const status = new URL(request.url).searchParams.get("status");
  const rows = await db.select().from(inquiries)
    .where(status && status !== "all" ? eq(inquiries.status, status) : undefined)
    .orderBy(desc(inquiries.createdAt));
  return Response.json({ ok: true, rows });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown };
  const id = Number(body.id);
  const status = String(body.status ?? "");
  if (!Number.isInteger(id) || !["new", "processing", "replied", "archived"].includes(status)) {
    return Response.json({ ok: false, error: "Invalid inquiry update" }, { status: 400 });
  }
  const [updated] = await db.update(inquiries).set({ status }).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  return updated ? Response.json({ ok: true, id: updated.id }) : Response.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => ({})) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "Invalid inquiry" }, { status: 400 });
  const [deleted] = await db.delete(inquiries).where(eq(inquiries.id, id)).returning({ id: inquiries.id });
  return deleted ? Response.json({ ok: true }) : Response.json({ ok: false, error: "Inquiry not found" }, { status: 404 });
}
