/**
 * Inline SQLite DDL for the site schema — a safety net for a brand-new D1
 * database.
 *
 * The canonical schema now lives in `src/db/schema.ts` and is applied to D1
 * with the drizzle migration in `drizzle/0000_init_d1.sql`:
 *
 *   npx wrangler d1 migrations apply boppfilmsales-db --remote
 *
 * `ensureSchema()` in `src/db/seed.ts` runs the statements below only when the
 * `news_categories` table is missing, so a freshly created database can still
 * bootstrap itself without a manual migration step.
 *
 * Deliberately absent: `alter table ... add column`. SQLite has no
 * `add column if not exists`, and these CREATE statements already describe
 * every column, so a database built here is complete from the start.
 *
 * Column types follow `src/db/schema.ts`: timestamps are integer epoch
 * milliseconds, booleans are integer 0/1.
 */
export const D1_SCHEMA_STATEMENTS: readonly string[] = [
  `create table if not exists news_categories (
    id integer primary key autoincrement not null,
    slug text not null,
    name text not null,
    source_id integer not null,
    sort_order integer default 0 not null
  )`,
  `create unique index if not exists news_categories_slug_key on news_categories (slug)`,
  `create unique index if not exists news_categories_source_id_key on news_categories (source_id)`,

  `create table if not exists news_posts (
    id integer primary key autoincrement not null,
    category_id integer not null references news_categories(id) on delete cascade,
    source_id integer,
    title text not null,
    list_date text default '' not null,
    news_date text default '' not null,
    excerpt text default '' not null,
    body_html text default '' not null,
    body_text text default '' not null,
    image text default '' not null,
    is_published integer default 1 not null,
    sort_date integer,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create index if not exists news_posts_category_idx on news_posts (category_id)`,
  `create index if not exists news_posts_sort_idx on news_posts (sort_date)`,

  `create table if not exists admin_users (
    id integer primary key autoincrement not null,
    username text not null,
    password_hash text not null,
    display_name text default '' not null,
    role_key text default 'owner' not null,
    status text default 'active' not null,
    last_login_at integer,
    created_at integer not null
  )`,
  `create unique index if not exists admin_users_username_key on admin_users (username)`,

  `create table if not exists admin_roles (
    id integer primary key autoincrement not null,
    key text not null,
    name text not null,
    name_zh text default '' not null,
    description text default '' not null,
    permissions_json text default '["*"]' not null,
    is_built_in integer default 0 not null,
    created_at integer not null
  )`,
  `create unique index if not exists admin_roles_key_key on admin_roles (key)`,

  `create table if not exists site_settings (
    id integer primary key autoincrement not null,
    key text not null,
    value text default '' not null,
    label text default '' not null,
    group_name text default 'general' not null,
    updated_at integer not null
  )`,
  `create unique index if not exists site_settings_key_key on site_settings (key)`,

  `create table if not exists admin_audit_log (
    id integer primary key autoincrement not null,
    actor text default '' not null,
    action text not null,
    detail text default '' not null,
    created_at integer not null
  )`,
  `create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at)`,

  `create table if not exists admin_messages (
    id integer primary key autoincrement not null,
    author text default '' not null,
    title text default '' not null,
    body text not null,
    section_pid integer,
    column_source_id integer,
    status text default 'open' not null,
    reply text default '' not null,
    replied_by text default '' not null,
    replied_at integer,
    is_pinned integer default 0 not null,
    created_at integer not null
  )`,
  `create index if not exists admin_messages_created_idx on admin_messages (created_at)`,
  `create index if not exists admin_messages_status_idx on admin_messages (status)`,

  `create table if not exists admin_products (
    id integer primary key autoincrement not null,
    source_id integer not null,
    family_id integer not null,
    category_id integer not null,
    sort integer default 10 not null,
    title text not null,
    title_zh text default '' not null,
    subtitle text default '' not null,
    subtitle_zh text default '' not null,
    code text default '' not null,
    price text default '' not null,
    image text default '' not null,
    gallery_json text default '[]' not null,
    body_html text default '' not null,
    body_text text default '' not null,
    body_html_zh text default '' not null,
    description text default '' not null,
    description_zh text default '' not null,
    technical text default '' not null,
    technical_zh text default '' not null,
    offer text default '' not null,
    offer_zh text default '' not null,
    pdfs_json text default '[]' not null,
    status text default '正常' not null,
    created_at integer not null,
    updated_at integer not null
  )`,
  `create unique index if not exists admin_products_source_id_key on admin_products (source_id)`,
  `create index if not exists admin_products_family_idx on admin_products (family_id)`,

  `create table if not exists admin_contents (
    id integer primary key autoincrement not null,
    source_id integer not null,
    kind text not null,
    name text default '' not null,
    name_zh text default '' not null,
    data_json text default '{}' not null,
    updated_at integer not null
  )`,
  `create unique index if not exists admin_contents_source_id_key on admin_contents (source_id)`,
  `create index if not exists admin_contents_kind_idx on admin_contents (kind)`,

  `create table if not exists inquiries (
    id integer primary key autoincrement not null,
    company text default '' not null,
    contact text not null,
    email text not null,
    phone text default '' not null,
    message text not null,
    language text default 'en' not null,
    source_page text default '/contact' not null,
    status text default 'new' not null,
    reply text default '' not null,
    replied_by text default '' not null,
    replied_at integer,
    is_public integer default 0 not null,
    created_at integer not null
  )`,
  `create index if not exists inquiries_created_at_idx on inquiries (created_at)`,
  `create index if not exists inquiries_status_idx on inquiries (status)`,
  `create index if not exists inquiries_public_idx on inquiries (is_public)`,
];
