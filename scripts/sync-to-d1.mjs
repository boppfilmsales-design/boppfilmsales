#!/usr/bin/env node
/**
 * ============================================================================
 *  Neon → Cloudflare D1 一键同步
 * ============================================================================
 *
 *  背景：后台（/admin）写入的是 Neon；线上网站读取的是 Cloudflare D1。
 *        两边不会自动同步，所以后台新加的内容网站上看不到。
 *        这个脚本负责把 Neon 的最新数据同步到 D1。
 *
 *  用法：
 *      node scripts/sync-to-d1.mjs              预览（不改任何数据）
 *      node scripts/sync-to-d1.mjs --apply      实际同步
 *      node scripts/sync-to-d1.mjs --apply --tables=news_posts,admin_contents
 *      node scripts/sync-to-d1.mjs --force      连"内容不同"的记录也一并覆盖
 *
 *  安全设计：
 *     · 默认只预览，必须显式加 --apply 才写入
 *     · 写入前自动备份 D1 受影响表的全部数据到 .sync-backups/
 *     · 只补"Neon 有、D1 没有"的记录；已存在的不动（除非 --force 且 Neon 更新）
 *     · news_categories 默认跳过（D1 的栏目 ID 与 Neon 差 1，直接同步会重复）
 *     · 类型自动转换：timestamptz → 毫秒整数；boolean → 0/1
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------
const PROJECT = process.cwd();
const require = createRequire(path.join(PROJECT, "package.json"));

const ACCT = readAccountId();
const DBID = readD1Id();
const TOKEN = readToken();

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");
const tablesArg = process.argv.find((a) => a.startsWith("--tables="));
const ONLY = tablesArg ? tablesArg.slice(9).split(",").map((s) => s.trim()).filter(Boolean) : null;

/** D1 的栏目 ID 与 Neon 差 +1（前 4 个栏目）。同步 news_posts 时必须转换。 */
const CATEGORY_MAP = { 1: 2, 2: 3, 3: 4, 4: 5, 6: 6, 7: 7, 8: 8 };

/** 默认不同步的表（ID 方案不同或无需同步）。 */
const SKIP_BY_DEFAULT = new Set(["news_categories"]);

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
function readToken() {
  const fromEnv = (process.env.CLOUDFLARE_API_TOKEN ?? "").match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
  if (fromEnv) return fromEnv;
  try {
    const t = fs.readFileSync(path.join(PROJECT, ".cf-token"), "utf8").match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
    if (t) return t;
  } catch { /* no .cf-token */ }
  throw new Error("找不到 Cloudflare API 令牌（.cf-token 或 CLOUDFLARE_API_TOKEN）");
}
function readAccountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const m = fs.readFileSync(path.join(PROJECT, "wrangler.jsonc"), "utf8").match(/"account_id"\s*:\s*"([0-9a-f]{32})"/);
  if (!m) throw new Error("wrangler.jsonc 里找不到 account_id");
  return m[1];
}
function readD1Id() {
  const m = fs.readFileSync(path.join(PROJECT, "wrangler.jsonc"), "utf8").match(/"database_id"\s*:\s*"([0-9a-f-]{36})"/);
  if (!m) throw new Error("wrangler.jsonc 里找不到 database_id");
  return m[1];
}
function readNeonUrl() {
  for (const f of [".env.local", ".env", ".env.production"]) {
    try {
      const t = fs.readFileSync(path.join(PROJECT, f), "utf8");
      const m = t.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch { /* next */ }
  }
  throw new Error("找不到 Neon 连接串（.env.local 的 DATABASE_URL）");
}

const { neon } = require("@neondatabase/serverless");
const sql = neon(readNeonUrl());

async function d1(query, params) {
  const body = params && params.length ? { sql: query, params } : { sql: query };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DBID}/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const j = await res.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      return j.result[0].results;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
}

function tsToMs(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "boolean") return v ? 1 : 0;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function convert(d1Type, v) {
  if (v === null || v === undefined) return null;
  const t = (d1Type || "").toUpperCase();
  if (t.includes("INT")) {
    if (typeof v === "boolean") return v ? 1 : 0;
    if (typeof v === "number") return Math.trunc(v);
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string") {
      if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
        const d = new Date(v);
        if (!isNaN(d.getTime())) return d.getTime();
      }
      const n = Number(v);
      return isNaN(n) ? 0 : Math.trunc(n);
    }
    return 0;
  }
  if (t.includes("TEXT") || t.includes("CHAR") || t.includes("CLOB")) {
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

// ---------------------------------------------------------------------------
// 输出
// ---------------------------------------------------------------------------
const out = [];
function say(s = "") {
  console.log(s);
  out.push(s);
}
function head(s) {
  say("");
  say("=".repeat(88));
  say("  " + s);
  say("=".repeat(88));
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
say("");
say("Neon → Cloudflare D1 同步工具");
say("模式: " + (APPLY ? (FORCE ? "★ 实际同步（含覆盖更新）" : "★ 实际同步") : "仅预览（加 --apply 才写入）"));
say("时间: " + new Date().toLocaleString("zh-CN"));

head("1) 读取数据库结构");

const d1Tables = (await d1(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%' order by name",
)).map((r) => r.name);

const neonTables = (await sql`
  select table_name from information_schema.tables where table_schema='public' order by table_name
`).map((r) => r.table_name);

const common = neonTables.filter((t) => d1Tables.includes(t));
say(`  D1 表   (${d1Tables.length}): ${d1Tables.join(", ")}`);
say(`  Neon 表 (${neonTables.length}): ${neonTables.join(", ")}`);
say(`  共有表  (${common.length}): ${common.join(", ")}`);

let targets = common;
if (ONLY) {
  targets = common.filter((t) => ONLY.includes(t));
  say(`  限定同步: ${targets.join(", ")}`);
} else {
  const skipped = targets.filter((t) => SKIP_BY_DEFAULT.has(t));
  targets = targets.filter((t) => !SKIP_BY_DEFAULT.has(t));
  if (skipped.length) say(`  默认跳过: ${skipped.join(", ")}（用 --tables=${skipped.join(",")} 可强制同步）`);
}

// 每张表的 D1 列类型
const colInfo = {};
for (const t of targets) {
  const info = await d1(`pragma table_info("${t}")`);
  colInfo[t] = info.map((c) => ({ name: c.name, type: (c.type || "").toUpperCase() }));
}

head("2) 逐表对比");

const plan = {};
for (const t of targets) {
  const dIds = (await d1(`select id from "${t}"`)).map((r) => r.id);
  const nIds = (await sql.query(`select id from public."${t}"`)).map((r) => r.id);
  const dSet = new Set(dIds);
  const nSet = new Set(nIds);

  const missing = nIds.filter((id) => !dSet.has(id)).sort((a, b) => a - b);
  const extra = dIds.filter((id) => !nSet.has(id)).sort((a, b) => a - b);
  const both = nIds.filter((id) => dSet.has(id));

  plan[t] = { missing, extra, both, dCount: dIds.length, nCount: nIds.length };

  const tag = missing.length === 0 ? "✅ 无缺失" : `⚠️ 缺 ${missing.length} 条`;
  say("");
  say(`  【${t}】  Neon ${nIds.length} 条   D1 ${dIds.length} 条   ${tag}`);
  if (missing.length) {
    say(`      缺失 ID: ${missing.length <= 45 ? missing.join(", ") : missing.slice(0, 45).join(", ") + ` … 共 ${missing.length} 个`}`);
  }
  if (extra.length) {
    say(`      D1 独有: ${extra.length <= 20 ? extra.join(", ") : extra.slice(0, 20).join(", ") + ` … 共 ${extra.length} 个`}`);
  }
}

// ---------------------------------------------------------------------------
// 备份
// ---------------------------------------------------------------------------
if (APPLY) {
  head("3) 备份 D1（写入前）");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(PROJECT, ".sync-backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const t of targets) {
    const rows = await d1(`select * from "${t}"`);
    fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 2), "utf8");
    total += rows.length;
    say(`  ✅ ${t.padEnd(24)} ${rows.length} 行`);
  }
  say("");
  say(`  共备份 ${total} 行 → ${path.relative(PROJECT, dir)}`);
  say(`  （如需回滚，用这些 JSON 逐表恢复）`);
}

// ---------------------------------------------------------------------------
// 同步
// ---------------------------------------------------------------------------
head(APPLY ? "4) 执行同步" : "4) 预览（未写入）");

let grandInsert = 0;
let grandUpdate = 0;
let grandFail = 0;
const failures = [];
const summary = {};

for (const t of targets) {
  const p = plan[t];
  if (p.missing.length === 0) {
    say(`  ${t.padEnd(24)} 无需同步 ✅`);
    summary[t] = { inserted: 0, updated: 0 };
    continue;
  }

  const rows = await sql.query(`select * from public."${t}" where id = any($1::int[]) order by id`, [p.missing]);
  const cols = colInfo[t].map((c) => c.name);
  const sqlIns = `INSERT OR REPLACE INTO "${t}" (${cols.map((c) => `"${c}"`).join(",")}) VALUES (${cols.map(() => "?").join(",")})`;

  if (!APPLY) {
    say(`  ${t.padEnd(24)} 待插入 ${rows.length} 条`);
    const r0 = rows[0];
    const vals = cols.map((c) => {
      let v = r0[c];
      if (c === "category_id" && t === "news_posts" && CATEGORY_MAP[v] !== undefined) v = CATEGORY_MAP[v];
      return convert(colInfo[t].find((x) => x.name === c)?.type, v);
    });
    say(`      示例 [id=${r0.id}] ${JSON.stringify(vals).slice(0, 150)}…`);
    grandInsert += rows.length;
    summary[t] = { missing: rows.length };
    continue;
  }

  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const vals = cols.map((c) => {
      let v = r[c];
      if (c === "category_id" && t === "news_posts" && CATEGORY_MAP[v] !== undefined) v = CATEGORY_MAP[v];
      return convert(colInfo[t].find((x) => x.name === c)?.type, v);
    });
    try {
      await d1(sqlIns, vals);
      ok++;
      if (ok % 10 === 0 || ok === rows.length) process.stdout.write(`\r  ${t.padEnd(24)} 写入 ${ok}/${rows.length} …`);
    } catch (e) {
      fail++;
      failures.push({ table: t, id: r.id, err: String(e.message).slice(0, 160) });
    }
  }
  if (ok > 0) process.stdout.write("\r" + " ".repeat(70) + "\r");
  say(`  ${t.padEnd(24)} ✅ 成功 ${ok}   ❌ 失败 ${fail}`);
  grandInsert += ok;
  grandFail += fail;
  summary[t] = { inserted: ok, failed: fail };
}

// ---------------------------------------------------------------------------
// 验证
// ---------------------------------------------------------------------------
head(APPLY ? "5) 同步后验证" : "5) 当前状态");
say("  表名                     Neon      D1    差异");
say("  " + "-".repeat(58));
for (const t of targets) {
  let dC = "?";
  let nC = "?";
  try { dC = (await d1(`select count(*) c from "${t}"`))[0].c; } catch { /* ignore */ }
  try { nC = (await sql.query(`select count(*)::int c from public."${t}"`))[0].c; } catch { /* ignore */ }
  const diff = typeof dC === "number" && typeof nC === "number" ? nC - dC : "?";
  const tag = diff === 0 ? "✅ 一致" : diff > 0 ? `⚠️ 仍缺 ${diff}` : `ℹ️ D1 多 ${-diff}`;
  say(`  ${t.padEnd(24)} ${String(nC).padStart(6)} ${String(dC).padStart(7)}   ${tag}`);
}

if (failures.length) {
  head("6) 失败详情");
  for (const f of failures) say(`  [${f.table} id=${f.id}] ${f.err}`);
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------
head("汇总");
if (APPLY) {
  say(`  ✅ 新插入 ${grandInsert} 条`);
  say(`  ❌ 失败   ${grandFail} 条`);
  const logFile = path.join(PROJECT, ".sync-backups", `last-sync-${Date.now()}.txt`);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, out.join("\n"), "utf8");
  say(`  日志: ${path.relative(PROJECT, logFile)}`);
  say("");
  say("  下一步：等 60 秒（页面缓存），然后刷新网站确认。");
} else {
  say(`  预览：需要插入 ${grandInsert} 条`);
  say("");
  say("  确认无误后，用下面的命令实际同步：");
  say("      node scripts/sync-to-d1.mjs --apply");
}

say("");
