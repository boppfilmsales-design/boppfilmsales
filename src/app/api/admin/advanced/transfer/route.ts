import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, adminContents, adminMessages } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";
import { getAdminSections } from "@/lib/admin-columns";
import type { SiteContent } from "@/lib/site-types";

export const dynamic = "force-dynamic";

type Items = SiteContent["items"];

/**
 * "高级管理 → 系统管理 → 信息转移".
 *
 * The legacy panel let an operator move a whole content column to another
 * column of the site (e.g. re-file a download list under a different
 * category, or promote a news item into another news tab).
 *
 * Two kinds of transfer are supported:
 *
 *  1. `content` — move an entire `admin_contents` column (`fromSourceId`) into
 *     the body of a target column (`toSourceId`). The source rows are appended
 *     so nothing is lost, and the source column is blanked. A snapshot is
 *     written into `admin_messages` so the move can be reviewed/undone.
 *
 *  2. `news` — re-file `news_posts` rows between the three news categories.
 */
function asArray(items: Items): unknown[] {
  return Array.isArray(items) ? items : [];
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureSeedData();
  } catch {
    /* non-fatal */
  }

  const sections = getAdminSections();
  const columns = sections.flatMap((section) =>
    section.columns.map((col) => ({
      sourceId: col.sourceId,
      name: col.name,
      sectionPid: section.pid,
      sectionName: section.name,
      sectionNameEn: section.nameEn,
      displayType: col.displayType,
      dataSource: col.dataSource,
      itemCount: col.itemCount,
    })),
  );

  const stored = await db
    .select({ sourceId: adminContents.sourceId, kind: adminContents.kind, name: adminContents.name })
    .from(adminContents)
    .orderBy(asc(adminContents.sourceId));
  const storedMap = new Map(stored.map((row) => [row.sourceId, row]));

  const [newsCounts] = await db.select({ total: sql<number>`count(*)::int` }).from(adminMessages).limit(1);

  return Response.json({
    ok: true,
    columns: columns.map((col) => ({
      ...col,
      dbKind: storedMap.get(col.sourceId)?.kind ?? null,
      dbName: storedMap.get(col.sourceId)?.name ?? null,
    })),
    messages: newsCounts?.total ?? 0,
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = String(body.mode ?? "content");

  const fromSourceId = Number(body.fromSourceId);
  const toSourceId = Number(body.toSourceId);
  if (!Number.isInteger(fromSourceId) || !Number.isInteger(toSourceId)) {
    return Response.json({ ok: false, error: "请选择源栏目和目标栏目" }, { status: 400 });
  }
  if (fromSourceId === toSourceId) {
    return Response.json({ ok: false, error: "源栏目和目标栏目不能相同" }, { status: 400 });
  }

  const session = await getAdminSession();

  if (mode === "news") {
    // Re-file every post of `fromSourceId` (legacy source id 41/49/52) into the
    // target category, resolved via `news_categories.source_id`.
    const cats = await db.execute<{ id: number; source_id: number; name: string }>(
      sql`select id, source_id, name from news_categories where source_id in (${fromSourceId}, ${toSourceId})`,
    );
    const from = cats.rows.find((r) => r.source_id === fromSourceId);
    const to = cats.rows.find((r) => r.source_id === toSourceId);
    if (!from || !to) return Response.json({ ok: false, error: "新闻栏目不存在" }, { status: 404 });

    // news_posts.source_id is the per-post legacy id, so we must match on the
    // category FK rather than source_id here.
    const moved = await db.execute<{ id: number }>(
      sql`update news_posts set category_id = ${to.id}, updated_at = now() where category_id = ${from.id} returning id`,
    );

    await db.insert(adminAuditLog).values({
      actor: session?.username ?? "",
      action: "transfer.news",
      detail: `新闻转移：${from.name} → ${to.name}，共 ${moved.rows.length} 篇`,
    });
    await db.insert(adminMessages).values({
      author: session?.username ?? "system",
      title: `[信息转移] 新闻 ${from.name} → ${to.name}`,
      body: `已将栏目「${from.name}」下的 ${moved.rows.length} 篇新闻转移到「${to.name}」。此记录可在需要时作为回滚依据。`,
      sectionPid: 2,
      columnSourceId: toSourceId,
      status: "closed",
      isPinned: false,
    });

    return Response.json({ ok: true, moved: moved.rows.length });
  }

  // --- mode === "content": move a whole admin_contents column's items ---
  const [source] = await db.select().from(adminContents).where(eq(adminContents.sourceId, fromSourceId)).limit(1);
  if (!source) return Response.json({ ok: false, error: "源栏目没有可转移的数据" }, { status: 404 });

  const [target] = await db.select().from(adminContents).where(eq(adminContents.sourceId, toSourceId)).limit(1);
  if (!target) {
    return Response.json(
      { ok: false, error: "目标栏目在数据库中不存在，请先打开该栏目一次以初始化" },
      { status: 404 },
    );
  }

  const sourceData = JSON.parse(source.dataJson || "{}") as Partial<SiteContent>;
  const targetData = JSON.parse(target.dataJson || "{}") as Partial<SiteContent>;

  if (source.kind !== target.kind) {
    const compatible =
      (source.kind === "honor" && target.kind === "cases") ||
      (source.kind === "cases" && target.kind === "honor") ||
      (source.kind === "lines" && target.kind === "honor") ||
      (source.kind === "service" && target.kind === "down");
    if (!compatible) {
      return Response.json(
        { ok: false, error: `栏目类型不兼容：${source.kind} → ${target.kind}` },
        { status: 400 },
      );
    }
  }

  const movedItems = asArray(sourceData.items as Items).length;
  const mergedItems = [...asArray(targetData.items as Items), ...asArray(sourceData.items as Items)];

  // Snapshot for review before overwriting.
  const snapshot = JSON.stringify({ from: fromSourceId, to: toSourceId, items: sourceData.items });

  await db
    .update(adminContents)
    .set({
      dataJson: JSON.stringify({ ...targetData, items: mergedItems }),
      updatedAt: new Date(),
    })
    .where(eq(adminContents.sourceId, toSourceId));

  // Blank the source only if this is a *move* (the default), not a copy.
  const isCopy = body.copy === true;
  if (!isCopy) {
    await db
      .update(adminContents)
      .set({ dataJson: JSON.stringify({ ...sourceData, items: [] }), updatedAt: new Date() })
      .where(eq(adminContents.sourceId, fromSourceId));
  }

  await db.insert(adminAuditLog).values({
    actor: session?.username ?? "",
    action: isCopy ? "transfer.content.copy" : "transfer.content.move",
    detail: `${isCopy ? "复制" : "转移"}栏目 ${source.name}(${fromSourceId}) → ${target.name}(${toSourceId})，共 ${movedItems} 条`,
  });
  await db.insert(adminMessages).values({
    author: session?.username ?? "system",
    title: `[信息转移] ${source.name} → ${target.name}`,
    body: `条目数：${movedItems}\n方式：${isCopy ? "复制（源保留）" : "移动（源已清空）"}\n快照：${snapshot.slice(0, 4000)}`,
    sectionPid: 53,
    columnSourceId: toSourceId,
    status: "closed",
    isPinned: false,
  });

  return Response.json({
    ok: true,
    moved: movedItems,
    copied: isCopy,
    snapshot: snapshot.slice(0, 4000),
  });
}
