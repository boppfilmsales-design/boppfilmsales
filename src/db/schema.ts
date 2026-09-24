import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * News categories mirror the three tabs of the legacy site (news.php):
 * Industry News (c_id=41), Company News (c_id=49), Employees Literary (c_id=52).
 */
export const newsCategories = pgTable(
  "news_categories",
  {
    id: serial("id").primaryKey(),
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

export const newsPosts = pgTable(
  "news_posts",
  {
    id: serial("id").primaryKey(),
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
    isPublished: boolean("is_published").notNull().default(true),
    sortDate: timestamp("sort_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("news_posts_category_idx").on(table.categoryId),
    index("news_posts_sort_idx").on(table.sortDate),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Display name shown in the admin chrome (legacy "超级管理员"). */
    displayName: text("display_name").notNull().default(""),
    /** Role key — see `admin_roles`. "owner" is the built-in super admin. */
    roleKey: text("role_key").notNull().default("owner"),
    /** "active" | "disabled" */
    status: text("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_username_key").on(table.username)],
);

/**
 * Roles of the legacy "高级管理 → 权限管理 → 角色管理" screen.
 * `permissionsJson` is a list of section keys the role may manage; the built-in
 * `owner` role bypasses the check entirely.
 */
export const adminRoles = pgTable(
  "admin_roles",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    nameZh: text("name_zh").notNull().default(""),
    description: text("description").notNull().default(""),
    /** JSON array of AdminSection pid values, or ["*"] for everything. */
    permissionsJson: text("permissions_json").notNull().default('["*"]'),
    isBuiltIn: boolean("is_built_in").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_roles_key_key").on(table.key)],
);

/**
 * Key/value store behind "高级管理 → 系统管理 → 站点设置".
 * Values are stored as TEXT; `valueJson` holds the serialised form when the
 * setting is structured.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    value: text("value").notNull().default(""),
    label: text("label").notNull().default(""),
    groupName: text("group_name").notNull().default("general"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_settings_key_key").on(table.key)],
);

/**
 * Audit trail for "高级管理 → 系统管理 → 信息转移" and other destructive bulk
 * operations, so an operator can see what moved where.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: serial("id").primaryKey(),
    actor: text("actor").notNull().default(""),
    action: text("action").notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_audit_log_created_idx").on(table.createdAt)],
);

/**
 * Backs "高级管理 → 留言板": an internal message board where operators leave
 * notes for each other, optionally tied to a section/column of the panel.
 */
export const adminMessages = pgTable(
  "admin_messages",
  {
    id: serial("id").primaryKey(),
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
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_messages_created_idx").on(table.createdAt),
    index("admin_messages_status_idx").on(table.status),
  ],
);

export const adminProducts = pgTable(
  "admin_products",
  {
    id: serial("id").primaryKey(),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_products_source_id_key").on(table.sourceId), index("admin_products_family_idx").on(table.familyId)],
);

export const adminContents = pgTable(
  "admin_contents",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull().default(""),
    nameZh: text("name_zh").notNull().default(""),
    dataJson: text("data_json").notNull().default("{}"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_contents_source_id_key").on(table.sourceId), index("admin_contents_kind_idx").on(table.kind)],
);

export const inquiries = pgTable(
  "inquiries",
  {
    id: serial("id").primaryKey(),
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
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    /** Approved for display on the public message wall. Off until reviewed. */
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
