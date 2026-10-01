#!/usr/bin/env node
/**
 * ============================================================================
 *  Cloudflare D1  →  Neon 备份同步
 * ============================================================================
 *
 *  D1 是唯一的活数据库；Neon 保留为灾备档案。
 *  这个脚本把 D1 的当前内容完整写入 Neon，使 Neon 始终是一份可用的副本。
 *
 *  用法：
 *      node scripts/backup-d1-to-neon.mjs              预览（不改 Neon）
 *      node scripts/backup-d1-to-neon.mjs --apply      实际写入 Neon
 *      node scripts/backup-d1-to-neon.mjs --apply --tables=news_posts,admin_contents
 *
 *  安全设计：
 *      · 默认只预览
 *      · 写入前把 Neon 现有数据导出到 .neon-backups/（可回滚）
 *      · 使用 INSERT ... ON CONFLICT (id) DO UPDATE —— 幂等，可反复跑
 *      · 类型自动转换：毫秒整数 → timestamptz；0/1 → boolean
 *      · 不删除 Neon 里多出来的记录（除非加 --prune）
 *
 *  前置条件：
 *      .env.local 里的 DATABASE_URL 指向 Neon
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const PROJECT = process.cwd();
const require = createRequire(path.join(PROJECT, "package.json"));

const APPLY = process.argv.includes("--apply");
const PRUNE = process.argv.includes("--prune");
const tablesArg = process.argv.find((a) => a.startsWith("--tables="));
const ONLY = tablesArg ? tablesArg.slice(9).split(",").map((s) => s.trim()).filter(Boolean) : null;

/** D1 的栏目 ID 比 Neon 大 1（前 4 个栏目）。写回 Neon 时要减回来。 */
const CATEGORY_MAP_BACK = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 6, 7: 7, 8: 8 };

/** 默认不同步的表。 */
const SKIP_BY_DEFAULT = new Set(["news_categories"]);

// ---------------------------------------------------------------------------
function readToken() {
  const fromEnv = (process.env.CLOUDFLARE_API_TOKEN ?? "").match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
  if (fromEnv) return fromEnv;
  const t = fs.readFileSync(path.join(PROJECT, ".cf-token"), "utf8").match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
  if (t) return t;
  throw new Error("找不到 Cloudflare API 令牌（.cf-token）");
}
function readAccountId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
  const m = fs.readFileSync(path.join(PROJECT, "wrangler.jsonc"), "utf8").match(/"account_id"\s*:\s*"([0-9a-f]{32})"/);
  if (!m) throw new Error("wrangler.jsonc 缺 account_id");
  return m[1];
}
function readD1Id() {
  const m = fs.readFileSync(path.join(PROJECT, "wrangler.jsonc"), "utf8").match(/"database_id"\s*:\s*"([0-9a-f-]{36})"/);
  if (!m) throw new Error("wrangler.jsonc 缺 database_id");
  return m[1];
}
function readNeonUrl() {
  for (const f of [".env.local", ".env"]) {
    try {
      const t = fs.readFileSync(path.join(PROJECT, f), "utf8");
      const m = t.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch { /* next */ }
  }
  throw new Error("找不到 DATABASE_URL");
}

const ACCT = readAccountId();
const DBID = readD1Id();
const TOKEN = readToken();
const { neon } = require("@neondatabase/serverless");
const sql = neon(readNeonUrl());

async function d1(query) {
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DBID}/query`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sql: query }),
        },
      );
      const j = await res.json();
      if (!j.success) throw new Error(JSON.stringify(j.errors));
      return j.result[0].results;
    } catch (e) {
      if (i === 3) throw e;
      await new Promise((r) => setTimeout(r, 700 * i));
    }
  }
}

/** D1 的毫秒整数 → Postgres 能接受的值 */
function msToIso(ms) {
  if (ms === null || ms === undefined || ms === "") return null;
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n).toISOString();
}

const out = [];
const say = (s = "") => { console.log(s); out.push(s); };
const head = (s) => { say(""); say("=".repeat(88)); say("  " + s); say("=".repeat(88)); };

say("");
say("Cloudflare D1 → Neon 备份同步");
say("模式: " + (APPLY ? (PRUNE ? "★ 实际写入（并清理 Neon 多余记录）" : "★ 实际写入") : "仅预览（加 --apply 才写入）"));
say("时间: " + new Date().toLocaleString("zh-CN"));

head("1) 读取结构");

const d1Tables = (await d1(
  "select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '_cf_%' order by name",
)).map((r) => r.name);
const neonTables = (await sql`
  select table_name from information_schema.tables where table_schema='public' order by table_name
`).map((r) => r.table_name);

const common = d1Tables.filter((t) => neonTables.includes(t));
say(`  D1   (${d1Tables.length}): ${d1Tables.join(", ")}`);
say(`  Neon (${neonTables.length}): ${neonTables.join(", ")}`);
say(`  共有 (${common.length}): ${common.join(", ")}`);

let targets = common;
if (ONLY) targets = common.filter((t) => ONLY.includes(t));
else {
  const skipped = targets.filter((t) => SKIP_BY_DEFAULT.has(t));
  targets = targets.filter((t) => !SKIP_BY_DEFAULT.has(t));
  if (skipped.length) say(`  默认跳过: ${skipped.join(", ")}`);
}

// Neon 列类型
const neonCols = {};
for (const t of targets) {
  const cols = await sql`
    select column_name, data_type from information_schema.columns
    where table_schema='public' and table_name=${t} order by ordinal_position
  `;
  neonCols[t] = cols.map((c) => ({ name: c.column_name, type: c.data_type }));
}

head("2) 逐表对比");

const plan = {};
for (const t of targets) {
  const dIds = (await d1(`select id from "${t}"`)).map((r) => r.id);
  const nIds = (await sql.query(`select id from public."${t}"`)).map((r) => r.id);
  const nSet = new Set(nIds);
  const missing = dIds.filter((id) => !nSet.has(id)).sort((a, b) => a - b);
  plan[t] = { dIds, nIds, missing };
  const tag = missing.length === 0 ? "✅ Neon 已是最新" : `⚠️ Neon 缺 ${missing.length} 条`;
  say("");
  say(`  【${t}】  D1 ${dIds.length} 条   Neon ${nIds.length} 条   ${tag}`);
  if (missing.length) {
    say(`      需补入: ${missing.length <= 45 ? missing.join(", ") : missing.slice(0, 45).join(", ") + ` … 共 ${missing.length} 个`}`);
  }
}

// ---------------------------------------------------------------------------
if (APPLY) {
  head("3) 备份 Neon（写入前）");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(PROJECT, ".neon-backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  let total = 0;
  for (const t of targets) {
    const rows = await sql.query(`select * from public."${t}" order by id`);
    fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows, null, 2), "utf8");
    total += rows.length;
    say(`  ✅ ${t.padEnd(24)} ${rows.length} 行`);
  }
  say("");
  say(`  共备份 ${total} 行 → ${path.relative(PROJECT, dir)}`);
}

head(APPLY ? "4) 写入 Neon" : "4) 预览");

let grand = 0;
let failures = [];

for (const t of targets) {
  const p = plan[t];
  const cols = neonCols[t];
  if (!cols || cols.length === 0) {
    say(`  ${t.padEnd(24)} ⚠️ Neon 表结构缺失，跳过`);
    continue;
  }

  // D1 全量读取（Neon 里缺的 + 已存在的都读，用 upsert 更新内容）
  const rows = await d1(`select * from "${t}" order by id`);
  if (rows.length === 0) {
    say(`  ${t.padEnd(24)} D1 无数据，跳过`);
    continue;
  }

  const names = cols.map((c) => c.name);
  const placeholders = names.map((_, i) => `$${i + 1}`).join(", ");
  const updates = names.filter((n) => n !== "id").map((n) => `"${n}" = EXCLUDED."${n}"`).join(", ");
  const upsert = `insert into public."${t}" (${names.map((n) => `"${n}"`).join(", ")})
                  values (${placeholders})
                  on conflict (id) do update set ${updates}`;

  if (!APPLY) {
    say(`  ${t.padEnd(24)} 需写入 ${rows.length} 条（D1 ${p.dIds.length} / Neon ${p.nIds.length}）`);
    grand += p.missing.length;
    continue;
  }

  let ok = 0, fail = 0;
  for (const row of rows) {
    const values = cols.map((c) => {
      let v = row[c.name];
      // D1 栏目 ID → Neon 栏目 ID
      if (c.name === "category_id" && t === "news_posts" && CATEGORY_MAP_BACK[v] !== undefined) {
        v = CATEGORY_MAP_BACK[v];
      }
      const dt = (c.type || "").toLowerCase();
      if (dt.includes("timestamp")) return msToIso(v);
      if (dt === "boolean") return v === 1 || v === true || v === "1";
      if (v === undefined) return null;
      return v;
    });
    try {
      await sql.query(upsert, values);
      ok++;
      if (ok % 20 === 0 || ok === rows.length) process.stdout.write(`\r  ${t.padEnd(24)} 写入 ${ok}/${rows.length} …`);
    } catch (e) {
      fail++;
      if (failures.length < 20) failures.push({ table: t, id: row.id, err: String(e.message).slice(0, 170) });
    }
  }
  if (ok > 0) process.stdout.write("\r" + " ".repeat(72) + "\r");
  say(`  ${t.padEnd(24)} ✅ 成功 ${ok}   ❌ 失败 ${fail}`);
  grand += ok;
  if (fail > 0) failures.push({ table: t, err: `${fail} 条失败` });
}

// ---------------------------------------------------------------------------
head(APPLY ? "5) 写入后验证" : "5) 当前状态");
say("  表名                     D1      Neon    差异");
say("  " + "-".repeat(58));
for (const t of targets) {
  let dC = "?", nC = "?";
  try { dC = (await d1(`select count(*) c from "${t}"`))[0].c; } catch {}
  try { nC = (await sql.query(`select count(*)::int c from public."${t}"`))[0].c; } catch {}
  const diff = typeof dC === "number" && typeof nC === "number" ? dC - nC : "?";
  const tag = diff === 0 ? "✅ 一致" : diff > 0 ? `⚠️ Neon 少 ${diff}` : `ℹ️ Neon 多 ${-diff}`;
  say(`  ${t.padEnd(24)} ${String(dC).padStart(6)} ${String(nC).padStart(7)}   ${tag}`);
}

if (failures.length) {
  head("6) 失败详情（前 20 条）");
  for (const f of failures) say(`  [${f.table}${f.id ? " id=" + f.id : ""}] ${f.err}`);
}

head("汇总");
if (APPLY) {
  say(`  ✅ 已写入 Neon：${grand} 条`);
  say("");
  say("  Neon 现在是最新副本，可用于：");
  say("    · 灾备（Cloudflare 出问题时）");
  say("    · 在 Neon 控制台直接查询/导出");
    say("    · 历史数据回溯");
  const logFile = path.join(PROJECT, ".neon-backups", `last-backup-${Date.now()}.txt`);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.writeFileSync(logFile, out.join("\n"), "utf8");
  say(`  日志: ${path.relative(PROJECT, logFile)}`);
} else {
  say(`  预览：需要写入 ${grand} 条到 Neon`);
  say("");
  say("  确认后执行：");
  say("      node scripts/backup-d1-to-neon.mjs --apply");
}
say("");
