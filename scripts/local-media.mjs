#!/usr/bin/env node
/**
 * Move the legacy media library out of `public/` before a Cloudflare build.
 *
 * `public/uploads` and `public/downloads` hold ~440 MB of images and PDFs. They
 * are already served from R2 through `/api/media/...`, so shipping them as
 * static assets would only bloat the Worker bundle. This script parks them in
 * `.local-media/` for the duration of the build and puts them back afterwards,
 * which keeps `next dev` (whose R2 binding is absent) working normally.
 *
 * Commands:
 *   stash    public/<dir>  ->  .local-media/<dir>
 *   restore  .local-media/<dir>  ->  public/<dir>
 *   status   show where each directory currently lives
 */
import { access, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";

const DIRS = ["uploads", "downloads"];
const PUBLIC_DIR = join(process.cwd(), "public");
const STASH_DIR = join(process.cwd(), ".local-media");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function move(from, to) {
  if (!(await exists(from))) return "missing";
  if (await exists(to)) return "blocked";
  await rename(from, to);
  return "moved";
}

const command = process.argv[2] ?? "status";

if (command === "stash") {
  await mkdir(STASH_DIR, { recursive: true });
  for (const dir of DIRS) {
    const result = await move(join(PUBLIC_DIR, dir), join(STASH_DIR, dir));
    console.log(`stash ${dir}: ${result}`);
  }
} else if (command === "restore") {
  for (const dir of DIRS) {
    const result = await move(join(STASH_DIR, dir), join(PUBLIC_DIR, dir));
    console.log(`restore ${dir}: ${result}`);
  }
} else {
  for (const dir of DIRS) {
    const inPublic = await exists(join(PUBLIC_DIR, dir));
    const inStash = await exists(join(STASH_DIR, dir));
    console.log(`${dir}: public=${inPublic} stashed=${inStash}`);
  }
}
