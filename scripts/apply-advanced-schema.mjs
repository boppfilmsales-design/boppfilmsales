/**
 * Applies the 高级管理 (Advanced Management) schema and seeds its defaults.
 *
 * Idempotent — every statement is `create ... if not exists` / `alter ... add
 * column if not exists`, and the seed inserts are guarded by an existence
 * check. Safe to re-run.
 *
 * Usage: node scripts/apply-advanced-schema.mjs [--dry]
 */
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";

const DRY = process.argv.includes("--dry");

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] || "").trim().replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const sql = neon(url);

const ADMIN_USERNAME = "xgxadmin";
const ADMIN_PASSWORD = (env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1] || "xgxadmin").trim().replace(/^["']|["']$/g, "");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/* ----------------------------------------------------------------- schema */

const DDL = [
  `create table if not exists admin_roles (
     id serial primary key,
     key text not null,
     name text not null,
     name_zh text not null default '',
     description text not null default '',
     permissions_json text not null default '["*"]',
     is_built_in boolean not null default false,
     created_at timestamptz not null default now()
   )`,
  `create unique index if not exists admin_roles_key_key on admin_roles (key)`,
  `create table if not exists site_settings (
     id serial primary key,
     key text not null,
     value text not null default '',
     label text not null default '',
     group_name text not null default 'general',
     updated_at timestamptz not null default now()
   )`,
  `create unique index if not exists site_settings_key_key on site_settings (key)`,
  `create table if not exists admin_audit_log (
     id serial primary key,
     actor text not null default '',
     action text not null,
     detail text not null default '',
     created_at timestamptz not null default now()
   )`,
  `create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at)`,
  `create table if not exists admin_messages (
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
   )`,
  `create index if not exists admin_messages_created_idx on admin_messages (created_at)`,
  `create index if not exists admin_messages_status_idx on admin_messages (status)`,
  `alter table admin_users add column if not exists display_name text not null default ''`,
  `alter table admin_users add column if not exists role_key text not null default 'owner'`,
  `alter table admin_users add column if not exists status text not null default 'active'`,
  `alter table admin_users add column if not exists last_login_at timestamptz`,
];

/* ------------------------------------------------------------------- seeds */

const ROLES = [
  {
    key: "owner", name: "Super Admin", nameZh: "超级管理员",
    description: "拥有全部内容与高级管理权限，可管理角色与管理员账号。",
    permissionsJson: '["*"]', isBuiltIn: true,
  },
  {
    key: "editor", name: "Content Editor", nameZh: "内容编辑",
    description: "可维护产品、新闻、案例、下载等前台内容，不可进入权限管理。",
    permissionsJson: JSON.stringify(["about","product","news","download","case","service","contact","other","inquiry","message"]),
    isBuiltIn: true,
  },
  {
    key: "sales", name: "Sales", nameZh: "销售",
    description: "仅可查看和跟进询盘、留言板，不可修改站点内容。",
    permissionsJson: JSON.stringify(["inquiry","message"]), isBuiltIn: true,
  },
  {
    key: "viewer", name: "Read Only", nameZh: "只读访客",
    description: "仅可浏览后台数据，不能保存任何修改。",
    permissionsJson: JSON.stringify([]), isBuiltIn: true,
  },
];

const SETTINGS = [
  ["site_name", "Hebei Xinguangxing Packing Material Co., Ltd.", "站点名称（英文）", "general"],
  ["site_name_zh", "河北新光兴包装材料有限公司", "站点名称（中文）", "general"],
  ["site_tagline", "BOPP Film & Packaging Material Manufacturer", "副标题 / Slogan", "general"],
  ["contact_person", "Ms. Linda", "联系人", "contact"],
  ["contact_phone", "+86-311-88888888", "联系电话", "contact"],
  ["contact_mobile", "+86-138-0000-0000", "手机 / WhatsApp", "contact"],
  ["contact_email", "sales@apigcl.com", "业务邮箱", "contact"],
  ["contact_address", "Xinguangxing Industrial Park, Shijiazhuang, Hebei, China", "公司地址（英文）", "contact"],
  ["contact_address_zh", "中国河北省石家庄市新光兴工业园", "公司地址（中文）", "contact"],
  ["footer_copyright", "© 2024 Hebei Xinguangxing Packing Material Co., Ltd. All rights reserved.", "页脚版权", "footer"],
  ["footer_beian", "冀ICP备00000000号", "备案号", "footer"],
  ["products_per_page", "9", "前台产品分页条数", "display"],
  ["news_per_page", "10", "前台新闻分页条数", "display"],
  ["site_status", "online", "站点状态（online / maintenance）", "display"],
  ["maintenance_notice", "网站正在维护升级，请稍后访问。", "维护公告", "display"],
];

const MESSAGES = [
  {
    author: "xgxadmin",
    title: "关于本后台的镜像同步说明",
    body:
      "本站后台按源站 apigcl.com 的结构重建，分为「内容管理」与「高级管理」两大区块。\n" +
      "内容管理的每一列均可直接编辑并保存，保存后前台会立即生效。\n" +
      "如有栏目需要新增或调整，请在此留言给管理员。",
    sectionPid: 1, columnSourceId: 13, status: "open", isPinned: true,
  },
  {
    author: "xgxadmin",
    title: "下载中心 PDF 文件命名规范",
    body:
      "下载中心的文件地址请使用 /downloads/ 开头的相对路径，例如 /downloads/bopp-film-tds.pdf。\n" +
      "编号列用于前台列表显示，建议格式为 TDS-001 这类可排序的短编号。",
    sectionPid: 42, columnSourceId: 76, status: "open", isPinned: false,
  },
  {
    author: "xgxadmin",
    title: "新闻中心各栏目投稿要求",
    body:
      "Industry News / Company News / Employees Literary 三个栏目共用同一套编辑器。\n" +
      "发布日期留空时会自动按当前时间排序；摘要为空时将截取正文前 400 字。",
    sectionPid: 2, columnSourceId: 41, status: "open", isPinned: false,
  },
];

/* --------------------------------------------------------------------- run */

async function main() {
  console.log(DRY ? "== DRY RUN ==" : "== APPLYING ==");

  for (const statement of DDL) {
    if (DRY) {
      console.log(`DDL  ${statement.split("\n")[0].trim()}`);
      continue;
    }
    await sql.query(statement, []);
  }
  if (!DRY) console.log(`✓ schema applied (${DDL.length} statements)`);

  const existingRoles = await sql.query("select key from admin_roles", []);
  const knownRoles = new Set(existingRoles.map((r) => r.key));
  const missingRoles = ROLES.filter((r) => !knownRoles.has(r.key));
  if (!DRY) {
    for (const role of missingRoles) {
      await sql.query(
        "insert into admin_roles (key, name, name_zh, description, permissions_json, is_built_in) values ($1,$2,$3,$4,$5,$6)",
        [role.key, role.name, role.nameZh, role.description, role.permissionsJson, role.isBuiltIn],
      );
    }
  }
  console.log(`✓ roles  inserted ${missingRoles.length} (of ${ROLES.length})`);

  const existingSettings = await sql.query("select key from site_settings", []);
  const knownSettings = new Set(existingSettings.map((r) => r.key));
  const missingSettings = SETTINGS.filter(([key]) => !knownSettings.has(key));
  if (!DRY) {
    for (const [key, value, label, groupName] of missingSettings) {
      await sql.query(
        "insert into site_settings (key, value, label, group_name) values ($1,$2,$3,$4)",
        [key, value, label, groupName],
      );
    }
  }
  console.log(`✓ settings inserted ${missingSettings.length} (of ${SETTINGS.length})`);

  const [{ total: messageCount }] = await sql.query("select count(*)::int as total from admin_messages", []);
  if (!DRY && messageCount === 0) {
    for (const m of MESSAGES) {
      await sql.query(
        "insert into admin_messages (author, title, body, section_pid, column_source_id, status, is_pinned) values ($1,$2,$3,$4,$5,$6,$7)",
        [m.author, m.title, m.body, m.sectionPid, m.columnSourceId, m.status, m.isPinned],
      );
    }
    console.log(`✓ messages inserted ${MESSAGES.length}`);
  } else {
    console.log(`✓ messages  skipped (existing ${messageCount})`);
  }

  // Make sure the built-in admin account is an active owner and can sign in.
  const users = await sql.query("select id, username, role_key, status from admin_users", []);
  if (!DRY) {
    if (users.length === 0) {
      await sql.query(
        "insert into admin_users (username, password_hash, display_name, role_key, status) values ($1,$2,$3,$4,$5)",
        [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), "超级管理员", "owner", "active"],
      );
      console.log(`✓ admin    created ${ADMIN_USERNAME}`);
    } else {
      const owner = users.find((u) => u.username === ADMIN_USERNAME) ?? users[0];
      await sql.query("update admin_users set role_key = 'owner', status = 'active' where id = $1", [owner.id]);
      await sql.query(
        "update admin_users set display_name = '超级管理员' where display_name = '' or display_name is null",
        [],
      );
      console.log(`✓ admin    ensured ${owner.username} is an active owner`);
    }
  }

  console.log("\n--- verification ---");
  const roles = await sql.query("select key, name_zh, is_built_in from admin_roles order by id", []);
  console.table(roles);
  const settings = await sql.query("select group_name, count(*)::int as n from site_settings group by group_name order by group_name", []);
  console.table(settings);
  const msgs = await sql.query("select id, author, title, status, is_pinned from admin_messages order by id", []);
  console.table(msgs);
  const finalUsers = await sql.query("select id, username, display_name, role_key, status from admin_users order by id", []);
  console.table(finalUsers);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
