#!/usr/bin/env node
/**
 * Deploy to Cloudflare Workers, with guaranteed cleanup.
 *
 * `public/uploads` + `public/downloads` (~440 MB) are moved out before the build
 * (see scripts/local-media.mjs) because they are served from R2 at runtime.
 * npm only runs `postdeploy` when the deploy *succeeds*, so a failed deploy used
 * to leave the whole media library parked in `.local-media/` — which then shows
 * up in `git status` as ~2800 deleted files. This wrapper restores it in a
 * `finally` block, whatever happens.
 */
import { spawnSync } from "node:child_process";

const PREVIEW = process.argv.includes("--preview");
const BIN = process.platform === "win32" ? "opennextjs-cloudflare.cmd" : "opennextjs-cloudflare";

function run(command, args, label) {
  console.log(`\n> ${label}`);
  const res = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${label} failed (exit ${res.status})`);
  }
}

function localMedia(action) {
  spawnSync(process.execPath, ["scripts/local-media.mjs", action], { stdio: "inherit" });
}

let failed = null;

localMedia("stash");
try {
  if (!PREVIEW) run(process.execPath, ["scripts/check-cf-env.mjs"], "cf preflight");
  run(process.execPath, ["scripts/build-runtime-data.mjs"], "runtime data");
  run(BIN, ["build"], "opennext build");
  run(BIN, [PREVIEW ? "preview" : "deploy"], PREVIEW ? "workerd preview" : "wrangler deploy");
} catch (error) {
  failed = error;
} finally {
  localMedia("restore");
}

if (failed) {
  console.error(`\n[deploy] ${failed.message}`);
  console.error("[deploy] media library restored to public/ — nothing was lost.\n");
  process.exit(1);
}

console.log("\n[deploy] done.\n");
