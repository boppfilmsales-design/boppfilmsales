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
import { readFileSync } from "node:fs";

const PREVIEW = process.argv.includes("--preview");

/**
 * Credentials, so that `npm run deploy` needs no shell setup at all.
 *
 * Pasting a token into PowerShell goes wrong constantly (Chinese placeholder
 * text, stray spaces, a whole credentials block). So the token can also live in
 * a gitignored `.cf-token` file, and whatever we are given is reduced to the
 * `cfat_…` token itself before use.
 */
const TOKEN_RE = /cfat_[A-Za-z0-9_-]{20,}/;

function pickToken() {
  const fromEnv = (process.env.CLOUDFLARE_API_TOKEN ?? "").match(TOKEN_RE)?.[0];
  if (fromEnv) return fromEnv;
  try {
    const fromFile = readFileSync(".cf-token", "utf8").match(TOKEN_RE)?.[0];
    if (fromFile) {
      console.log("[deploy] using the API token from .cf-token");
      return fromFile;
    }
  } catch {
    /* no .cf-token */
  }
  return undefined;
}

const token = pickToken();
if (token) process.env.CLOUDFLARE_API_TOKEN = token;

if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  try {
    const id = readFileSync("wrangler.jsonc", "utf8").match(/"account_id"\s*:\s*"([0-9a-f]{32})"/)?.[1];
    if (id) {
      process.env.CLOUDFLARE_ACCOUNT_ID = id;
      console.log(`[deploy] using account ${id} from wrangler.jsonc`);
    }
  } catch {
    /* wrangler.jsonc missing */
  }
}
const BIN = process.platform === "win32" ? "opennextjs-cloudflare.cmd" : "opennextjs-cloudflare";

/**
 * Run node directly (no shell). On Windows, node lives at
 * `C:\Program Files\nodejs\node.exe` and cmd.exe would split the path at the
 * space — `'C:\Program' is not recognized`.
 */
function run(command, args, label) {
  console.log(`\n> ${label}`);
  const res = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (res.error) {
    if (res.error.code === "ENOENT") {
      throw new Error(`cannot run "${command}" (ENOENT)`);
    }
    throw res.error;
  }
  if (res.status !== 0) throw new Error(`${label} failed (exit ${res.status})`);
}

/**
 * Run the npm-provided `.cmd`/sh shim. It is passed as a single command string
 * (no args array) because `shell: true` + args is deprecated on Windows (DEP0190)
 * and the shim is not a real executable that can be spawned directly.
 */
function runBin(args, label) {
  console.log(`\n> ${label}`);
  const res = spawnSync(`${BIN} ${args.join(" ")}`, { stdio: "inherit", shell: true });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${label} failed (exit ${res.status})`);
}

function localMedia(action) {
  spawnSync(process.execPath, ["scripts/local-media.mjs", action], { stdio: "inherit" });
}

let failed = null;

localMedia("stash");
try {
  if (!PREVIEW) run(process.execPath, ["scripts/check-cf-env.mjs"], "cf preflight");
  run(process.execPath, ["scripts/build-runtime-data.mjs"], "runtime data");
  runBin(["build"], "opennext build");
  runBin([PREVIEW ? "preview" : "deploy"], PREVIEW ? "workerd preview" : "wrangler deploy");
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
