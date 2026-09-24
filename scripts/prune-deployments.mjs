#!/usr/bin/env node
/**
 * prune-deployments.mjs — safely reclaim Vercel Deployments storage.
 *
 * WHY THIS IS SAFE
 *   A Vercel deployment holds ONLY a build artifact (immutable JS/CSS/HTML).
 *   Your real assets live elsewhere and are never touched by this script:
 *     - content / news / settings  -> Neon Postgres (DATABASE_URL)
 *     - site media (public/)       -> Git repo (github.com/boppfilmsales-design/boppfilmsales)
 *     - env vars / domains         -> Vercel project settings, not deployments
 *   Deleting ALL deployments still leaves a fully rebuildable app.
 *
 * WHAT IT REFUSES TO DELETE (hard guards)
 *   1. the deployment currently aliased to the production domain
 *   2. the newest READY production deployment (safety net / rollback target)
 *   3. anything with an active custom alias or branch alias pointing at it
 *   4. any deployment younger than --min-age-hours (default 24)
 *
 * USAGE  (defaults to a DRY RUN — nothing is deleted without --apply)
 *   node scripts/prune-deployments.mjs                          # report only
 *   node scripts/prune-deployments.mjs --keep 5                 # report, keep newest 5
 *   node scripts/prune-deployments.mjs --keep 5 --apply         # actually delete
 *   node scripts/prune-deployments.mjs --keep 3 --min-age-hours 72 --apply
 *
 * ENV
 *   VERCEL_TOKEN  required
 *   VERCEL_TEAM   optional team id or slug
 *   VERCEL_SCOPE  optional, same as VERCEL_TEAM
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- config

const TOKEN =
  process.env.VERCEL_TOKEN ||
  process.env.VERCEL_TOKEN_VALUE ||
  readEnvLocal("VERCEL_TOKEN");

const TEAM = process.env.VERCEL_TEAM || process.env.VERCEL_SCOPE || "";
const API = "https://api.vercel.com";

function readEnvLocal(key) {
  // .env.local is CRLF-encoded on this project — strip \r explicitly.
  for (const rel of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const line = fs
      .readFileSync(p, "utf8")
      .split(/\r?\n/)
      .find((l) => l.trim().startsWith(key + "="));
    if (line) return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf("--" + name);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : true;
};
const KEEP = Number(flag("keep", 5));
const MIN_AGE_HOURS = Number(flag("min-age-hours", 24));
const APPLY = argv.includes("--apply");
const PROD_HOST = String(flag("domain", "boppfilmsales.vercel.app"));

// ---------------------------------------------------------------- api

async function api(pathname, init = {}) {
  const url = new URL(API + pathname);
  if (TEAM) url.searchParams.set("teamId", TEAM);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 400) };
  }
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${pathname} -> ${res.status} ${text.slice(0, 300)}`);
  }
  return body;
}

async function listAllDeployments() {
  const out = [];
  let until = null;
  for (let page = 0; page < 20; page++) {
    const p = new URLSearchParams({ limit: "100" });
    if (until) p.set("until", String(until));
    const data = await api(`/v6/deployments?${p}`);
    const batch = data.deployments || [];
    out.push(...batch);
    if (batch.length < 100) break;
    until = batch[batch.length - 1].created;
  }
  return out;
}

/**
 * AUTHORITATIVE in-use check.
 * Deployment objects carry a noisy `aliasAssigned` boolean that Vercel sets on
 * nearly every production deploy; trusting it makes a prune tool a no-op.
 * The aliases endpoint is the source of truth: every hostname actually routed
 * to a deployment appears here with its `deploymentId`. `/v4/aliases` only
 * returns deployment-bound aliases; project-bound aliases come back with a
 * null deploymentId, which is why the project targets are read separately.
 */
async function listDeploymentAliases() {
  const byDeployment = new Map();
  let since = null;
  for (let page = 0; page < 20; page++) {
    const p = new URLSearchParams({ limit: "100" });
    if (since) p.set("until", String(since));
    const data = await api(`/v4/aliases?${p}`);
    const batch = data.aliases || [];
    for (const a of batch) {
      if (!a.deploymentId) continue;
      byDeployment.set(a.deploymentId, [
        ...(byDeployment.get(a.deploymentId) || []),
        a.alias,
      ]);
    }
    if (batch.length < 100) break;
    since = batch[batch.length - 1].created;
  }
  return byDeployment;
}

async function getProject(projectId) {
  return api(`/v9/projects/${projectId}`);
}

async function deleteDeployment(uid) {
  return api(`/v13/deployments/${uid}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- main

function human(bytes) {
  if (!Number.isFinite(bytes)) return "?";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + " " + u[i];
}

function stamp(ms) {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}

async function main() {
  if (!TOKEN) {
    console.error("缺少 VERCEL_TOKEN（可写入 .env.local 或导出环境变量）。");
    process.exit(2);
  }

  console.log("Vercel 部署清理工具" + (APPLY ? "  [APPLY 模式 — 将真实删除]" : "  [DRY RUN — 只报告]"));
  console.log("保留最新: " + KEEP + "  最小保留自然时间: " + MIN_AGE_HOURS + "h  生产域名: " + PROD_HOST);
  console.log("");

  const all = await listAllDeployments();
  if (!all.length) {
    console.log("没有任何部署。");
    return;
  }
  all.sort((a, b) => b.created - a.created);

  // ---- collect every alias that must be protected
  const protectedByAlias = new Map(); // uid -> [alias...]
  const addProtected = (uid, why) => {
    if (!uid) return;
    if (!protectedByAlias.has(uid)) protectedByAlias.set(uid, []);
    const list = protectedByAlias.get(uid);
    if (!list.includes(why)) list.push(why);
  };

  // 1) authoritative: hostnames actually bound to a deployment
  const deploymentAliases = await listDeploymentAliases();
  for (const [uid, hosts] of deploymentAliases) {
    for (const h of hosts) addProtected(uid, "域名:" + h);
  }

  // 2) project-level targets (what the project promotes/rolls back to)
  const projectIds = [...new Set(all.map((d) => d.projectId).filter(Boolean))];
  for (const pid of projectIds) {
    let proj;
    try {
      proj = await getProject(pid);
    } catch (e) {
      console.log("  (无法读取项目 " + pid + " 的别名: " + e.message + ")");
      continue;
    }
    for (const target of ["production", "preview"]) {
      const d = proj.targets && proj.targets[target];
      if (d && d.id) addProtected(d.id, "project:" + target);
    }
    for (const dom of proj.domains || []) {
      for (const target of ["production", "preview"]) {
        const d = dom[target + "Deployment"];
        if (d && d.id) addProtected(d.id, "站点域名:" + (dom.name || dom.domain));
      }
    }
  }

  const now = Date.now();
  // Most recent READY production deployment — the actual rollback target.
  const newestReadyProd = all.find((d) => d.target === "production" && d.state === "READY");

  const decisions = all.map((d, idx) => {
    const reasons = [];
    if (idx < KEEP) reasons.push("保留最新 " + KEEP + " 之一");
    if (d.uid === (newestReadyProd && newestReadyProd.uid)) reasons.push("最新生产部署(回滚目标)");
    if (protectedByAlias.has(d.uid)) reasons.push("被引用: " + protectedByAlias.get(d.uid).join(", "));
    if ((now - d.created) / 3.6e6 < MIN_AGE_HOURS) reasons.push("未满 " + MIN_AGE_HOURS + "h");

    return { d, idx, keep: reasons.length > 0, reasons };
  });

  console.log("序号  时间(UTC)         状态   目标        提交     UID                         说明");
  console.log("─".repeat(118));
  for (const r of decisions) {
    const d = r.d;
    const sha = ((d.meta && d.meta.githubCommitSha) || "").slice(0, 7) || "       ";
    const msg = ((d.meta && d.meta.githubCommitMessage) || "").split("\n")[0].slice(0, 34);
    console.log(
      String(r.idx + 1).padStart(3) +
        "  " +
        stamp(d.created) +
        "  " +
        String(d.state || "").padEnd(7) +
        " " +
        String(d.target || "-").padEnd(10) +
        " " +
        sha.padEnd(7) +
        " " +
        d.uid.padEnd(28) +
        " " +
        (msg || "") +
        (r.keep ? "   [保留: " + r.reasons.join(" / ") + "]" : "   << 可删除")
    );
    void (r.idx + 1);
  }

  const victims = decisions.filter((r) => !r.keep).map((r) => r.d);
  console.log("");
  console.log("共 " + all.length + " 个部署；可删除 " + victims.length + " 个，保留 " + (all.length - victims.length) + " 个。");

  if (!victims.length) {
    console.log("无需清理。");
    return;
  }

  if (!APPLY) {
    console.log("");
    console.log("以上为 DRY RUN，未删除任何内容。确认无误后加 --apply 执行。");
    console.log("如需同步清理构建缓存，可另加 Vercel 控制台操作（见 README 说明）。");
    return;
  }

  // ---- require an explicit confirmation token so an accidental --apply is caught
  if (!process.env.PRUNE_CONFIRM && !argv.includes("--yes")) {
    console.log("");
    console.log("已指定 --apply，但缺少确认开关。请追加 --yes 或设置 PRUNE_CONFIRM=1 再运行。");
    console.log("这是为了防止误触：清理不可撤销。");
    process.exit(3);
  }

  console.log("");
  console.log("开始删除 ...");
  let ok = 0;
  let fail = 0;
  for (const d of victims) {
    try {
      await deleteDeployment(d.uid);
      ok++;
      console.log("  deleted  " + d.uid + "  " + stamp(d.created));
    } catch (e) {
      fail++;
      console.log("  FAILED   " + d.uid + "  " + e.message);
    }
  }
  console.log("");
  console.log("完成：成功 " + ok + "，失败 " + fail + "。");
  if (fail) process.exitCode = 1;
  void human;
}

main().catch((e) => {
  console.error("执行失败: " + e.message);
  process.exit(1);
});
