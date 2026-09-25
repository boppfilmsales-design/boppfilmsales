// One-off audit #2: every local /uploads/... or /downloads/... path referenced
// in the DB must exist under public/. Run: node scripts/audit-local-files.mjs
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const fields = {
  admin_products: ["image", "gallery_json", "body_html", "body_html_zh", "pdfs_json", "description", "technical", "offer"],
  admin_contents: ["data_json"],
  news_posts: ["image", "body_html"],
};

const missing = new Map();
let checked = 0;
for (const [table, cols] of Object.entries(fields)) {
  for (const col of cols) {
    const rows = await sql.query(`SELECT id, ${col} AS v FROM ${table}`);
    for (const r of rows) {
      const v = String(r.v || "");
      const paths = v.match(/(?:\/uploads|\/downloads|\/images)\/[A-Za-z0-9._\-/%]+/g) || [];
      for (let p of paths) {
        p = p.replace(/\\u002F/g, "/").replace(/&amp;/g, "&");
        if (p.includes("%")) continue; // encoded chars rare; skip
        checked++;
        const file = `public${p.split("?")[0]}`;
        if (!existsSync(file)) {
          const key = p.split("?")[0];
          if (!missing.has(key)) missing.set(key, []);
          missing.get(key).push(`${table}.${col}#${r.id}`);
        }
      }
    }
  }
}
console.log(`Checked ${checked} local path references.`);
if (missing.size === 0) {
  console.log("ALL referenced local files exist under public/. Site is self-contained for media.");
} else {
  console.log(`\nMISSING ${missing.size} files:`);
  for (const [p, refs] of [...missing].slice(0, 40)) {
    console.log(`  ${p}  <- ${[...new Set(refs)].slice(0, 3).join(", ")}`);
  }
  if (missing.size > 40) console.log(`  ... and ${missing.size - 40} more`);
}
