import { guardDb } from "@/lib/api-db-error";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/db";
import { adminContents } from "@/db/schema";
import { readSiteSeed } from "@/db/site-seed-reader";
import { eq } from "drizzle-orm";
import type { SiteContent } from "@/lib/site-types";

export const dynamic = "force-dynamic";

type ContentRow = {
  id: number;
  sort: number;
  title: string;
  titleZh: string;
  /** Cover image (first gallery image / leading image), already URL-resolved. */
  image: string;
  /** Number of gallery images attached to this row. */
  imageCount: number;
  /** Plain-text preview of the body, for the admin table. */
  excerpt: string;
  status: string;
};

/** Strips tags so the admin table gets a readable one-line preview. */
function plainText(html: string | undefined, max = 160): string {
  const text = (html ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

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

/**
 * Turns a stored content column into the flat rows the admin table renders.
 *
 * IMPORTANT — dispatch order matters. `parseData()` normalises a missing
 * `entries` key to `[]`, so a naive `Array.isArray(content.entries)` guard
 * matches *every* row and short-circuits before the single-page ("about")
 * branch. That is why the About Us columns (13 / 55 / 56 / 169 / 171 / 172)
 * used to render an empty table even though `data_json` held a full body.
 * Dispatch on `kind` first, and only treat `entries` as a list when it is
 * actually populated.
 */
function extractRows(content: SiteContent | undefined): ContentRow[] {
  if (!content) return [];

  const items = content.items;
  const entries = content.entries ?? [];
  const itemsZh = content.itemsZh as { bodyHtml?: string } | undefined;

  // --- Image galleries: honor / cases / lines / service (items is an array) ---
  if (["honor", "cases", "lines", "service"].includes(content.kind) && Array.isArray(items)) {
    const cards = items as Array<{
      sourceId?: number;
      title?: string;
      titleZh?: string;
      image?: string;
      externalUrl?: string;
    }>;
    return cards
      .filter((card) => card && (card.title || card.image))
      .map((card, i) => {
        const entry = entries.find((item) => String(item.sourceId) === String(card.sourceId));
        const image = card.image ? contentImageUrl(card.image) : "";
        return {
          id: card.sourceId ?? i + 1,
          sort: (i + 1) * 10,
          title: card.title || `Item ${i + 1}`,
          titleZh: card.titleZh || "",
          image,
          imageCount: image ? 1 : 0,
          excerpt: plainText(entry?.bodyHtml ?? card.externalUrl ?? ""),
          status: "正常",
        };
      });
  }

  // --- Download lists (items is an array of file rows) ---
  if (content.kind === "down" && Array.isArray(items)) {
    const rows = items as Array<{ name?: string; title?: string; serial?: string; format?: string; date?: string; file?: string; image?: string }>;
    return rows.map((row, i) => {
      const image = row.image ? contentImageUrl(row.image) : "";
      // Show the downloadable file itself as the thumbnail when there is no
      // cover image, so an editor can see at a glance whether the row is wired
      // to a real PDF.
      const file = (row.file ?? "").trim();
      const meta = [row.serial, row.format, row.date].filter(Boolean).join(" · ");
      return {
        id: i + 1,
        sort: (i + 1) * 10,
        title: row.name || row.title || `Download ${i + 1}`,
        titleZh: "",
        image,
        imageCount: image ? 1 : 0,
        excerpt: meta || plainText(file),
        status: file ? "正常" : "未绑定文件",
      };
    });
  }

  // --- Single-page columns ("about"): one row describing the whole column ---
  if (items && typeof items === "object" && !Array.isArray(items)) {
    const block = items as { bodyHtml?: string; images?: string[] };
    const images = Array.isArray(block.images) ? block.images : [];
    const first = images[0] ? contentImageUrl(images[0]) : "";
    return [{
      id: 1,
      sort: 10,
      title: content.name,
      titleZh: content.nameZh,
      image: first,
      imageCount: images.length,
      excerpt: plainText(block.bodyHtml || itemsZh?.bodyHtml),
      status: "正常",
    }];
  }

  // --- Fallback: a populated entries list with no card array ---
  if (entries.length > 0) {
    return entries.map((entry, i) => {
      const image = entry.image
        ? contentImageUrl(entry.image)
        : (entry.images?.[0] ? contentImageUrl(entry.images[0]) : "");
      return {
        id: entry.sourceId ?? i + 1,
        sort: (i + 1) * 10,
        title: entry.title || entry.name || `Entry ${i + 1}`,
        titleZh: entry.titleZh || "",
        image,
        imageCount: entry.images?.length ?? (image ? 1 : 0),
        excerpt: plainText(entry.bodyHtml),
        status: "正常",
      };
    });
  }

  return [];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const dbUnavailable = await guardDb("栏目内容");
  if (dbUnavailable) return dbUnavailable;

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
      // Fallback to the static seed, for a column that exists in the seed file
      // but has no DB row yet.
      //
      // NOTE: this used to resolve the reader through a non-analysable
      // specifier (`["@/db","site-seed-reader"].join("/")`) with
      // `webpackIgnore`. That works under the webpack dev server but *fails at
      // runtime* in the `output: "standalone"` server, where Node cannot
      // resolve the fabricated "@/" package name — every request for such a
      // column threw ERR_MODULE_NOT_FOUND. A plain static import is correct
      // here: `site-seed-reader` reads `site-seed.json` lazily inside its own
      // functions, so importing it does not re-inflate the bundle the way
      // `@/lib/site` did.
      const seed = readSiteSeed();
      content =
        (seed.getContents().find((c) => String(c.sourceId) === String(sourceId)) as SiteContent | undefined) ??
        (seed.getContents().find((c) => c.sourceId === sourceId) as SiteContent | undefined);
      if (!content) {
        return Response.json({ ok: false, error: "Content not found" }, { status: 404 });
      }
    }

    return Response.json({ ok: true, content, rows: extractRows(content) });
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
  const dbUnavailable = await guardDb("栏目内容");
  if (dbUnavailable) return dbUnavailable;
  const sourceId = Number.parseInt((await params).sourceId, 10);
  if (!Number.isInteger(sourceId)) return Response.json({ ok: false, error: "Invalid sourceId" }, { status: 400 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;

  // Merge-safe write: only overwrite the keys the client actually sent, so a
  // partial save (e.g. editing only the English body of an "about" column)
  // never silently wipes `images`, `itemsZh` or `entries`.
  const [existing] = await db
    .select({ dataJson: adminContents.dataJson, name: adminContents.name, nameZh: adminContents.nameZh })
    .from(adminContents)
    .where(eq(adminContents.sourceId, sourceId))
    .limit(1);
  const previous = existing ? JSON.parse(existing.dataJson || "{}") as Record<string, unknown> : {};

  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);
  const merged = {
    ...previous,
    ...(has("items") ? { items: body.items } : {}),
    ...(has("itemsZh") ? { itemsZh: body.itemsZh } : {}),
    ...(has("entries") ? { entries: body.entries } : {}),
  };

  const [updated] = await db.update(adminContents).set({
    name: has("name") ? String(body.name ?? "") : (existing?.name ?? ""),
    nameZh: has("nameZh") ? String(body.nameZh ?? "") : (existing?.nameZh ?? ""),
    dataJson: JSON.stringify(merged),
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