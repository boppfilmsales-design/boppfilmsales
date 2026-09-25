// One-off audit: find any references to the source site (apigcl.com) stored in
// the Neon database. Run: node scripts/audit-external-refs.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const textCols = {
  admin_products: ["title", "image", "gallery_json", "body_html", "body_html_zh", "description", "technical", "offer", "pdfs_json"],
  admin_contents: ["name", "data_json"],
  news_posts: ["title", "image", "body_html", "body_text", "excerpt"],
  site_settings: ["key", "value"],
};

let totalIssues = 0;
for (const [table, cols] of Object.entries(textCols)) {
  for (const col of cols) {
    const rows = await sql.query(
      `SELECT id, ${col} AS v FROM ${table} WHERE ${col} LIKE '%apigcl.com%' LIMIT 500`
    );
    if (rows.length) {
      totalIssues += rows.length;
      console.log(`\n### ${table}.${col}: ${rows.length} rows reference apigcl.com`);
      for (const r of rows.slice(0, 6)) {
        const v = String(r.v);
        const m = v.match(/https?:\/\/[^"'\s<>\\]+apigcl\.com[^"'\s<>\\]*/g) || [];
        console.log(`  id=${r.id} -> ${[...new Set(m)].slice(0, 3).join(" | ").slice(0, 180)}`);
      }
      if (rows.length > 6) console.log(`  ... and ${rows.length - 6} more`);
    }
  }
}
console.log(`\nTOTAL rows with apigcl.com refs: ${totalIssues}`);
console.log("AUDIT DONE");
