import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { adminContents } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { eq } from "drizzle-orm";
import type { SiteContent } from "@/lib/site-types";

export const dynamic = "force-dynamic";

type ContentRow = {
  id: number;
  sort: number;
  title: string;
  image: string;
  status: string;
};

/**
 * Local copy of `contentImageUrl` from `@/lib/site-helpers`.
 * Kept inline so this route never statically imports the site module (which
 * would pull the 14 MB site-seed.json into the bundle).
 */
function contentImageUrl(value: string): string {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/content/${source}`;
}

function extractRows(content: SiteContent | undefined, sourceId: number): ContentRow[] {
  if (!content) return [];

  if (content.kind === "honor" && Array.isArray(content.items)) {
    const items = content.items as Array<{ image?: string; title?: string }>;
    return items.map((item, i) => ({
      id: i + 1,
      sort: (i + 1) * 10,
      title: item.title || `Item ${i + 1}`,
      image: item.image ? contentImageUrl(item.image) : "",
      status: "正常",
    }));
  }

  if (content.kind === "down" && Array.isArray(content.items)) {
    const items = content.items as Array<{ name?: string; title?: string; file?: string; image?: string }>;
    return items.map((item, i) => ({
      id: i + 1,
      sort: (i + 1) * 10,
      title: item.name || item.title || `Download ${i + 1}`,
      image: item.image ? contentImageUrl(item.image) : "",
      status: "正常",
    }));
  }

  if (Array.isArray(content.entries)) {
    const entries = content.entries as Array<{ title?: string; image?: string; images?: string[]; externalUrl?: string; url?: string }>;
    return entries.map((entry, i) => ({
      id: i + 1,
      sort: (i + 1) * 10,
      title: entry.title || entry.externalUrl || entry.url || `Entry ${i + 1}`,
      image: entry.image ? contentImageUrl(entry.image) : (entry.images?.[0] ? contentImageUrl(entry.images[0]) : ""),
      status: "正常",
    }));
  }

  if (content.items && typeof content.items === "object" && !Array.isArray(content.items)) {
    const items = content.items as { bodyHtml?: string; images?: string[]; bodyHtmlZh?: string };
    return [{
      id: 1,
      sort: 10,
      title: content.name,
      image: items.images?.[0] ? contentImageUrl(items.images[0]) : "",
      status: "正常",
    }];
  }

  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();

  try {
    const resolvedParams = await params;
    const sourceIdStr = resolvedParams?.sourceId;
    const sourceId = Number.parseInt(sourceIdStr, 10);

    if (Number.isNaN(sourceId)) {
      return Response.json({ ok: false, error: "Invalid sourceId" }, { status: 400 });
    }

    const [stored] = await db.select().from(adminContents).where(eq(adminContents.sourceId, sourceId)).limit(1);
    let content: SiteContent | undefined = stored
      ? ({
          sourceId: stored.sourceId,
          kind: stored.kind as SiteContent["kind"],
          name: stored.name,
          nameZh: stored.nameZh,
          ...parseData(stored.dataJson),
        } as SiteContent)
      : undefined;

    if (!content) {
      // Fallback to the static seed. Imported lazily because `@/lib/site`
      // eagerly loads the 14 MB site-seed.json — a static import would put that
      // payload into this route's bundle even when the DB row exists.
      const { getContentBySourceId, getContents } = await import("@/lib/site");
      content =
        (getContentBySourceId(sourceId) as SiteContent | undefined) ??
        (getContents() as unknown as SiteContent[]).find((c) => c.sourceId === sourceId);
      if (!content) {
        return Response.json({ ok: false, error: "Content not found" }, { status: 404 });
      }
    }

    return Response.json({ ok: true, content, rows: extractRows(content, sourceId) });
  } catch (error) {
    console.error("[api/admin/content] failed", error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  await ensureSeedData();
  const sourceId = Number.parseInt((await params).sourceId, 10);
  if (!Number.isInteger(sourceId)) return Response.json({ ok: false, error: "Invalid sourceId" }, { status: 400 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const [updated] = await db.update(adminContents).set({
    name: String(body.name ?? ""),
    nameZh: String(body.nameZh ?? ""),
    dataJson: JSON.stringify({ items: body.items ?? {}, itemsZh: body.itemsZh, entries: body.entries ?? [] }),
    updatedAt: new Date(),
  }).where(eq(adminContents.sourceId, sourceId)).returning({ id: adminContents.sourceId });
  if (!updated) return Response.json({ ok: false, error: "Content not found" }, { status: 404 });
  return Response.json({ ok: true, id: updated.id });
}

function parseData(value: string): Pick<SiteContent, "items" | "itemsZh" | "entries"> {
  try {
    const parsed = JSON.parse(value) as Partial<SiteContent>;
    return { items: parsed.items ?? {}, itemsZh: parsed.itemsZh, entries: parsed.entries ?? [] };
  } catch {
    return { items: {}, entries: [] };
  }
}