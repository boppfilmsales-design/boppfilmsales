#!/usr/bin/env node
/**
 * 部署诊断 —— 在 `next build` 之后运行，把 .next 的真实状态打到构建日志里。
 *
 * 目的是回答一个具体问题：Vercel 的 post-build 步骤报告
 *   ENOENT: no such file or directory, lstat '/vercel/path0/.next/lock'
 * 那么构建结束时 .next 到底存不存在、里面有什么、lock 文件在不在。
 *
 * 只读，不修改任何东西。
 */

import fs from "node:fs";
import path from "node:path";

const line = (s) => console.log("[diag] " + s);

line("=".repeat(70));
line("构建后诊断");
line("=".repeat(70));
line("cwd                 : " + process.cwd());
line("VERCEL              : " + (process.env.VERCEL ?? "(未设置)"));
line("VERCEL_ENV          : " + (process.env.VERCEL_ENV ?? "(未设置)"));
line("NEXT_PHASE          : " + (process.env.NEXT_PHASE ?? "(未设置)"));
line("NODE_ENV            : " + (process.env.NODE_ENV ?? "(未设置)"));
line("");

// ---- .next 目录 ----
const nextDir = path.join(process.cwd(), ".next");
line(".next 是否存在      : " + fs.existsSync(nextDir));

if (fs.existsSync(nextDir)) {
  const entries = fs.readdirSync(nextDir);
  line(".next 条目数        : " + entries.length);

  // 关键文件
  const keys = [
    "BUILD_ID",
    "lock",
    "export-marker.json",
    "export-detail.json",
    "routes-manifest.json",
    "prerender-manifest.json",
    "required-server-files.json",
    "standalone",
    "server",
    "static",
    "cache",
    "types",
  ];
  line("");
  line("关键条目:");
  for (const k of keys) {
    const p = path.join(nextDir, k);
    let info = "缺失";
    try {
      const st = fs.lstatSync(p);
      if (st.isDirectory()) {
        const n = fs.readdirSync(p).length;
        info = `目录 (${n} 项)`;
      } else {
        info = `${st.size} 字节`;
      }
    } catch (e) {
      info = "缺失 (" + e.code + ")";
    }
    line(`  ${k.padEnd(30)} ${info}`);
  }

  // 完整列表（前 40）
  line("");
  line(".next 完整条目（最多 40）:");
  for (const e of entries.slice(0, 40)) {
    let kind = "?";
    try { kind = fs.lstatSync(path.join(nextDir, e)).isDirectory() ? "DIR " : "FILE"; } catch { /**/ }
    line(`  ${kind} ${e}`);
  }
  if (entries.length > 40) line(`  … 还有 ${entries.length - 40} 项`);
} else {
  line("  ❌ .next 不存在 —— 这就是 Vercel 报 ENOENT 的直接原因");
}

// ---- standalone 是否被误生成 ----
line("");
line("standalone 目录       : " + (fs.existsSync(path.join(nextDir, "standalone")) ? "存在（不该在 Vercel 上生成）" : "不存在 ✅"));

// ---- public 大小 ----
const pub = path.join(process.cwd(), "public");
if (fs.existsSync(pub)) {
  let n = 0;
  let bytes = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { n++; try { bytes += fs.statSync(p).size; } catch { /**/ } }
    }
  };
  try { walk(pub); } catch { /**/ }
  line(`public/              : ${n} 个文件, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
} else {
  line("public/              : 不存在");
}

line("=".repeat(70));
