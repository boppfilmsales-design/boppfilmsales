import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100) || 100, 500);

  const rows = await db
    .select()
    .from(adminAuditLog)
    .where(action && action !== "all" ? eq(adminAuditLog.action, action) : undefined)
    .orderBy(desc(adminAuditLog.createdAt))
    .limit(limit);

  return Response.json({ ok: true, rows });
}
