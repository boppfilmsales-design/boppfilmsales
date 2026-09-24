/**
 * Backfills the 7 sidebar columns that exist in the source CMS but had no row
 * in `admin_contents` at all, so the admin panel showed an empty table with no
 * way to edit them (user request #3).
 *
 *   Other (其他)
 *     21  banner-首页          -> image-list, home hero slides
 *     31  友情链接             -> news-list,  footer "Link" column
 *     47  公司介绍-首页        -> image-list, home about section
 *   Contact Us (联系我们)
 *     32  General Information  -> news-list, the contact details block
 *     155 Get Contacts         -> single,    the contact page intro
 *     156 Send Inquiry         -> single,    the inquiry form copy
 *     162 Give Advice To Seller-> single,    the feedback form copy
 *
 * Everything is read from the real site data (site-seed.json / home-summary.json
 * / the live front-end copy) — nothing is invented. Idempotent: a column that
 * already holds usable rows is left untouched.
 *
 * Usage: node scripts/backfill-missing-columns.mjs [--dry] [--force]
 */
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] || "").trim().replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const sql = neon(url);

const seed = JSON.parse(fs.readFileSync("src/data/site-seed.json", "utf8"));
const home = JSON.parse(fs.readFileSync("src/data/home-summary.json", "utf8"));
const validFiles = new Set(JSON.parse(fs.readFileSync("src/data/valid-files.json", "utf8")));

/* ------------------------------------------------------------------ helpers */

/** True when a gallery entry points at a file that actually exists on disk. */
function realImage(name) {
  if (!name) return false;
  const base = String(name).split("/").pop();
  return validFiles.has(base) || validFiles.has(String(name));
}

/**
 * Home hero slides. The legacy home page rotates through the lead images of the
 * featured products, which is exactly what `home-summary.gallery` holds.
 */
function heroSlides() {
  return (home.gallery ?? []).slice(0, 8).map((item, i) => ({
    sourceId: 2100 + i,
    title: item.title || `Home banner ${i + 1}`,
    image: item.src,
  }));
}

/** The home "about" block reuses the About Us body already in the seed. */
function homeAboutImages() {
  const about = (seed.contents ?? []).find((c) => c.sourceId === 13);
  const items = about?.items;
  const images = items && !Array.isArray(items) && Array.isArray(items.images) ? items.images : [];
  const gallery = (home.gallery ?? []).map((g) => g.src);
  const picked = [...images, ...gallery].filter(realImage).slice(0, 6);
  return picked.map((image, i) => ({ sourceId: 4700 + i, title: `Factory & production ${i + 1}`, image }));
}

/** The footer's "Link" column — mirror of src/components/SiteFooter.tsx. */
const FRIEND_LINKS = [
  { name: "Asia Pacific Industry Group Co., Limited", file: "/" },
  { name: "Anhui Eastern Communication Group", file: "/" },
  { name: "Asia Pacific International Co., Limited", file: "/" },
  { name: "Foreign exchange", file: "http://www.boc.cn/sourcedb/whpj" },
  { name: "Shipping Information", file: "http://www.shipxy.com/" },
  { name: "Shipping fees", file: "http://ship.shippingchina.com/fclprice/index" },
  { name: "Site background", file: "http://www.apigcl.com/admin/" },
].map((l, i) => ({
  name: l.name,
  title: l.name,
  serial: String((i + 1) * 10),
  format: "LINK",
  date: "",
  file: l.file,
}));

/** The contact details shown on /contact — mirror of src/app/contact/page.tsx. */
const CONTACT_LINES = [
  { label: "Company", value: "Asia Pacific Industry Group Co., Limited" },
  { label: "Address", value: "NO.3399 LUZHOU AVE., BAOHE DIST., 230051, HEFEI, ANHUI, CHINA" },
  { label: "Tel", value: "86-551-64687285" },
  { label: "Skype", value: "asiapacificsale / boppfilmsales / boppfilmsale" },
  { label: "QQ", value: "840715367 / 2538474128 / 156641365 / 2500526557" },
  { label: "Mobile / WhatsApp / WeChat", value: "86-18919654871 / 86-18919659471 / 86-18955113807" },
  { label: "E-mail", value: "sales@boppfilmsales.com / admin@apigcl.com" },
  { label: "Website", value: "www.apigcl.com & www.boppfilmsales.com" },
];

const CONTACT_ROWS = CONTACT_LINES.map((line, i) => ({
  name: line.label,
  title: line.label,
  serial: String((i + 1) * 10),
  format: "TEXT",
  date: "",
  file: "",
  bodyHtml: `<p><strong>${line.label}:</strong> ${line.value}</p>`,
}));

/* ------------------------------------------------------------- definitions */

const COLUMNS = [
  {
    sourceId: 21,
    kind: "honor",
    name: "banner-首页",
    nameZh: "banner-首页",
    build: () => ({ items: heroSlides(), entries: [], itemsZh: {} }),
  },
  {
    sourceId: 31,
    kind: "down",
    name: "友情链接",
    nameZh: "友情链接",
    build: () => ({ items: FRIEND_LINKS, entries: [], itemsZh: {} }),
  },
  {
    sourceId: 47,
    kind: "honor",
    name: "公司介绍-首页",
    nameZh: "公司介绍-首页",
    build: () => ({ items: homeAboutImages(), entries: [], itemsZh: {} }),
  },
  {
    sourceId: 32,
    kind: "down",
    name: "General Information",
    nameZh: "General Information",
    build: () => ({ items: CONTACT_ROWS, entries: [], itemsZh: {} }),
  },
  {
    sourceId: 155,
    kind: "about",
    name: "Get Contacts",
    nameZh: "Get Contacts",
    build: () => ({
      items: {
        bodyHtml:
          "<p>Asia Pacific Industry Group Co., Limited is a global supplier of BOPP film, BOPET film, BOPP packing tape, thermal laminating film, POF shrink film and complete film production lines.</p>" +
          "<p>Our sales engineers reply to every technical enquiry within 12 working hours. Please use the form on this page, or reach us directly through the channels listed alongside.</p>",
        images: [],
      },
      entries: [],
      itemsZh: {
        bodyHtml:
          "<p>亚太工业集团有限公司是全球 BOPP 薄膜、BOPET 薄膜、BOPP 包装胶带、热复合膜、POF 收缩膜及整套薄膜生产线的供应商。</p>" +
          "<p>我们的销售工程师会在 12 个工作小时内回复每一封技术询盘。您可以使用本页表单，或通过旁边的联系方式直接与我们联系。</p>",
      },
    }),
  },
  {
    sourceId: 156,
    kind: "about",
    name: "Send Inquiry",
    nameZh: "Send Inquiry",
    build: () => ({
      items: {
        bodyHtml:
          "<p>Fill in the inquiry form with your product grade, thickness, width, quantity and destination port, and our engineers will recommend a matching film with a full quotation.</p>" +
          "<p>Fields marked with an asterisk are required. Your details are stored securely and are never shared with third parties.</p>",
        images: [],
      },
      entries: [],
      itemsZh: {
        bodyHtml:
          "<p>请在询盘表单中填写产品牌号、厚度、宽度、数量与目的港，我们的工程师会为您推荐匹配的薄膜并提供完整报价。</p>" +
          "<p>带星号的字段为必填项。您的信息将被安全保存，不会提供给任何第三方。</p>",
      },
    }),
  },
  {
    sourceId: 162,
    kind: "about",
    name: "Give Advice To Seller",
    nameZh: "Give Advice To Seller",
    build: () => ({
      items: {
        bodyHtml:
          "<p>Existing customers can use this channel to send feedback about product quality, packing, delivery or after-sales service. Every message is read by our quality team and acknowledged within two working days.</p>",
        images: [],
      },
      entries: [],
      itemsZh: {
        bodyHtml:
          "<p>老客户可通过本渠道反馈产品质量、包装、交期或售后服务方面的意见。每一条留言都会由质量团队阅读，并在两个工作日内答复。</p>",
      },
    }),
  },
];

/* ---------------------------------------------------------------------- run */

function hasRows(dataJson) {
  let parsed;
  try {
    parsed = JSON.parse(dataJson || "{}");
  } catch {
    return false;
  }
  if (Array.isArray(parsed.items)) return parsed.items.length > 0;
  if (parsed.items && typeof parsed.items === "object") {
    return Object.keys(parsed.items).length > 0;
  }
  if (Array.isArray(parsed.entries)) return parsed.entries.length > 0;
  return false;
}

console.log(DRY ? "== DRY RUN ==" : "== APPLYING ==");
let created = 0;
let skipped = 0;

for (const col of COLUMNS) {
  const [existing] = await sql.query(
    "select source_id, kind, name, data_json from admin_contents where source_id = $1",
    [col.sourceId],
  );

  if (existing && hasRows(existing.data_json) && !FORCE) {
    console.log(`  skip  ${col.sourceId} ${col.name} (already has rows)`);
    skipped += 1;
    continue;
  }

  const payload = col.build();
  const itemCount = Array.isArray(payload.items)
    ? payload.items.length
    : Object.keys(payload.items ?? {}).length;
  const dataJson = JSON.stringify(payload);

  if (DRY) {
    console.log(`  DRY   ${col.sourceId} ${col.name} (${col.kind}) -> ${itemCount} item(s), ${dataJson.length} bytes`);
    continue;
  }

  await sql.query(
    `insert into admin_contents (source_id, kind, name, name_zh, data_json, updated_at)
     values ($1, $2, $3, $4, $5, now())
     on conflict (source_id) do update
       set kind = excluded.kind,
           name = excluded.name,
           name_zh = excluded.name_zh,
           data_json = excluded.data_json,
           updated_at = now()`,
    [col.sourceId, col.kind, col.name, col.nameZh, dataJson],
  );
  console.log(`  ok    ${col.sourceId} ${col.name} (${col.kind}) -> ${itemCount} item(s)`);
  created += 1;
}

console.log(`\ncreated/updated ${created}, skipped ${skipped}`);

if (!DRY) {
  const rows = await sql.query(
    "select source_id, kind, name, length(data_json)::int as bytes from admin_contents order by source_id",
  );
  console.log(`\ntotal admin_contents rows: ${rows.length}`);
  console.table(rows.filter((r) => [21, 31, 47, 32, 155, 156, 162].includes(r.source_id)));
}
