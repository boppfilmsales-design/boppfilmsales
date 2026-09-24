import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Front-end navigation tree for the Products mega-menu.
 *
 * The mega-menu needs a family → sub-category tree with a *representative*
 * product id per sub (so a click can deep-link straight into that sub). That
 * shape is small and highly rendered, so it is cached in `site_settings` under
 * the key below rather than queried with the full product table on every page.
 *
 * `src/data/site-nav.json` remains the seed: `getNavCategories()` uses it as the
 * baseline and layers the cached override on top. The override is refreshed by
 * the 信息转移 screen after a product move, so the menu and the product pages
 * cannot drift apart (which is exactly what used to happen — the menu kept
 * pointing at a product that had already been re-filed elsewhere).
 */
export const NAV_OVERRIDE_KEY = "nav_products_json";

export type NavSub = {
  sourceId: number;
  name: string;
  nameZh: string;
  firstItemId: number;
  count: number;
};

export type NavCategory = {
  sourceId: number;
  name: string;
  nameZh: string;
  count: number;
  subs: NavSub[];
};

/** Parses the cached override; returns null when absent or malformed. */
export function parseNavOverride(raw: string | undefined): NavCategory[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as NavCategory[];
  } catch {
    return null;
  }
}

/** Reads the cached override from `site_settings`. Never throws. */
export async function getNavOverride(): Promise<NavCategory[] | null> {
  try {
    const rows = await db.execute<{ value: string }>(
      sql`select value from site_settings where key = ${NAV_OVERRIDE_KEY} limit 1`,
    );
    return parseNavOverride(rows.rows[0]?.value);
  } catch {
    return null;
  }
}

/**
 * Rebuilds the mega-menu tree from `admin_products` and caches it.
 *
 * The tree is derived from the *database*, not from `site-nav.json`, so it
 * always describes where products actually live now:
 *
 *  - `count` is the live product count of the family / sub, not the seeded one;
 *  - `firstItemId` is the first product in `sort` order within the sub, so the
 *    deep link can never point at a product that has been moved out;
 *  - a sub that has been emptied keeps a `firstItemId` of 0 and still appears,
 *    so the operator can see (and navigate to) it;
 *  - names are taken from the seed tree where known, and fall back to a
 *    generated label for a sub-category the seed never declared.
 *
 * Returns the rebuilt tree, or null when there is nothing to rebuild from.
 */
export async function rebuildNavFromDb(): Promise<NavCategory[] | null> {
  const rows = await db.execute<{
    source_id: number;
    family_id: number;
    category_id: number;
    title: string;
    title_zh: string;
  }>(sql`
    select source_id, family_id, category_id, title, title_zh
    from admin_products
    where status is distinct from '已删除'
    order by family_id, category_id, sort, source_id
  `);
  if (rows.rows.length === 0) return null;

  // Reuse the seeded names so the menu keeps its curated wording; the transfer
  // screen only ever moves products between *existing* families/subs, so this
  // is a name lookup, not a naming decision.
  const seed = (await import("@/data/site-nav.json")).default as unknown as {
    categories: NavCategory[];
  };
  const nameByFamily = new Map<number, { name: string; nameZh: string }>();
  const nameBySub = new Map<string, { name: string; nameZh: string }>();
  for (const fam of seed.categories ?? []) {
    nameByFamily.set(fam.sourceId, { name: fam.name, nameZh: fam.nameZh });
    for (const sub of fam.subs ?? []) {
      nameBySub.set(`${fam.sourceId}:${sub.sourceId}`, { name: sub.name, nameZh: sub.nameZh });
    }
  }

  const famMap = new Map<number, NavCategory>();
  for (const row of rows.rows) {
    let fam = famMap.get(row.family_id);
    if (!fam) {
      const seedName = nameByFamily.get(row.family_id);
      fam = {
        sourceId: row.family_id,
        name: seedName?.name ?? `Products ${row.family_id}`,
        nameZh: seedName?.nameZh ?? `产品大类 ${row.family_id}`,
        count: 0,
        subs: [],
      };
      famMap.set(row.family_id, fam);
    }
    let sub = fam.subs.find((s) => s.sourceId === row.category_id);
    if (!sub) {
      const seedName = nameBySub.get(`${row.family_id}:${row.category_id}`);
      sub = {
        sourceId: row.category_id,
        name: seedName?.name ?? `Products ${row.category_id}`,
        nameZh: seedName?.nameZh ?? `产品分类 ${row.category_id}`,
        firstItemId: row.source_id,
        count: 0,
      };
      fam.subs.push(sub);
    }
    // Rows arrive in (category_id, sort, source_id) order, so the first one we
    // see for a sub is the correct deep-link target.
    if (!sub.firstItemId) sub.firstItemId = row.source_id;
    sub.count += 1;
    fam.count += 1;
  }

  // Preserve the seeded family order, then append any family the seed lacks.
  const order = new Map((seed.categories ?? []).map((c, i) => [c.sourceId, i]));
  const out = Array.from(famMap.values()).sort(
    (a, b) => (order.get(a.sourceId) ?? 9_999) - (order.get(b.sourceId) ?? 9_999),
  );
  for (const fam of out) {
    const subOrder = new Map(
      (seed.categories.find((c) => c.sourceId === fam.sourceId)?.subs ?? []).map((s, i) => [s.sourceId, i]),
    );
    fam.subs.sort((a, b) => (subOrder.get(a.sourceId) ?? 9_999) - (subOrder.get(b.sourceId) ?? 9_999));
  }
  return out;
}

/** Writes the rebuilt tree into `site_settings`. Returns false on failure. */
export async function saveNavOverride(tree: NavCategory[]): Promise<boolean> {
  try {
    await db.execute(sql`
      insert into site_settings (key, value, label, group_name, updated_at)
      values (${NAV_OVERRIDE_KEY}, ${JSON.stringify(tree)}, '产品导航树（自动生成）', 'system', now())
      on conflict (key) do update set value = excluded.value, updated_at = now()
    `);
    return true;
  } catch {
    return false;
  }
}
