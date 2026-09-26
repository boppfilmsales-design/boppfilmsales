import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * SQLite / Cloudflare D1 flavour of the site schema.
 *
 * This file is the single source of truth now that the site runs on
 * Cloudflare Workers with a D1 binding. Table and column names are kept
 * byte-identical to the previous PostgreSQL schema (`news_categories`,
 * `news_posts`, `source_id`, ...) so that every query in `src/lib` and
 * `src/app/api` keeps working unchanged.
 *
 * Type mapping from PostgreSQL:
 *   serial      -> integer primary key autoincrement
 *   text        -> text
 *   boolean     -> integer (0/1, mode: "boolean")
 *   timestamptz -> integer (Unix epoch ms, mode: "timestamp_ms")
 *
 * The original PostgreSQL definitions are kept for reference in
 * `.zh-work/backup/schema.postgres.ts.bak` (local only, not committed).
 */

/** Helper: a created/updated timestamp column defaulting to "now". */
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });

/**
 * News categories mirror the three tabs of the legacy site (news.php):
 * Industry News (c_id=41), Company News (c_id=49), Employees Literary (c_id=52).
 * The article columns (cases/service) reuse the same table — see
 * `src/lib/article-columns.ts`.
 */
export const newsCategories = sqliteTable(
  "news_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    sourceId: integer("source_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("news_categories_slug_key").on(table.slug),
    uniqueIndex("news_categories_source_id_key").on(table.sourceId),
  ],
);

export const newsPosts = sqliteTable(
  "news_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => newsCategories.id, { onDelete: "cascade" }),
    sourceId: integer("source_id"),
    title: text("title").notNull(),
    /** Date string exactly as printed on the legacy listing page, e.g. "09/10/2018". */
    listDate: text("list_date").notNull().default(""),
    /** Real publish date of the article (legacy detail page "Time：YYYY-MM-DD"). */
    newsDate: text("news_date").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    bodyHtml: text("body_html").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    image: text("image").notNull().default(""),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
    sortDate: ts("sort_date"),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("news_posts_category_idx").on(table.categoryId),
    index("news_posts_sort_idx").on(table.sortDate),
  ],
);

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Display name shown in the admin chrome (legacy "超级管理员"). */
    displayName: text("display_name").notNull().default(""),
    /** Role key — see `admin_roles`. "owner" is the built-in super admin. */
    roleKey: text("role_key").notNull().default("owner"),
    /** "active" | "disabled" */
    status: text("status").notNull().default("active"),
    lastLoginAt: ts("last_login_at"),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("admin_users_username_key").on(table.username)],
);

/**
 * Roles of the legacy "高级管理 → 权限管理 → 角色管理" screen.
 * `permissionsJson` is a list of section keys the role may manage; the built-in
 * `owner` role bypasses the check entirely.
 */
export const adminRoles = sqliteTable(
  "admin_roles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    nameZh: text("name_zh").notNull().default(""),
    description: text("description").notNull().default(""),
    /** JSON array of AdminSection pid values, or ["*"] for everything. */
    permissionsJson: text("permissions_json").notNull().default('["*"]'),
    isBuiltIn: integer("is_built_in", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("admin_roles_key_key").on(table.key)],
);

/**
 * Key/value store behind "高级管理 → 系统管理 → 站点设置".
 * Values are stored as TEXT; `valueJson` holds the serialised form when the
 * setting is structured.
 */
export const siteSettings = sqliteTable(
  "site_settings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    value: text("value").notNull().default(""),
    label: text("label").notNull().default(""),
    groupName: text("group_name").notNull().default("general"),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("site_settings_key_key").on(table.key)],
);

/**
 * Audit trail for "高级管理 → 系统管理 → 信息转移" and other destructive bulk
 * operations, so an operator can see what moved where.
 */
export const adminAuditLog = sqliteTable(
  "admin_audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actor: text("actor").notNull().default(""),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("admin_audit_log_created_idx").on(table.createdAt)],
);

/**
 * Backs "高级管理 → 留言板": an internal message board where operators leave
 * notes for each other, optionally tied to a section/column of the panel.
 */
export const adminMessages = sqliteTable(
  "admin_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    author: text("author").notNull().default(""),
    title: text("title").notNull().default(""),
    body: text("body").notNull(),
    /** Optional deep-link target, e.g. "13" for the About Us column. */
    sectionPid: integer("section_pid"),
    columnSourceId: integer("column_source_id"),
    /** "open" | "replied" | "closed" */
    status: text("status").notNull().default("open"),
    reply: text("reply").notNull().default(""),
    repliedBy: text("replied_by").notNull().default(""),
    repliedAt: ts("replied_at"),
    isPinned: integer("is_pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("admin_messages_created_idx").on(table.createdAt),
    index("admin_messages_status_idx").on(table.status),
  ],
);

export const adminProducts = sqliteTable(
  "admin_products",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id").notNull(),
    familyId: integer("family_id").notNull(),
    categoryId: integer("category_id").notNull(),
    sort: integer("sort").notNull().default(10),
    title: text("title").notNull(),
    titleZh: text("title_zh").notNull().default(""),
    subtitle: text("subtitle").notNull().default(""),
    subtitleZh: text("subtitle_zh").notNull().default(""),
    code: text("code").notNull().default(""),
    price: text("price").notNull().default(""),
    image: text("image").notNull().default(""),
    galleryJson: text("gallery_json").notNull().default("[]"),
    bodyHtml: text("body_html").notNull().default(""),
    bodyText: text("body_text").notNull().default(""),
    bodyHtmlZh: text("body_html_zh").notNull().default(""),
    description: text("description").notNull().default(""),
    descriptionZh: text("description_zh").notNull().default(""),
    technical: text("technical").notNull().default(""),
    technicalZh: text("technical_zh").notNull().default(""),
    offer: text("offer").notNull().default(""),
    offerZh: text("offer_zh").notNull().default(""),
    pdfsJson: text("pdfs_json").notNull().default("[]"),
    status: text("status").notNull().default("正常"),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("admin_products_source_id_key").on(table.sourceId),
    index("admin_products_family_idx").on(table.familyId),
  ],
);

export const adminContents = sqliteTable(
  "admin_contents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull().default(""),
    nameZh: text("name_zh").notNull().default(""),
    dataJson: text("data_json").notNull().default("{}"),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("admin_contents_source_id_key").on(table.sourceId),
    index("admin_contents_kind_idx").on(table.kind),
  ],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    company: text("company").notNull().default(""),
    contact: text("contact").notNull(),
    email: text("email").notNull(),
    /** Tel / mobile supplied by the customer. Kept — it used to be dropped. */
    phone: text("phone").notNull().default(""),
    message: text("message").notNull(),
    language: text("language").notNull().default("en"),
    /** Which front-end page the message arrived from ("/" or "/contact"). */
    sourcePage: text("source_page").notNull().default("/contact"),
    /** "new" | "processing" | "replied" | "archived" */
    status: text("status").notNull().default("new"),
    /** Operator reply, mirrored to the customer by e-mail out of band. */
    reply: text("reply").notNull().default(""),
    repliedBy: text("replied_by").notNull().default(""),
    repliedAt: ts("replied_at"),
    /** Approved for display on the public message wall. Off until reviewed. */
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    createdAt: ts("created_at").notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index("inquiries_created_at_idx").on(table.createdAt),
    index("inquiries_status_idx").on(table.status),
    index("inquiries_public_idx").on(table.isPublic),
  ],
);

export type NewsCategory = typeof newsCategories.$inferSelect;
export type NewsPost = typeof newsPosts.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminRole = typeof adminRoles.$inferSelect;
export type SiteSetting = typeof siteSettings.$inferSelect;
export type AdminAuditEntry = typeof adminAuditLog.$inferSelect;
export type AdminMessage = typeof adminMessages.$inferSelect;
