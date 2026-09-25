// Audit zh coverage of the fields the zh product page actually renders:
// description_zh / technical_zh / offer_zh / subtitle_zh (tabs 产品描述/技术参数/报价详情).
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);

const plain = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();

const rows = await sql.query(
  `SELECT id, title, title_zh, subtitle, subtitle_zh, description, description_zh,
          technical, technical_zh, offer, offer_zh FROM admin_products ORDER BY id`,
);

const stats = { descEmpty: [], descTrivial: [], techEmpty: 0, offerEmpty: 0, titleEmpty: 0, subEmpty: 0 };
let descEnChars = 0;
for (const r of rows) {
  const zh = plain(r.description_zh);
  const en = plain(r.description);
  descEnChars += en.length;
  if (!r.title_zh.trim()) stats.titleEmpty++;
  if (!r.subtitle_zh.trim()) stats.subEmpty++;
  if (!zh) stats.descEmpty.push(r.id);
  else if (zh.length < 40 && zh.length < en.length / 3) stats.descTrivial.push(r.id);
  if (!plain(r.technical_zh) && plain(r.technical)) stats.techEmpty++;
  if (!plain(r.offer_zh) && plain(r.offer)) stats.offerEmpty++;
}
console.log(`products=${rows.length}`);
console.log(`title_zh empty: ${stats.titleEmpty}, subtitle_zh empty: ${stats.subEmpty}`);
console.log(`description_zh: empty=${stats.descEmpty.length}, trivial=${stats.descTrivial.length}`);
console.log(`  -> need translation ids: ${[...stats.descEmpty, ...stats.descTrivial].length}`);
console.log(`technical_zh missing (en present): ${stats.techEmpty}, offer_zh missing (en present): ${stats.offerEmpty}`);
console.log(`en description plain chars total: ${descEnChars}`);
console.log(`descEmpty ids:`, stats.descEmpty.slice(0, 50).join(","));
console.log(`descTrivial ids:`, stats.descTrivial.join(","));
