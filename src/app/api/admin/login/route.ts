import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { ADMIN_USERNAME, ensureSeedData } from "@/db/seed";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await ensureSeedData();
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return Response.json({ ok: false, error: "Username and password are required." }, { status: 400 });
  }

  const [user] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "xgxadmin";
  const valid = user
    ? verifyPassword(password, user.passwordHash)
    : username === ADMIN_USERNAME && password === expectedPassword;

  if (!valid) {
    return Response.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions);
  return Response.json({ ok: true, username });
}
