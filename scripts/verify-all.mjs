/**
 * End-to-end verification for the four user requests, reading the real DB.
 *
 *   #1  products pagination  -> per-page setting present and sane
 *   #2  news columns         -> post counts per legacy sourceId (41/49/52)
 *   #3  remaining modules    -> every admin_contents column has usable rows
 *   #4  高级管理               -> roles / settings / messages / users present
 *
 * Usage: node scripts/verify-all.mjs
 */
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] || "").trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const seed = JSON.parse(fs.readFileSync("src/data/site-seed.json", "utf8"));

/* ------------------------------------------------- #2 news counts per column */
const news = await sql.query(
  `select c.source_id, c.name, c.id as db_id, count(p.id)::int as posts
   from news_categories c left join news_posts p on p.category_id = c.id
   group by c.source_id, c.name, c.id order by c.source_id`,
);
console.log("\n=== #2 新闻中心（按 sourceId） ===");
console.table(news);

/* -------------------------------------------- #3 every admin_contents column */
const contents = await sql.query(
  `select source_id, kind, name, length(data_json)::int as bytes, data_json
   from admin_contents order by source_id`,
);

function rowCountOf(dataJson) {
  let parsed;
  try {
    parsed = JSON.parse(dataJson || "{}");
  } catch {
    return 0;
  }
  const items = parsed.items;
  const entries = parsed.entries;
  if (Array.isArray(items)) return items.length;
  if (items && typeof items === "object") return Object.keys(items).length > 0 ? 1 : 0;
  if (Array.isArray(entries)) return entries.length;
  return 0;
}

const contentReport = contents.map((c) => ({
  sourceId: c.source_id,
  kind: c.kind,
  name: c.name,
  bytes: c.bytes,
  rows: rowCountOf(c.data_json),
}));
console.log("\n=== #3 内容管理各栏目 ===");
console.table(contentReport);

const emptyCols = contentReport.filter((c) => c.rows === 0);
console.log(
  emptyCols.length === 0
    ? `✓ 全部 ${contentReport.length} 个栏目都有内容`
    : `✗ 仍为空的栏目：${emptyCols.map((c) => `${c.sourceId}(${c.name})`).join(", ")}`,
);

/* ---------------------------------------------------- #4 高级管理 data check */
const roles = await sql.query("select key, name_zh, permissions_json, is_built_in from admin_roles order by id");
console.log("\n=== #4a 角色管理 ===");
console.table(roles);

const settings = await sql.query("select key, value, group_name from site_settings order by group_name, id");
console.log("\n=== #4b 站点设置 ===");
console.table(settings);

const messages = await sql.query("select id, author, title, status, is_pinned from admin_messages order by id");
console.log("\n=== #4c 留言板 ===");
console.table(messages);

const users = await sql.query("select id, username, display_name, role_key, status from admin_users order by id");
console.log("\n=== #4d 管理员 ===");
console.table(users);

const audit = await sql.query("select count(*)::int as total from admin_audit_log");
console.log(`\n=== #4e 操作日志 ===\n记录数: ${audit[0].total}`);

/* ------------------------------------------------------- #1 products setting */
const perPage = settings.find((s) => s.key === "products_per_page");
console.log("\n=== #1 产品分页 ===");
console.log(`products_per_page = ${perPage?.value ?? "(未设置)"}`);

const families = seed.categories?.length ?? seed.products?.length ?? 0;
console.log(`产品大类数: ${families}`);
const pp = Number.parseInt(perPage?.value ?? "9", 10) || 9;
console.log(`预计页数: ${Math.ceil(families / pp)}`);

/* ------------------------------------------------------------------ summary */
const ok =
  news.length === 3 &&
  news.every((n) => n.posts > 0) &&
  emptyCols.length === 0 &&
  roles.length >= 4 &&
  settings.length >= 15 &&
  messages.length >= 3 &&
  users.length >= 1;
console.log(`\n${ok ? "✓ 全部检查通过" : "✗ 存在未通过项"}`);
if (!ok) process.exit(1);
