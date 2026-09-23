import { eq, sql } from "drizzle-orm";
import seedRaw from "@/data/news-seed.json";
import { db } from "@/db";
import { adminContents, adminProducts, adminUsers, newsCategories, newsPosts } from "@/db/schema";
import { allProducts, getContents } from "@/lib/site";
import { hashPassword } from "@/lib/password";

export type SeedItem = {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  sourceId: number;
  listTitle?: string;
  listDate?: string;
  listImage?: string;
  listExcerpt?: string;
  title?: string;
  newsDate?: string;
  image?: string;
  bodyHtml?: string;
  bodyText?: string;
};

const SEED_ITEMS = seedRaw as unknown as SeedItem[];

export const CATEGORY_DEFS = [
  { slug: "industry-news", name: "Industry News", sourceId: 41, sortOrder: 1 },
  { slug: "company-news", name: "Company News", sourceId: 49, sortOrder: 2 },
  { slug: "employees-literary", name: "Employees Literary", sourceId: 52, sortOrder: 3 },
];

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "xgxadmin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "xgxadmin";

async function ensureSchema() {
  await db.execute(sql`
    create table if not exists news_categories (
      id serial primary key,
      slug text not null,
      name text not null,
      source_id integer not null,
      sort_order integer not null default 0
    )`);
  await db.execute(sql`create unique index if not exists news_categories_slug_key on news_categories (slug)`);
  await db.execute(
    sql`create unique index if not exists news_categories_source_id_key on news_categories (source_id)`,
  );
  await db.execute(sql`
    create table if not exists news_posts (
      id serial primary key,
      category_id integer not null references news_categories(id) on delete cascade,
      source_id integer,
      title text not null,
      list_date text not null default '',
      news_date text not null default '',
      excerpt text not null default '',
      body_html text not null default '',
      body_text text not null default '',
      image text not null default '',
      is_published boolean not null default true,
      sort_date timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
  await db.execute(sql`create index if not exists news_posts_category_idx on news_posts (category_id)`);
  await db.execute(sql`create index if not exists news_posts_sort_idx on news_posts (sort_date)`);
  await db.execute(sql`
    create table if not exists admin_users (
      id serial primary key,
      username text not null,
      password_hash text not null,
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`create unique index if not exists admin_users_username_key on admin_users (username)`);
  await db.execute(sql`
    create table if not exists admin_products (
      id serial primary key,
      source_id integer not null unique,
      family_id integer not null,
      category_id integer not null,
      sort integer not null default 10,
      title text not null,
      title_zh text not null default '',
      subtitle text not null default '',
      subtitle_zh text not null default '',
      code text not null default '',
      price text not null default '',
      image text not null default '',
      gallery_json text not null default '[]',
      body_html text not null default '',
      body_text text not null default '',
      body_html_zh text not null default '',
      description text not null default '',
      description_zh text not null default '',
      technical text not null default '',
      technical_zh text not null default '',
      offer text not null default '',
      offer_zh text not null default '',
      pdfs_json text not null default '[]',
      status text not null default '正常',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`);
  for (const column of [
    ["title_zh", "text not null default ''"], ["subtitle_zh", "text not null default ''"],
    ["code", "text not null default ''"], ["price", "text not null default ''"],
    ["gallery_json", "text not null default '[]'"], ["body_html_zh", "text not null default ''"],
    ["description", "text not null default ''"], ["description_zh", "text not null default ''"],
    ["technical", "text not null default ''"], ["technical_zh", "text not null default ''"],
    ["offer", "text not null default ''"], ["offer_zh", "text not null default ''"],
    ["pdfs_json", "text not null default '[]'"],
  ] as const) {
    await db.execute(sql.raw(`alter table admin_products add column if not exists ${column[0]} ${column[1]}`));
  }
  await db.execute(sql`create index if not exists admin_products_family_idx on admin_products (family_id)`);
  await db.execute(sql`
    create table if not exists admin_contents (
      id serial primary key,
      source_id integer not null unique,
      kind text not null,
      name text not null default '',
      name_zh text not null default '',
      data_json text not null default '{}',
      updated_at timestamptz not null default now()
    )`);
  await db.execute(sql`create index if not exists admin_contents_kind_idx on admin_contents (kind)`);
}

export function parseSortDate(listDate: string, newsDate: string): Date | null {
  const mmddyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(listDate.trim());
  if (mmddyyyy) {
    return new Date(`${mmddyyyy[3]}-${mmddyyyy[1]}-${mmddyyyy[2]}T00:00:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(newsDate.trim())) {
    return new Date(`${newsDate.trim()}T00:00:00Z`);
  }
  return null;
}

async function seedCategories() {
  const existing = await db.select({ id: newsCategories.id, slug: newsCategories.slug }).from(newsCategories);
  const known = new Set(existing.map((row) => row.slug));
  const missing = CATEGORY_DEFS.filter((def) => !known.has(def.slug));
  if (missing.length > 0) {
    await db.insert(newsCategories).values(missing);
  }
}

async function seedPosts() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(newsPosts);
  if (total > 0) return;

  const rows = await db.select({ id: newsCategories.id, slug: newsCategories.slug }).from(newsCategories);
  const bySlug = new Map(rows.map((row) => [row.slug, row.id]));

  const values = SEED_ITEMS.map((item) => {
    const categoryId = bySlug.get(item.categorySlug);
    if (!categoryId) return null;
    const listDate = item.listDate ?? "";
    const newsDate = item.newsDate ?? "";
    return {
      categoryId,
      sourceId: item.sourceId,
      title: (item.title || item.listTitle || "").trim() || "Untitled",
      listDate,
      newsDate,
      excerpt: (item.listExcerpt || item.bodyText || "").trim().slice(0, 400),
      bodyHtml: item.bodyHtml ?? "",
      bodyText: item.bodyText ?? "",
      image: item.image ? `/uploads/news/${item.image}` : "",
      isPublished: true,
      sortDate: parseSortDate(listDate, newsDate),
    };
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  const chunkSize = 20;
  for (let i = 0; i < values.length; i += chunkSize) {
    await db.insert(newsPosts).values(values.slice(i, i + chunkSize));
  }
}

async function seedAdmin() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminUsers);
  if (total > 0) return;
  await db.insert(adminUsers).values({
    username: ADMIN_USERNAME,
    passwordHash: hashPassword(ADMIN_PASSWORD),
  });
}

async function seedProducts() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminProducts);
  const values = allProducts().map(({ category, product }, index) => ({
    sourceId: product.sourceId,
    familyId: category.sourceId,
    categoryId: product.catId,
    sort: index + 1,
    title: product.title,
    titleZh: product.titleZh,
    subtitle: product.summary,
    subtitleZh: product.summaryZh,
    code: product.code,
    price: product.price,
    image: product.gallery?.[0] ?? "",
    galleryJson: JSON.stringify(product.gallery ?? []),
    bodyHtml: product.bodyHtml || product.description || "",
    bodyText: product.summary,
    bodyHtmlZh: product.bodyHtmlZh,
    description: product.description,
    descriptionZh: product.descriptionZh,
    technical: product.technical,
    technicalZh: product.technicalZh,
    offer: product.offer,
    offerZh: product.offerZh,
    pdfsJson: JSON.stringify(product.pdfs ?? []),
    status: "正常",
  }));

  if (total > 0) {
    for (const value of values) {
      await db.update(adminProducts).set(value).where(eq(adminProducts.sourceId, value.sourceId));
    }
    return;
  }

  const chunkSize = 20;
  for (let i = 0; i < values.length; i += chunkSize) {
    await db.insert(adminProducts).values(values.slice(i, i + chunkSize));
  }
}

async function seedContents() {
  const contents = getContents();
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminContents);
  if (total > 0) return;
  for (const content of contents) {
    await db.insert(adminContents).values({
      sourceId: content.sourceId,
      kind: content.kind,
      name: content.name,
      nameZh: content.nameZh,
      dataJson: JSON.stringify({ items: content.items, itemsZh: content.itemsZh, entries: content.entries }),
    });
  }
}

async function init() {
  await ensureSchema();
  await seedCategories();
  await seedPosts();
  await seedAdmin();
  await seedProducts();
  await seedContents();
}

let readyPromise: Promise<void> | null = null;
let readyStartedAt = 0;
const STALE_MS = 8000;

export function ensureSeedData(): Promise<void> {
  const now = Date.now();
  if (!readyPromise || now - readyStartedAt > STALE_MS) {
    readyStartedAt = now;
    readyPromise = init().catch((error) => {
      readyPromise = null;
      console.error("[seed] failed", error);
      throw error;
    });
  }
  return readyPromise;
}
