import { eq, sql } from "drizzle-orm";
import seedRaw from "@/data/news-seed.json";
import { db } from "@/db";
import { adminContents, adminMessages, adminProducts, adminRoles, adminUsers, newsCategories, newsPosts, siteSettings } from "@/db/schema";
import { hashPassword } from "@/lib/password";

/**
 * The site-seed reader, imported statically.
 *
 * HISTORY: this used to be loaded through a deliberately non-analysable
 * specifier (`["@/db","site-seed-reader"].join("/")` + `webpackIgnore: true`)
 * to keep the 14 MB `site-seed.json` out of the admin bundle. That trick works
 * under the webpack dev server but **breaks at runtime** in the
 * `output: "standalone"` production server: Node cannot resolve a fabricated
 * "@/…" package name, so every cold start on an empty database died with
 * `ERR_MODULE_NOT_FOUND: Cannot find package '@/db'`.
 *
 * The static import below is safe because `site-seed-reader` opens
 * `site-seed.json` lazily *inside* its functions — importing the module does
 * not pull the JSON into the bundle graph the way `@/lib/site` does.
 */
import { readSiteSeed } from "@/db/site-seed-reader";

async function loadSiteSeedReader(): Promise<typeof import("@/db/site-seed-reader")> {
  return { readSiteSeed };
}

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
  await db.execute(sql`create table if not exists admin_roles (
      id serial primary key,
      key text not null,
      name text not null,
      name_zh text not null default '',
      description text not null default '',
      permissions_json text not null default '["*"]',
      is_built_in boolean not null default false,
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`create unique index if not exists admin_roles_key_key on admin_roles (key)`);
  await db.execute(sql`create table if not exists site_settings (
      id serial primary key,
      key text not null,
      value text not null default '',
      label text not null default '',
      group_name text not null default 'general',
      updated_at timestamptz not null default now()
    )`);
  await db.execute(sql`create unique index if not exists site_settings_key_key on site_settings (key)`);
  await db.execute(sql`create table if not exists admin_audit_log (
      id serial primary key,
      actor text not null default '',
      action text not null,
      detail text not null default '',
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at)`);
  await db.execute(sql`create table if not exists admin_messages (
      id serial primary key,
      author text not null default '',
      title text not null default '',
      body text not null,
      section_pid integer,
      column_source_id integer,
      status text not null default 'open',
      reply text not null default '',
      replied_by text not null default '',
      replied_at timestamptz,
      is_pinned boolean not null default false,
      created_at timestamptz not null default now()
    )`);
  await db.execute(sql`create index if not exists admin_messages_created_idx on admin_messages (created_at)`);
  await db.execute(sql`create index if not exists admin_messages_status_idx on admin_messages (status)`);
  for (const column of [
    ["display_name", "text not null default ''"],
    ["role_key", "text not null default 'owner'"],
    ["status", "text not null default 'active'"],
    ["last_login_at", "timestamptz"],
  ] as const) {
    await db.execute(sql.raw(`alter table admin_users add column if not exists ${column[0]} ${column[1]}`));
  }
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
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.username, ADMIN_USERNAME)).limit(1);
  const passwordHash = hashPassword(ADMIN_PASSWORD);
  if (existing) {
    await db
      .update(adminUsers)
      .set({ passwordHash, roleKey: "owner", status: "active" })
      .where(eq(adminUsers.id, existing.id));
    return;
  }
  await db.insert(adminUsers).values({
    username: ADMIN_USERNAME,
    passwordHash,
    displayName: "超级管理员",
    roleKey: "owner",
    status: "active",
  });
}

/** Built-in roles behind "高级管理 → 权限管理 → 角色管理". */
const ROLE_DEFS = [
  {
    key: "owner",
    name: "Super Admin",
    nameZh: "超级管理员",
    description: "拥有全部内容与高级管理权限，可管理角色与管理员账号。",
    permissionsJson: '["*"]',
    isBuiltIn: true,
  },
  {
    key: "editor",
    name: "Content Editor",
    nameZh: "内容编辑",
    description: "可维护产品、新闻、案例、下载等前台内容，不可进入权限管理。",
    permissionsJson: JSON.stringify(["about", "product", "news", "download", "case", "service", "contact", "other", "inquiry", "message"]),
    isBuiltIn: true,
  },
  {
    key: "sales",
    name: "Sales",
    nameZh: "销售",
    description: "仅可查看和跟进询盘、留言板，不可修改站点内容。",
    permissionsJson: JSON.stringify(["inquiry", "message"]),
    isBuiltIn: true,
  },
  {
    key: "viewer",
    name: "Read Only",
    nameZh: "只读访客",
    description: "仅可浏览后台数据，不能保存任何修改。",
    permissionsJson: JSON.stringify([]),
    isBuiltIn: true,
  },
];

async function seedRoles() {
  const existing = await db.select({ key: adminRoles.key }).from(adminRoles);
  const known = new Set(existing.map((row) => row.key));
  const missing = ROLE_DEFS.filter((def) => !known.has(def.key));
  if (missing.length > 0) {
    await db.insert(adminRoles).values(missing);
  }
}

/**
 * Default rows for "高级管理 → 系统管理 → 站点设置".
 *
 * These power the *live* front end: the company name, hotline, e-mail and
 * footer text are read through `getSiteSettings()` so an operator can change
 * them without a redeploy.
 */
const SETTING_DEFS = [
  { key: "site_name", value: "Hebei Xinguangxing Packing Material Co., Ltd.", label: "站点名称（英文）", groupName: "general" },
  { key: "site_name_zh", value: "河北新光兴包装材料有限公司", label: "站点名称（中文）", groupName: "general" },
  { key: "site_tagline", value: "BOPP Film & Packaging Material Manufacturer", label: "副标题 / Slogan", groupName: "general" },
  { key: "contact_person", value: "Ms. Linda", label: "联系人", groupName: "contact" },
  { key: "contact_phone", value: "+86-311-88888888", label: "联系电话", groupName: "contact" },
  { key: "contact_mobile", value: "+86-138-0000-0000", label: "手机 / WhatsApp", groupName: "contact" },
  { key: "contact_email", value: "sales@apigcl.com", label: "业务邮箱", groupName: "contact" },
  { key: "contact_address", value: "Xinguangxing Industrial Park, Shijiazhuang, Hebei, China", label: "公司地址（英文）", groupName: "contact" },
  { key: "contact_address_zh", value: "中国河北省石家庄市新光兴工业园", label: "公司地址（中文）", groupName: "contact" },
  { key: "footer_copyright", value: "© 2024 Hebei Xinguangxing Packing Material Co., Ltd. All rights reserved.", label: "页脚版权", groupName: "footer" },
  { key: "footer_beian", value: "冀ICP备00000000号", label: "备案号", groupName: "footer" },
  { key: "products_per_page", value: "9", label: "前台产品分页条数", groupName: "display" },
  { key: "news_per_page", value: "10", label: "前台新闻分页条数", groupName: "display" },
  { key: "site_status", value: "online", label: "站点状态（online / maintenance）", groupName: "display" },
  { key: "maintenance_notice", value: "网站正在维护升级，请稍后访问。", label: "维护公告", groupName: "display" },
];

async function seedSettings() {
  const existing = await db.select({ key: siteSettings.key }).from(siteSettings);
  const known = new Set(existing.map((row) => row.key));
  const missing = SETTING_DEFS.filter((def) => !known.has(def.key));
  if (missing.length > 0) {
    await db.insert(siteSettings).values(missing);
  }
}

/** Starter notes so 高级管理 → 留言板 is never an empty screen. */
const MESSAGE_DEFS = [
  {
    author: "xgxadmin",
    title: "关于本后台的镜像同步说明",
    body:
      "本站后台按源站 apigcl.com 的结构重建，分为「内容管理」与「高级管理」两大区块。\n" +
      "内容管理的每一列均可直接编辑并保存，保存后前台会立即生效。\n" +
      "如有栏目需要新增或调整，请在此留言给管理员。",
    sectionPid: 1,
    columnSourceId: 13,
    status: "open",
    isPinned: true,
  },
  {
    author: "xgxadmin",
    title: "下载中心 PDF 文件命名规范",
    body:
      "下载中心的文件地址请使用 /downloads/ 开头的相对路径，例如 /downloads/bopp-film-tds.pdf。\n" +
      "编号列用于前台列表显示，建议格式为 TDS-001 这类可排序的短编号。",
    sectionPid: 42,
    columnSourceId: 76,
    status: "open",
    isPinned: false,
  },
  {
    author: "xgxadmin",
    title: "新闻中心各栏目投稿要求",
    body:
      "Industry News / Company News / Employees Literary 三个栏目共用同一套编辑器。\n" +
      "发布日期留空时会自动按当前时间排序；摘要为空时将截取正文前 400 字。",
    sectionPid: 2,
    columnSourceId: 41,
    status: "open",
    isPinned: false,
  },
];

async function seedMessages() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminMessages);
  if (total > 0) return;
  await db.insert(adminMessages).values(MESSAGE_DEFS);
}

async function seedProducts() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminProducts);
  if (total > 0) return;

  // Read the seed file directly instead of going through `@/lib/site`.
  // Even a *dynamic* `import("@/lib/site")` is statically traced by the
  // bundler, so it re-attached the 14 MB site-seed.json to every admin route
  // that imports this module (via `ensureSeedData`). Reading the JSON here
  // keeps the module graph free of that edge on the admin side.
  const { readSiteSeed } = await loadSiteSeedReader();
  const values = readSiteSeed().allProducts().map(({ category, product }, index) => ({
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

  const chunkSize = 20;
  for (let i = 0; i < values.length; i += chunkSize) {
    await db.insert(adminProducts).values(values.slice(i, i + chunkSize));
  }
}

async function seedContents() {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(adminContents);
  if (total > 0) return;

  const { readSiteSeed } = await loadSiteSeedReader();
  const contents = readSiteSeed().getContents();
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
  await seedRoles();
  await seedSettings();
  await seedMessages();
}

/**
 * Cheap probe: is the database already populated?
 *
 * Runs one `count(*)` on the small `admin_users` table. When rows exist we know
 * a previous boot completed the full seed, so we can skip the expensive
 * `init()` entirely.
 */
async function isDatabasePopulated(): Promise<boolean> {
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(adminUsers);
  return (row?.total ?? 0) > 0;
}

/**
 * Ensures the schema exists and seed data is present.
 *
 * IMPORTANT (performance): the previous implementation re-ran the *entire*
 * seed (`ensureSchema` + upserts over 33 contents / 159 products / 92 posts)
 * on the first request of every 8-second window and on every cold lambda boot.
 * With Neon over the network each such run cost tens of seconds and blocked
 * every admin page/API call.
 *
 * New behaviour:
 *  - one cheap `count(*)` probe decides whether seeding is needed at all;
 *  - the full seed runs at most ONCE per process lifetime;
 *  - once seeded successfully the result is cached for the life of the process,
 *    so steady-state requests pay nothing.
 */
let readyPromise: Promise<void> | null = null;
let seeded = false;

export function ensureSeedData(): Promise<void> {
  if (seeded) return Promise.resolve();
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    // `ensureSchema` is cheap (idempotent `create table if not exists` + a
    // couple of `alter table` no-ops) and — crucially — it is what adds the
    // 高级管理 tables/columns to databases seeded before those existed.
    await ensureSchema();
    if (await isDatabasePopulated()) {
      // Already seeded: only the additive 高级管理 defaults may be missing.
      await seedRoles();
      await seedSettings();
      await seedMessages();
      seeded = true;
      return;
    }
    await init();
    seeded = true;
  })().catch((error) => {
    // Allow a later request to retry after a transient failure.
    readyPromise = null;
    console.error("[seed] failed", error);
    throw error;
  });

  return readyPromise;
}
