import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminContents } from "@/db/schema";
import { ensureSeedData } from "@/db/seed";
import { getContent, getContents, type SiteContent } from "@/lib/site";

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
  const fallback = getContent(kind, sourceId);
  try {
    await ensureSeedData();
    const [row] = await db.select().from(adminContents).where(eq(adminContents.sourceId, Number(sourceId))).limit(1);
    return row ? fromRow(row) : fallback;
  } catch (error) {
    console.error("[content-db] falling back to site seed", error);
    return fallback;
  }
}

export async function getContentsForSite(kind: SiteContent["kind"]): Promise<SiteContent[]> {
  const fallback = getContents(kind);
  try {
    await ensureSeedData();
    const rows = await db.select().from(adminContents)
      .where(eq(adminContents.kind, kind))
      .orderBy(asc(adminContents.sourceId));
    if (rows.length === 0) return fallback;
    return rows.map(fromRow);
  } catch (error) {
    console.error("[content-db] falling back to site seed", error);
    return fallback;
  }
}
