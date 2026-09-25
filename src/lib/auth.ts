import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "apig_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours
/** "记住密码" stretches a session to 30 days so the operator rarely has to sign in again. */
const REMEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function sessionMaxAge(remember: boolean): number {
  return remember ? REMEMBER_SESSION_MAX_AGE : SESSION_MAX_AGE;
}

function secret(): string {
  return process.env.SESSION_SECRET ?? "apigcl-mirror-dev-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string, remember = false): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + sessionMaxAge(remember) * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): { username: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!data.u || !data.exp || data.exp < Date.now()) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ username: string } | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function isAdminRequest(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

export function sessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionMaxAge(remember),
  };
}
