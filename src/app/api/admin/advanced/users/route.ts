import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, adminRoles, adminUsers } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

type UserRow = {
  id: number;
  username: string;
  displayName: string;
  roleKey: string;
  roleName: string;
  roleNameZh: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureSeedData();
  } catch {
    /* non-fatal */
  }

  const users = await db.select().from(adminUsers).orderBy(asc(adminUsers.id));
  const roles = await db.select().from(adminRoles);
  const roleMap = new Map(roles.map((r) => [r.key, r]));

  const rows: UserRow[] = users.map((u) => {
    const role = roleMap.get(u.roleKey);
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      roleKey: u.roleKey,
      roleName: role?.name ?? u.roleKey,
      roleNameZh: role?.nameZh ?? "",
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  });

  const session = await getAdminSession();
  return Response.json({
    ok: true,
    rows,
    roles: roles.map((r) => ({ key: r.key, name: r.name, nameZh: r.nameZh, permissionsJson: r.permissionsJson })),
    currentUser: session?.username ?? null,
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username) return Response.json({ ok: false, error: "管理员账号不能为空" }, { status: 400 });
  if (password.length < 6) return Response.json({ ok: false, error: "密码至少 6 位" }, { status: 400 });
  if (!/^[A-Za-z0-9_.@-]{3,40}$/.test(username)) {
    return Response.json({ ok: false, error: "账号仅支持字母、数字、_ . @ -，长度 3–40" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, username))
    .limit(1);
  if (existing) return Response.json({ ok: false, error: `账号 "${username}" 已存在` }, { status: 409 });

  const roleKey = String(body.roleKey ?? "editor").trim() || "editor";
  const [role] = await db.select({ id: adminRoles.id }).from(adminRoles).where(eq(adminRoles.key, roleKey)).limit(1);
  if (!role) return Response.json({ ok: false, error: `角色 "${roleKey}" 不存在` }, { status: 400 });

  const [row] = await db
    .insert(adminUsers)
    .values({
      username,
      passwordHash: hashPassword(password),
      displayName: String(body.displayName ?? "").trim() || username,
      roleKey,
      status: body.status === "disabled" ? "disabled" : "active",
    })
    .returning({ id: adminUsers.id, username: adminUsers.username });

  const session = await getAdminSession();
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "user.create",
    detail: `新建管理员 ${username}（角色 ${roleKey}）`,
  });

  return Response.json({ ok: true, row });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少管理员 ID" }, { status: 400 });

  const [current] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "管理员不存在" }, { status: 404 });

  const session = await getAdminSession();
  const patch: Record<string, unknown> = {};

  if (typeof body.displayName === "string") patch.displayName = body.displayName.trim();

  if (typeof body.roleKey === "string" && body.roleKey.trim()) {
    const roleKey = body.roleKey.trim();
    const [role] = await db.select({ id: adminRoles.id }).from(adminRoles).where(eq(adminRoles.key, roleKey)).limit(1);
    if (!role) return Response.json({ ok: false, error: `角色 "${roleKey}" 不存在` }, { status: 400 });
    // Never let the last active owner be demoted — that would lock everyone out.
    if (current.roleKey === "owner" && roleKey !== "owner") {
      const owners = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.roleKey, "owner"));
      const otherActiveOwners = owners.filter((o) => o.id !== id).length;
      if (otherActiveOwners === 0) {
        return Response.json({ ok: false, error: "至少需要保留一个超级管理员" }, { status: 400 });
      }
    }
    patch.roleKey = roleKey;
  }

  if (typeof body.status === "string" && ["active", "disabled"].includes(body.status)) {
    if (body.status === "disabled" && current.roleKey === "owner") {
      const owners = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.roleKey, "owner"));
      if (owners.filter((o) => o.id !== id).length === 0) {
        return Response.json({ ok: false, error: "不能停用唯一的超级管理员" }, { status: 400 });
      }
    }
    if (body.status === "disabled" && session?.username === current.username) {
      return Response.json({ ok: false, error: "不能停用当前登录的账号" }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (typeof body.password === "string" && body.password) {
    if (body.password.length < 6) return Response.json({ ok: false, error: "密码至少 6 位" }, { status: 400 });
    patch.passwordHash = hashPassword(body.password);
  }

  if (Object.keys(patch).length === 0) return Response.json({ ok: true });

  const [row] = await db.update(adminUsers).set(patch).where(eq(adminUsers.id, id)).returning({
    id: adminUsers.id,
    username: adminUsers.username,
  });

  const changed = Object.keys(patch).map((k) => (k === "passwordHash" ? "重置密码" : k)).join("、");
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "user.update",
    detail: `更新管理员 ${row.username}：${changed}`,
  });

  return Response.json({ ok: true, row });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, error: "缺少管理员 ID" }, { status: 400 });

  const [current] = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  if (!current) return Response.json({ ok: false, error: "管理员不存在" }, { status: 404 });

  const session = await getAdminSession();
  if (session?.username === current.username) {
    return Response.json({ ok: false, error: "不能删除当前登录的账号" }, { status: 400 });
  }
  if (current.roleKey === "owner") {
    const owners = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.roleKey, "owner"));
    if (owners.length <= 1) {
      return Response.json({ ok: false, error: "不能删除唯一的超级管理员" }, { status: 400 });
    }
  }

  await db.delete(adminUsers).where(eq(adminUsers.id, id));
  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: "user.delete",
    detail: `删除管理员 ${current.username}`,
  });
  return Response.json({ ok: true });
}
