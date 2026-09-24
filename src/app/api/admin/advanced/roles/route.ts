import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, adminRoles, adminUsers } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function toKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function normalisePermissions(input: unknown): string {
  if (Array.isArray(input)) {
    const list = input.map((v) => String(v)).filter(Boolean);
    return JSON.stringify(list.length ? list : []);
  }
  if (typeof input === "string" && input.trim()) {
    return JSON.stringify(
      input
        .split(/[,\s]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    );
  }
  return '["*"]';
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureSeedData();
  } catch {
    /* non-fatal: still return whatever rows exist */
  }
  const rows = await db.select().from(adminRoles).orderBy(asc(adminRoles.id));
  // Count members so the UI can show "3 位管理员" per role and refuse to
  // delete a role that is still in use.
  const counts = new Map<string, number>();
  const users = await db.select({ roleKey: adminUsers.roleKey }).from(adminUsers);
  for (const u of users) counts.set(u.roleKey, (counts.get(u.roleKey) ?? 0) + 1);
  return Response.json({
    ok: true,
    rows: rows.map((r) => ({ ...r, memberCount: counts.get(r.key) ?? 0 })),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ ok: false, error: "角色名称不能为空" }, { status: 400 });

  const key = toKey(String(body.key ?? "").trim() || name);
  if (!key) return Response.json({ ok: false, error: "角色标识无效" }, { status: 400 });

  const [existing] = await db.select({ id: adminRoles.id }).from(adminRoles).where(eq(adminRoles.key, key)).limit(1);
  if (existing) return Response.json({ ok: false, error: `角色标识 "${key}" 已存在` }, { status: 409 });

  const [row] = await db
    .insert(adminRoles)
    .values({
      key,
      name,
      nameZh: String(body.nameZh ?? "").trim(),
      description: String(body.description ?? "").trim(),
      permissionsJson: normalisePermissions(body.permissions ?? body.permissionsJson),
      isBuiltIn: false,
    })
    .returning();

  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "role.create",
    detail: `新建角色 ${name} (${key})`,
  });

  return Response.json({ ok: true, row });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少角色 ID" }, { status: 400 });

  const [current] = await db.select().from(adminRoles).where(eq(adminRoles.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "角色不存在" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.nameZh === "string") patch.nameZh = body.nameZh.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (body.permissions !== undefined || body.permissionsJson !== undefined) {
    // The built-in owner role must keep the wildcard, otherwise an operator
    // can lock themselves out of the panel.
    if (current.key === "owner") {
      patch.permissionsJson = '["*"]';
    } else {
      patch.permissionsJson = normalisePermissions(body.permissions ?? body.permissionsJson);
    }
  }
  if (Object.keys(patch).length === 0) return Response.json({ ok: true, row: current });

  const [row] = await db.update(adminRoles).set(patch).where(eq(adminRoles.id, id)).returning();
  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "role.update",
    detail: `更新角色 ${row.name} (${row.key})`,
  });
  return Response.json({ ok: true, row });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少角色 ID" }, { status: 400 });

  const [current] = await db.select().from(adminRoles).where(eq(adminRoles.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "角色不存在" }, { status: 404 });
  if (current.isBuiltIn) return Response.json({ ok: false, error: "内置角色不可删除" }, { status: 400 });

  const [inUse] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.roleKey, current.key))
    .limit(1);
  if (inUse) return Response.json({ ok: false, error: "该角色下仍有管理员，请先转移后再删除" }, { status: 400 });

  await db.delete(adminRoles).where(eq(adminRoles.id, id));
  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "role.delete",
    detail: `删除角色 ${current.name} (${current.key})`,
  });
  return Response.json({ ok: true });
}
