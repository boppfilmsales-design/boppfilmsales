import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminContents } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import type { SiteContent } from "@/lib/site";

/**
 * NOTE: `@/lib/site` is loaded dynamically, never at module scope.
 *
 * That module parses the generated ~784 KB `site-catalog.json` (and a 76 KB
 * file-name list) the moment it is evaluated, and a static import here dragged
 * it into every route that touches `content-db` — `/cases`, `/service`,
 * `/about`, `/honor`… — even though the catalog is only a *fallback* for when
 * D1 has nothing. On Workers the parsed JSON stays in the isolate for its
 * whole lifetime, which matters a lot against the 128 MB ceiling: Cloudflare
 * kills requests that arrive while the isolate sits near the limit, and that
 * is what Error 1102 looks like here (the killed requests used ~10 ms of CPU
 * and ~112-124 MB of memory).
 *
 * The dynamic import below is deliberately inside the fallback branch, so a
 * populated database — the normal case in production — never pays for it.
 */

function parseData(value: string): Pick<SiteContent, "items" | "itemsZh" | "entries"> {
  try {
    const parsed = JSON.parse(value) as Partial<SiteContent>;
    return {
      items: parsed.items ?? {},
      itemsZh: parsed.itemsZh,
      entries: parsed.entries ?? [],
    };
  } catch {
    return { items: {}, entries: [] };
  }
}

function fromRow(row: typeof adminContents.$inferSelect): SiteContent {
  return {
    sourceId: row.sourceId,
    kind: row.kind as SiteContent["kind"],
    name: row.name,
    nameZh: row.nameZh,
    ...parseData(row.dataJson),
  };
}

export async function getContentForSite(kind: SiteContent["kind"], sourceId: number | string): Promise<SiteContent | undefined> {
  try {
    await ensureSeedData();
    const [row] = await db.select().from(adminContents).where(eq(adminContents.sourceId, Number(sourceId))).limit(1);
    if (row) return fromRow(row);
  } catch (error) {
    console.error("[content-db] D1 read failed, falling back to the site catalog", error);
  }
  const { getContent } = await import("@/lib/site");
  return getContent(kind, sourceId);
}

export async function getContentsForSite(kind: SiteContent["kind"]): Promise<SiteContent[]> {
  try {
    await ensureSeedData();
    const rows = await db.select().from(adminContents)
      .where(eq(adminContents.kind, kind))
      .orderBy(asc(adminContents.sourceId));
    if (rows.length > 0) return rows.map(fromRow);
  } catch (error) {
    console.error("[content-db] D1 read failed, falling back to the site catalog", error);
  }
  const { getContents } = await import("@/lib/site");
  return getContents(kind);
}
