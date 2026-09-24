import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, siteSettings } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureSeedData();
  } catch {
    /* non-fatal */
  }
  const rows = await db.select().from(siteSettings).orderBy(asc(siteSettings.groupName), asc(siteSettings.id));
  return Response.json({ ok: true, rows });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { values?: unknown };
  const values = body.values;
  if (!values || typeof values !== "object") {
    return Response.json({ ok: false, error: "缺少 settings.values" }, { status: 400 });
  }

  const entries = Object.entries(values as Record<string, unknown>)
    .map(([key, value]) => [key, value == null ? "" : String(value)] as const)
    .filter(([key]) => key.trim().length > 0);

  if (entries.length === 0) return Response.json({ ok: true, updated: 0 });

  const keys = entries.map(([key]) => key);
  const existing = await db.select({ key: siteSettings.key }).from(siteSettings).where(inArray(siteSettings.key, keys));
  const known = new Set(existing.map((row) => row.key));

  let updated = 0;
  for (const [key, value] of entries) {
    if (known.has(key)) {
      await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({ key, value, label: key, groupName: "custom" });
    }
    updated += 1;
  }

  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "settings.update",
    detail: `更新站点设置：${keys.join("、")}`,
  });

  return Response.json({ ok: true, updated });
}
