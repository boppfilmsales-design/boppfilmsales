/**
 * Standalone reader for `src/data/site-seed.json` (~14 MB).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The seed routine (`src/db/seed.ts`) needs the full site seed exactly once,
 * only when the database is empty. It used to reach that data through
 * `@/lib/site`, but the bundler **statically traces even dynamic imports with
 * literal specifiers**, so `import("@/lib/site")` re-attached the entire 14 MB
 * JSON to every admin API route that (transitively) imports `seed.ts` via
 * `ensureSeedData()`. That produced ~16 MB server chunks and 70–110 s requests.
 *
 * By keeping the JSON read here — and only ever reaching this module through a
 * non-analysable dynamic import — the admin module graph stays free of the
 * 14 MB payload. Nothing on the admin request path should import this module
 * statically.
 */

import seed from "@/data/site-seed.json";

export type SeedProductItem = {
  sourceId: number;
  catId: number;
  title: string;
  titleZh: string;
  summary: string;
  summaryZh: string;
  code: string;
  price: string;
  gallery?: string[];
  description?: string;
  descriptionZh?: string;
  technical?: string;
  technicalZh?: string;
  offer?: string;
  offerZh?: string;
  bodyHtml?: string;
  bodyHtmlZh?: string;
  pdfs?: unknown[];
};

export type SeedSub = {
  sourceId: number;
  name: string;
  nameZh?: string;
  itemIds?: number[];
  items?: SeedProductItem[];
};

export type SeedCategory = {
  sourceId: number;
  name: string;
  nameZh?: string;
  itemIds?: number[];
  subs: SeedSub[];
};

export type SeedContent = {
  kind: "about" | "down" | "honor" | "cases" | "service" | "lines";
  sourceId: number;
  name: string;
  nameZh: string;
  items?: unknown;
  itemsZh?: unknown;
  entries?: unknown[];
};

type SeedShape = {
  products?: SeedCategory[];
  contents?: SeedContent[];
};

const data = seed as unknown as SeedShape;
const products: SeedCategory[] = data.products ?? [];
const contents: SeedContent[] = data.contents ?? [];

export function readSiteSeed() {
  return {
    products,
    contents,

    getContents(kind?: SeedContent["kind"]): SeedContent[] {
      if (kind === undefined) return contents;
      return contents.filter((c) => c.kind === kind);
    },

    /** Flattens every sub-category item into `{ category, sub, product }`. */
    allProducts(): { category: SeedCategory; sub: SeedSub; product: SeedProductItem }[] {
      const out: { category: SeedCategory; sub: SeedSub; product: SeedProductItem }[] = [];
      for (const category of products) {
        for (const sub of category.subs ?? []) {
          for (const product of sub.items ?? []) {
            if (product) out.push({ category, sub, product });
          }
        }
      }
      return out;
    },
  };
}

export type SiteSeed = ReturnType<typeof readSiteSeed>;
