#!/usr/bin/env node
/**
 * 部署诊断 + `.next/lock` 兼容处理。
 *
 * 背景（2026-10-01 排查结论）
 * ---------------------------------------------------------------------------
 * 每一次 Vercel 部署都在 `next build` 干净退出之后失败于：
 *
 *     ENOENT: no such file or directory, lstat '/vercel/path0/.next/lock'
 *
 * 诊断证实构建本身完全正常：Build ID 已生成、路由表已打印、`.next` 有 22 个
 * 条目、standalone 输出按预期没有产生。而 `lock` 与 `export-detail.json`
 * 【本来就不该存在】——`next build` 在开始时创建 lock、结束时删除它。
 *
 * 也就是说 Vercel 的 post-build 步骤在 lstat 一个 Next.js 有意不留的文件。
 * Vercel 社区的同类报告里，失败文件名还会在两次相同提交之间变化
 * （`.next/lock` ↔ `.next/export-detail.json`），指向同一个原因：这一步依赖
 * 的是上一次构建留下的产物清单，而那份清单已经过期。
 *
 * 处理方式
 * ---------------------------------------------------------------------------
 * 构建之后补上那个文件。它是个零字节标记，不影响运行——Next.js 只在构建期间
 * 关注它，而构建已经结束了。同时清掉 `.next/cache`，让下一次构建不再从可能
 * 过期的清单里恢复。
 *
 * 只做这两件事，全部带 try/catch，任何失败都只记一行日志，绝不让构建失败。
 */

import fs from "node:fs";
import path from "node:path";

const line = (s) => console.log("[diag] " + s);
const nextDir = path.join(process.cwd(), ".next");

line("=".repeat(70));
line("构建后处理");
line("=".repeat(70));
line("cwd                 : " + process.cwd());
line("VERCEL              : " + (process.env.VERCEL ?? "(未设置)"));
line("VERCEL_ENV          : " + (process.env.VERCEL_ENV ?? "(未设置)"));
line(".next 是否存在      : " + fs.existsSync(nextDir));

if (!fs.existsSync(nextDir)) {
  line("❌ .next 不存在，跳过后续处理");
  line("=".repeat(70));
  process.exit(0);
}

const entries = fs.readdirSync(nextDir);
line(".next 条目数        : " + entries.length);

const info = (name) => {
  const p = path.join(nextDir, name);
  try {
    const st = fs.lstatSync(p);
    return st.isDirectory() ? `目录 (${fs.readdirSync(p).length} 项)` : `${st.size} 字节`;
  } catch (e) {
    return `缺失 (${e.code})`;
  }
};

line("");
line("关键条目:");
for (const k of ["BUILD_ID", "lock", "export-marker.json", "export-detail.json",
                 "routes-manifest.json", "standalone", "server", "static"]) {
  line(`  ${k.padEnd(28)} ${info(k)}`);
}

// ---------------------------------------------------------------------------
// 1) 补上 Vercel 的 post-build 步骤要找的标记文件
// ---------------------------------------------------------------------------
line("");
line("兼容处理:");

for (const name of ["lock"]) {
  const p = path.join(nextDir, name);
  try {
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, "");
      line(`  ✅ 已创建 .next/${name}（0 字节标记，Vercel 的 post-build 步骤会 lstat 它）`);
    } else {
      line(`  ℹ️ .next/${name} 已存在，未改动`);
    }
  } catch (e) {
    line(`  ⚠️ 创建 .next/${name} 失败（忽略）: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// 2) 保留 .next/cache
//
// 这里曾经清空过缓存，结果 Vercel 的下一个报错变成
//     ENOENT: lstat '/vercel/path0/.next/cache/.previewinfo'
// ——它要往那个目录里写自己的预览标记，目录被删掉就写不进去了。
// 缓存必须留着；上面补 .next/lock 才是真正解决 ENOENT 的那一步。
// ---------------------------------------------------------------------------
const cacheDir = path.join(nextDir, "cache");
line("");
line("缓存处理:");
if (fs.existsSync(cacheDir)) {
  line("  ℹ️ .next/cache 保留（Vercel 会在其中写入 .previewinfo）");
} else {
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
    line("  ✅ 已重建 .next/cache");
  } catch (e) {
    line(`  ⚠️ 重建 .next/cache 失败（忽略）: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// 3) 最终确认
// ---------------------------------------------------------------------------
line("");
line("处理后:");
for (const k of ["lock", "export-marker.json", "standalone"]) {
  line(`  ${k.padEnd(28)} ${info(k)}`);
}
line("=".repeat(70));
