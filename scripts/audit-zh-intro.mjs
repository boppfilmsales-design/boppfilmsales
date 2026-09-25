// Assess zh product intro coverage: how many products have empty or
// title-only body_html_zh, and total volume of the en body_html to translate.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const rows = await sql.query(
  `SELECT id, source_id, title, title_zh, body_html, body_html_zh FROM admin_products ORDER BY id`,
);
let ok = 0, empty = 0, trivial = 0;
const needIds = [];
let enChars = 0;
for (const r of rows) {
  const zh = (r.body_html_zh || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
  const en = (r.body_html || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();
  enChars += en.length;
  if (!zh) { empty++; needIds.push(r.id); }
  else if (zh.length < 40 && zh.length < en.length / 3) { trivial++; needIds.push(r.id); }
  else ok++;
}
console.log(`total=${rows.length} ok=${ok} empty=${empty} trivial=${trivial}`);
console.log(`products needing translation: ${needIds.length}`);
console.log(`total en plain-text chars: ${enChars} (avg ${Math.round(enChars / rows.length)})`);

// sample a trivial one
const t = rows.find((r) => needIds.includes(r.id) && (r.body_html_zh || "").replace(/<[^>]+>/g, "").trim());
if (t) {
  console.log(`\nsample trivial id=${t.id} title=${t.title.slice(0, 50)}`);
  console.log(`zh: ${t.body_html_zh.slice(0, 150)}`);
  console.log(`en: ${t.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200)}`);
}
const e = rows.find((r) => !(r.body_html_zh || "").trim() && (r.body_html || "").trim());
if (e) {
  console.log(`\nsample empty id=${e.id} title=${e.title.slice(0, 60)}`);
  console.log(`en plain: ${e.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 250)}`);
}
// how many needing have non-empty en at all
const needRows = rows.filter((r) => needIds.includes(r.id));
console.log(`\nof needing: with en body=${needRows.filter((r) => (r.body_html || "").replace(/<[^>]+>/g, "").trim()).length}, without en body=${needRows.filter((r) => !(r.body_html || "").replace(/<[^>]+>/g, "").trim()).length}`);
