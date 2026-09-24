import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAuditLog, adminContents, adminMessages, adminProducts } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { requireAdmin } from "@/lib/api-auth";
import { getAdminSession } from "@/lib/auth";
import { getAdminSections } from "@/lib/admin-columns";
import type { SiteContent } from "@/lib/site-types";
import siteNavJson from "@/data/site-nav.json";

export const dynamic = "force-dynamic";

type Items = SiteContent["items"];

type NavSub = {
  sourceId: number;
  name: string;
  nameZh: string;
  firstItemId: number;
  count: number;
};

type NavCategory = {
  sourceId: number;
  name: string;
  nameZh: string;
  count: number;
  subs: NavSub[];
};

/**
 * "高级管理 → 系统管理 → 信息转移".
 *
 * The legacy panel let an operator move a whole content column to another
 * column of the site (e.g. re-file a download list under a different
 * category, or promote a news item into another news tab).
 *
 * Three kinds of transfer are supported:
 *
 *  1. `content` — move an entire `admin_contents` column (`fromSourceId`) into
 *     the body of a target column (`toSourceId`). The source rows are appended
 *     so nothing is lost, and the source column is blanked. A snapshot is
 *     written into `admin_messages` so the move can be reviewed/undone.
 *
 *  2. `news` — re-file `news_posts` rows between the three news categories.
 *
 *  3. `products` — move selected `admin_products` rows from one sub-category
 *     (family + category) to another. The product tree is read from the small
 *     `site-nav.json` file; the actual data lives in `admin_products`.
 */
function asArray(items: Items): unknown[] {
  return Array.isArray(items) ? items : [];
}

function getProductTree(): NavCategory[] {
  return (siteNavJson as unknown as { categories: NavCategory[] }).categories ?? [];
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
    productTree: getProductTree(),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mode = String(body.mode ?? "content");
  const session = await getAdminSession();

  if (mode === "news") {
    const fromSourceId = Number(body.fromSourceId);
    const toSourceId = Number(body.toSourceId);
    if (!Number.isInteger(fromSourceId) || !Number.isInteger(toSourceId)) {
      return Response.json({ ok: false, error: "请选择源栏目和目标栏目" }, { status: 400 });
    }
    if (fromSourceId === toSourceId) {
      return Response.json({ ok: false, error: "源栏目和目标栏目不能相同" }, { status: 400 });
    }

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

  if (mode === "products") {
    const productIds = Array.isArray(body.productIds)
      ? body.productIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const targetFamilyId = Number(body.targetFamilyId);
    const targetCategoryId = Number(body.targetCategoryId);

    if (productIds.length === 0) {
      return Response.json({ ok: false, error: "请选择要转移的产品" }, { status: 400 });
    }
    if (!Number.isInteger(targetFamilyId) || targetFamilyId <= 0 || !Number.isInteger(targetCategoryId) || targetCategoryId <= 0) {
      return Response.json({ ok: false, error: "请选择目标大类和目标子分类" }, { status: 400 });
    }

    const tree = getProductTree();
    const targetFamily = tree.find((f) => f.sourceId === targetFamilyId);
    const targetSub = targetFamily?.subs.find((s) => s.sourceId === targetCategoryId);
    if (!targetFamily || !targetSub) {
      return Response.json({ ok: false, error: "目标分类不存在" }, { status: 404 });
    }

    // Snapshot the rows before we touch them.
    const beforeRows = await db
      .select({
        sourceId: adminProducts.sourceId,
        familyId: adminProducts.familyId,
        categoryId: adminProducts.categoryId,
        title: adminProducts.title,
      })
      .from(adminProducts)
      .where(inArray(adminProducts.sourceId, productIds));

    if (beforeRows.length === 0) {
      return Response.json({ ok: false, error: "所选产品在数据库中不存在" }, { status: 404 });
    }

    const isCopy = body.copy === true;
    let moved: number;

    if (isCopy) {
      // Copy: duplicate the selected rows with new sourceIds so existing URLs
      // keep pointing at the originals. A copied product is appended "(copy)"
      // to its title to make it distinguishable in the admin list.
      const now = Date.now();
      for (let i = 0; i < beforeRows.length; i++) {
        const row = beforeRows[i];
        const [original] = await db.select().from(adminProducts).where(eq(adminProducts.sourceId, row.sourceId)).limit(1);
        if (!original) continue;
        await db.insert(adminProducts).values({
          ...original,
          id: undefined as unknown as number,
          sourceId: now + i,
          familyId: targetFamilyId,
          categoryId: targetCategoryId,
          title: `${original.title} (copy)`,
          titleZh: original.titleZh ? `${original.titleZh}（副本）` : "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      moved = beforeRows.length;
    } else {
      // Move: reassign family and category.
      const updated = await db
        .update(adminProducts)
        .set({ familyId: targetFamilyId, categoryId: targetCategoryId, updatedAt: new Date() })
        .where(inArray(adminProducts.sourceId, productIds))
        .returning({ sourceId: adminProducts.sourceId });
      moved = updated.length;
    }

    const summaryTitles = beforeRows.map((r) => r.title || `#${r.sourceId}`).join("、");
    const snapshot = JSON.stringify({
      productIds,
      targetFamilyId,
      targetCategoryId,
      targetFamilyName: targetFamily.name,
      targetSubName: targetSub.name,
      titles: beforeRows.map((r) => r.title),
    });

    await db.insert(adminAuditLog).values({
      actor: session?.username ?? "",
      action: isCopy ? "transfer.products.copy" : "transfer.products.move",
      detail: `${isCopy ? "复制" : "转移"}产品 ${summaryTitles.slice(0, 200)} → ${targetFamily.name} / ${targetSub.name}，共 ${moved} 条`,
    });
    await db.insert(adminMessages).values({
      author: session?.username ?? "system",
      title: `[信息转移] 产品 → ${targetFamily.name} / ${targetSub.name}`,
      body: `${isCopy ? "复制" : "转移"}产品共 ${moved} 条\n目标：${targetFamily.name} / ${targetSub.name}\n快照：${snapshot.slice(0, 4000)}`,
      sectionPid: 53,
      columnSourceId: targetCategoryId,
      status: "closed",
      isPinned: false,
    });

    return Response.json({ ok: true, moved, copied: isCopy, snapshot: snapshot.slice(0, 4000) });
  }

  // --- mode === "content": move a whole admin_contents column's items ---
  const fromSourceId = Number(body.fromSourceId);
  const toSourceId = Number(body.toSourceId);
  if (!Number.isInteger(fromSourceId) || !Number.isInteger(toSourceId)) {
    return Response.json({ ok: false, error: "请选择源栏目和目标栏目" }, { status: 400 });
  }
  if (fromSourceId === toSourceId) {
    return Response.json({ ok: false, error: "源栏目和目标栏目不能相同" }, { status: 400 });
  }

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
