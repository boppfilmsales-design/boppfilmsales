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
 * HOW IT STAYS CHEAP NOW
 * ----------------------
 * The JSON is **not** a static `import`. It is read from disk lazily, inside a
 * memoised function, so merely importing this module costs nothing and the
 * bundler has no edge to `site-seed.json` at all.
 *
 * This matters for the `output: "standalone"` production build: the previous
 * approach — a non-analysable dynamic specifier plus `webpackIgnore` — cannot
 * survive there, because Node cannot resolve a fabricated "@/…" package name
 * (`ERR_MODULE_NOT_FOUND: Cannot find package '@/db'` on every cold start).
 * Reading the file with `fs` is bundler-independent and works everywhere.
 */

import fs from "node:fs";
import path from "node:path";

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

/**
 * Resolves `src/data/site-seed.json` without a bundler edge.
 *
 * The build output puts this module either at `<root>/src/db/…` (dev / tsc) or
 * inside `.next/server/chunks/…` (bundled), so several candidate roots are
 * probed. The first existing file wins and the parsed result is memoised for
 * the life of the process.
 */
function candidatePaths(): string[] {
  const cwd = process.cwd();
  const relative = ["src", "data", "site-seed.json"];
  return [
    path.join(cwd, ...relative),
    // standalone output: server.js sits at <root>/.next/standalone/
    path.join(cwd, "..", "..", ...relative),
    path.join(cwd, "..", "..", "..", ...relative),
    path.resolve(__dirname, "..", "..", "..", ...relative),
    path.resolve(__dirname, "..", "..", "..", "..", ...relative),
  ];
}

let cached: SeedShape | null = null;

function loadSeed(): SeedShape {
  if (cached) return cached;
  let lastError: unknown = null;
  for (const candidate of candidatePaths()) {
    try {
      if (!fs.existsSync(candidate)) continue;
      cached = JSON.parse(fs.readFileSync(candidate, "utf8")) as SeedShape;
      return cached;
    } catch (err) {
      lastError = err;
    }
  }
  // Degrade to an empty seed rather than throwing: callers already handle the
  // "no data" case, and a missing seed file must not take an admin route down.
  console.error("[site-seed-reader] could not read site-seed.json", lastError);
  cached = {};
  return cached;
}

export function readSiteSeed() {
  const data = loadSeed();
  const products: SeedCategory[] = data.products ?? [];
  const contents: SeedContent[] = data.contents ?? [];

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
