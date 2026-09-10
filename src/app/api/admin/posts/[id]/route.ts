import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { buildPostValues, type PostPayload } from "@/lib/post-payload";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  const { id } = await context.params;
  const [post] = await db
    .select()
    .from(newsPosts)
    .where(eq(newsPosts.id, Number.parseInt(id, 10)))
    .limit(1);
  if (!post) return Response.json({ ok: false, error: "Article not found." }, { status: 404 });
  return Response.json({ ok: true, post });
}

export async function PUT(request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  const { id } = await context.params;
  const postId = Number.parseInt(id, 10);
  const payload = (await request.json().catch(() => ({}))) as PostPayload;

  try {
    const values = buildPostValues(payload, false);
    const [updated] = await db
      .update(newsPosts)
      .set(values as Partial<typeof newsPosts.$inferInsert>)
      .where(eq(newsPosts.id, postId))
      .returning({ id: newsPosts.id });
    if (!updated) return Response.json({ ok: false, error: "Article not found." }, { status: 404 });
    return Response.json({ ok: true, id: updated.id });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to update the article." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  const { id } = await context.params;
  const postId = Number.parseInt(id, 10);
  const [deleted] = await db
    .delete(newsPosts)
    .where(eq(newsPosts.id, postId))
    .returning({ id: newsPosts.id });
  if (!deleted) return Response.json({ ok: false, error: "Article not found." }, { status: 404 });
  return Response.json({ ok: true });
}
