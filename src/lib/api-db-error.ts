import { ensureSeedData } from "@/db/seed";

/**
 * Runs `ensureSeedData()` and, when the database is unreachable (e.g. Neon
 * returns HTTP 402 "quota exceeded"), turns the throw into a *readable* JSON
 * error instead of an unhandled 500 HTML page.
 *
 * Without this the admin UI shows either a blank form or a silent failure and
 * an operator reasonably concludes that "my content was lost".
 */
export async function guardDb(action: string): Promise<Response | null> {
  try {
    await ensureSeedData();
    return null;
  } catch (error) {
    return dbErrorResponse(error, action);
  }
}

export function dbErrorResponse(error: unknown, action: string): Response {
  // Drizzle wraps driver errors as "Failed query: …", so the real reason (e.g.
  // Neon's 402 quota message) only survives in `cause`.
  const own = error instanceof Error ? error.message : String(error);
  const cause = (error as { cause?: { message?: string } } | null)?.cause?.message ?? "";
  const detail = [own, cause].filter(Boolean).join(" — ").slice(0, 400);
  console.error(`[admin api] ${action} failed:`, detail);
  const quota = /quota|402/i.test(detail);
  return Response.json(
    {
      ok: false,
      dbError: true,
      error: quota
        ? `数据库配额已用完（Neon quota exceeded），${action}失败。内容没有被保存，请到 Neon 控制台检查 Usage / Limits 后重试。`
        : `数据库不可用，${action}失败：${detail}`,
    },
    { status: quota ? 503 : 500 },
  );
}
