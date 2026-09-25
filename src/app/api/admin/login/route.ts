import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { ADMIN_USERNAME, ensureSeedData } from "@/db/seed";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Try to ensure seed data, but don't block login if DB is down.
  // The env-var fallback below allows login even without a database.
  try {
    await ensureSeedData();
  } catch (err) {
    console.error("[admin/login] ensureSeedData failed (continuing with env fallback):", err);
  }
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
    remember?: boolean;
  };
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  // "记住密码": only a strict true counts, so a missing/garbage field keeps the 12h session.
  const remember = body.remember === true;

  if (!username || !password) {
    return Response.json({ ok: false, error: "Username and password are required." }, { status: 400 });
  }

  let user: { id: number; username: string; passwordHash: string; status: string } | null = null;
  try {
    const rows = await db
      .select({
        id: adminUsers.id,
        username: adminUsers.username,
        passwordHash: adminUsers.passwordHash,
        status: adminUsers.status,
      })
      .from(adminUsers)
      .where(eq(adminUsers.username, username))
      .limit(1);
    user = rows[0] ?? null;
  } catch (err) {
    console.error("[admin/login] DB query failed, falling back to env credentials:", err);
  }
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "xgxadmin";
  const valid = user
    ? verifyPassword(password, user.passwordHash)
    : username === ADMIN_USERNAME && password === expectedPassword;

  if (!valid) {
    return Response.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
  }

  // A disabled account (set in 高级管理 → 权限管理 → 管理员) cannot sign in.
  if (user && user.status === "disabled") {
    return Response.json({ ok: false, error: "该账号已被停用，请联系超级管理员。" }, { status: 403 });
  }

  // Record the sign-in for the 管理员 list ("最后登录" column). Best-effort:
  // a failure here must not block a valid login.
  if (user) {
    try {
      await db
        .update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, user.id));
    } catch (err) {
      console.error("[admin/login] failed to record lastLoginAt:", err);
    }
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(username, remember), sessionCookieOptions(remember));
  return Response.json({ ok: true, username });
}
