import { db } from "@/db";
import { adminContents } from "@/db/schema";
import { eq } from "drizzle-orm";

export type FriendlyLink = {
  label: string;
  href: string;
};

const DEFAULT_LINKS: FriendlyLink[] = [
  { label: "Asia Pacific Industry Group Co., Limited", href: "/" },
  { label: "Anhui Eastern Communication Group", href: "/" },
  { label: "Asia Pacific Industry Group Co., Limited -Blog", href: "/" },
  { label: "Foreign exchange", href: "http://www.boc.cn/sourcedb/whpj" },
  { label: "Shipping Information", href: "http://www.shipxy.com/" },
  { label: "Shipping fees", href: "http://ship.shippingchina.com/fclprice/index" },
  { label: "Site background", href: "https://www.boppfilmsales.com" },
];

function normalizeHref(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "/";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  // Legacy data sometimes stores bare domains like www.example.com.
  return `http://${trimmed}`;
}

/**
 * Reads the friendly-link column (sourceId 31, 友情链接) from the admin content
 * table. The admin panel stores each link as an object with `name` (display
 * label), `title` (legacy fallback) and `file` (target URL). Falls back to the
 * built-in default list if the DB row is missing or unparseable.
 */
export async function getFriendlyLinks(): Promise<FriendlyLink[]> {
  try {
    const [row] = await db
      .select({ dataJson: adminContents.dataJson })
      .from(adminContents)
      .where(eq(adminContents.sourceId, 31))
      .limit(1);
    if (!row?.dataJson) return DEFAULT_LINKS;

    const parsed = JSON.parse(row.dataJson) as {
      items?: Array<{
        name?: string;
        title?: string;
        file?: string;
        externalUrl?: string;
      }>;
    };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    if (items.length === 0) return DEFAULT_LINKS;

    const links = items
      .map((item) => ({
        label: (item.name || item.title || "").trim(),
        href: normalizeHref(item.file || item.externalUrl || ""),
      }))
      .filter((link) => link.label);

    return links.length > 0 ? links : DEFAULT_LINKS;
  } catch (error) {
    console.error("[getFriendlyLinks] failed, using defaults:", error);
    return DEFAULT_LINKS;
  }
}
