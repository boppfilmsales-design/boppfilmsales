import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsCategories } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();
  const categories = await db
    .select()
    .from(newsCategories)
    .orderBy(asc(newsCategories.sortOrder), asc(newsCategories.id));
  return Response.json({ ok: true, categories });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  const body = (await request.json().catch(() => ({}))) as { id?: number; name?: string };
  const id = Number.parseInt(String(body.id ?? ""), 10);
  const name = (body.name ?? "").trim();
  if (!Number.isFinite(id) || !name) {
    return Response.json({ ok: false, error: "Category id and name are required." }, { status: 400 });
  }
  const [updated] = await db
    .update(newsCategories)
    .set({ name })
    .where(eq(newsCategories.id, id))
    .returning({ id: newsCategories.id, name: newsCategories.name });
  if (!updated) return Response.json({ ok: false, error: "Category not found." }, { status: 404 });
  return Response.json({ ok: true, category: updated });
}
