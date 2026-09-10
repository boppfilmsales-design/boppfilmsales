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

export type NewsCategory = typeof newsCategories.$inferSelect;
export type NewsPost = typeof newsPosts.$inferSelect;
