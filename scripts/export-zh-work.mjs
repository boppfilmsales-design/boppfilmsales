// Export the en->zh workloads that need translation into JSON working files.
import { readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/DATABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, "");
const sql = neon(url);
const plain = (s) => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim();

const rows = await sql.query(
  `SELECT id, title, title_zh, subtitle, subtitle_zh, description, description_zh,
          technical, technical_zh, offer, offer_zh FROM admin_products ORDER BY id`,
);
const needsDesc = (r) => {
  const zh = plain(r.description_zh);
  const en = plain(r.description);
  return !zh || (zh.length < 40 && zh.length < en.length / 3);
};

const desc = [], titles = [], tech = [], offer = [];
let vol = { desc: 0, tech: 0, offer: 0 };
for (const r of rows) {
  if (!r.title_zh.trim()) titles.push({ id: r.id, title: r.title });
  if (!r.subtitle_zh.trim() && r.subtitle.trim()) titles.push({ id: r.id, subtitle: r.subtitle });
  if (needsDesc(r) && plain(r.description)) {
    desc.push({ id: r.id, html: r.description });
    vol.desc += r.description.length;
  }
  if (!plain(r.technical_zh) && plain(r.technical)) {
    tech.push({ id: r.id, html: r.technical });
    vol.tech += r.technical.length;
  }
  if (!plain(r.offer_zh) && plain(r.offer)) {
    offer.push({ id: r.id, html: r.offer });
    vol.offer += r.offer.length;
  }
}
writeFileSync(".zh-work/descriptions.json", JSON.stringify(desc, null, 1));
writeFileSync(".zh-work/titles.json", JSON.stringify(titles, null, 1));
writeFileSync(".zh-work/technical.json", JSON.stringify(tech, null, 1));
writeFileSync(".zh-work/offers.json", JSON.stringify(offer, null, 1));
console.log(`descriptions: ${desc.length} items, raw html chars=${vol.desc}`);
console.log(`titles/subtitles: ${titles.length} items`);
console.log(`technical: ${tech.length} items, chars=${vol.tech}`);
console.log(`offers: ${offer.length} items, chars=${vol.offer}`);
