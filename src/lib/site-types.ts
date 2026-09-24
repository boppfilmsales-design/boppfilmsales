/**
 * Client-side (browser-safe) shape definitions shared between the admin UI and
 * the API routes.
 *
 * IMPORTANT — why this file exists:
 * `@/lib/site` eagerly imports `src/data/site-seed.json` (~14 MB). Any module
 * that imports *anything* from `site.ts` drags that 14 MB payload into its
 * bundle. The admin dashboard used to import only the `SiteContent` **type**
 * from `site.ts`; TypeScript erases types, but the bundler still followed the
 * module and pulled the whole 14 MB JSON into the admin server route (3 ×
 * ~15.7 MB server chunks), which made every admin page/API call slow.
 *
 * Keep type-only definitions here and import them instead of `@/lib/site`.
 *
 * The shapes below are deliberately the **superset** of the two producers of
 * `SiteContent`:
 *  - `src/lib/site.ts` (static `site-seed.json`, the read path used by pages)
 *  - DB-backed rows written by `admin_contents.data_json` (admin/API path)
 * Only the admin/API path actually writes; the static path is read-only, so
 * narrower optional fields are safe.
 */

export type PdfRef = { file: string; label: string };

export type ContentCard = {
  sourceId?: number;
  title?: string;
  titleZh?: string;
  image?: string;
  externalUrl?: string;
  url?: string;
  hot?: boolean;
};

export type ContentEntry = {
  sourceId?: number;
  kind?: string;
  columnId?: number;
  title?: string;
  titleZh?: string;
  name?: string;
  date?: string;
  dateZh?: string;
  image?: string;
  images?: string[];
  externalUrl?: string;
  url?: string;
  isLink?: boolean;
  bodyHtml?: string;
  bodyHtmlZh?: string;
};

export type SiteContentItems = {
  bodyHtml?: string;
  bodyHtmlZh?: string;
  images?: string[];
  [key: string]: unknown;
};

export type SiteContent = {
  sourceId: number;
  kind: "about" | "down" | "honor" | "cases" | "service" | "lines";
  name: string;
  nameZh: string;
  items?: SiteContentItems | ContentCard[];
  itemsZh?: SiteContentItems | ContentCard[];
  entries?: ContentEntry[];
};
