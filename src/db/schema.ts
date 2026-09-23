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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("admin_users_username_key").on(table.username)],
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
    message: text("message").notNull(),
    language: text("language").notNull().default("en"),
    status: text("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inquiries_created_at_idx").on(table.createdAt)],
);

export type NewsCategory = typeof newsCategories.$inferSelect;
export type NewsPost = typeof newsPosts.$inferSelect;
export type Inquiry = typeof inquiries.$inferSelect;
