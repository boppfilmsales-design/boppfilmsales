import homeSummaryJson from "@/data/home-summary.json";
import siteNavJson from "@/data/site-nav.json";
import { getNavOverride } from "@/lib/nav-sync";

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
  sampleNames: string[];
  sampleNamesZh: string[];
  subs: NavSub[];
};

export type HomeFeatured = {
  category: { sourceId: number; name: string; nameZh: string };
  product: { sourceId: number; title: string; titleZh: string; gallery0: string };
};

export type HomeGalleryItem = { src: string; title: string };
export type HomePdf = { label: string; file: string; product: string };

export type HomeSummary = {
  categories: NavCategory[];
  featured: HomeFeatured[];
  gallery: HomeGalleryItem[];
  pdfs: HomePdf[];
  totalProducts: number;
  aboutZhHtml: string;
};

/** Seeded tree from `site-nav.json`. Synchronous — safe anywhere. */
export function getNavCategories(): NavCategory[] {
  return (siteNavJson as unknown as { categories: NavCategory[] }).categories;
}

/**
 * Mega-menu tree, preferring the override that 信息转移 refreshes after a
 * product move.
 *
 * The seeded tree is the baseline because `sampleNames` / `sampleNamesZh` (used
 * by the home page) only exist there. The override carries the live `count` and
 * `firstItemId` per sub, so we overlay just those two fields and keep every
 * seeded field intact. Pages that render the menu should call this instead of
 * `getNavCategories()` so a moved product stops being advertised in its old
 * sub-category.
 */
export async function getNavCategoriesLive(): Promise<NavCategory[]> {
  const base = getNavCategories();
  let override: { sourceId: number; count: number; subs: { sourceId: number; count: number; firstItemId: number }[] }[] | null = null;
  try {
    override = await getNavOverride();
  } catch {
    override = null;
  }
  if (!override) return base;

  const famById = new Map(override.map((f) => [f.sourceId, f]));
  return base.map((fam) => {
    const live = famById.get(fam.sourceId);
    if (!live) return fam;
    const subById = new Map((live.subs ?? []).map((s) => [s.sourceId, s]));
    return {
      ...fam,
      count: live.count ?? fam.count,
      subs: fam.subs.map((sub) => {
        const liveSub = subById.get(sub.sourceId);
        return liveSub
          ? { ...sub, count: liveSub.count ?? sub.count, firstItemId: liveSub.firstItemId ?? sub.firstItemId }
          : sub;
      }),
    };
  });
}

export function getHomeSummary(): HomeSummary {
  return homeSummaryJson as unknown as HomeSummary;
}
