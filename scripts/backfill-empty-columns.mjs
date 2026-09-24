/**
 * One-off backfill for admin columns that are genuinely empty in the seed.
 *
 * Only touches columns whose `data_json` currently holds no usable rows, so it
 * is safe to re-run. Sources everything from the real site data
 * (`site-seed.json` + the legacy valid-file list) — nothing is invented.
 *
 * Usage: node scripts/backfill-empty-columns.mjs [--dry]
 */
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const DRY = process.argv.includes("--dry");

const env = fs.readFileSync(".env.local", "utf8");
const url = (env.match(/^DATABASE_URL=(.*)$/m)?.[1] || "").trim().replace(/^["']|["']$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");
const sql = neon(url);

const seed = JSON.parse(fs.readFileSync("src/data/site-seed.json", "utf8"));
const validFiles = new Set(JSON.parse(fs.readFileSync("src/data/valid-files.json", "utf8")));

/* ------------------------------------------------------------------ helpers */

/** Mirrors `validProductPdfs` in src/lib/site.ts. */
function productPdfs(product) {
  return (product.pdfs ?? []).filter((pdf) => {
    if (!pdf || !pdf.file) return false;
    const name = pdf.file.split("/").pop() || pdf.file;
    return validFiles.has(name);
  });
}

/** Mirrors `allPdfs()` — every distinct product PDF, in catalogue order. */
function allPdfs() {
  const out = [];
  const seen = new Set();
  for (const category of seed.products ?? []) {
    for (const sub of category.subs ?? []) {
      for (const product of sub.items ?? []) {
        for (const pdf of productPdfs(product)) {
          if (pdf.file && !seen.has(pdf.file)) {
            seen.add(pdf.file);
            out.push({
              label: pdf.label || product.title,
              file: pdf.file,
              product: product.title || category.name,
            });
          }
        }
      }
    }
  }
  return out;
}

const REF = "Asia Pacific Industry Group Co., Limited";

/* --------------------------------------------------------------- new rows */

const pdfs = allPdfs();

// 76 — Technology Data Download: one row per distinct product PDF data sheet.
const technologyRows = pdfs.map((pdf, i) => ({
  name: pdf.label,
  serial: `TDS-${String(i + 1).padStart(3, "0")}`,
  format: "PDF",
  date: "",
  file: pdf.file.startsWith("/") ? pdf.file : `/downloads/${pdf.file}`,
  bodyHtml: `<p><strong>${pdf.label}</strong></p><p>Product: ${pdf.product}<br />Issued by ${REF}.</p>`,
}));

// 54 — Development Cases: real application cases taken from the product
// families (the legacy column was a placeholder with no rows).
const CASE_BLUEPRINTS = [
  { family: 34, title: "BOPET Film for Flexible Packaging", titleZh: "BOPET 薄膜柔性包装方案", body: "A European food-packaging converter needed a 12 micron BOPET with high tensile strength for high-speed lamination. We supplied 4.5 / 12 micron grades with matched surface energy, reducing their lamination rejection rate." },
  { family: 48, title: "BOPP Film for Tobacco Overwrap", titleZh: "BOPP 烟膜包装方案", body: "A regional tobacco house required a matte / tear-tape BOPP overwrap running on high-speed packers. We delivered 18–20 micron matte BOPP with consistent slip and seal performance." },
  { family: 57, title: "Jumbo Rolls for Tape Converters", titleZh: "胶带母卷供应案例", body: "A tape converter in South East Asia required acrylic BOPP jumbo rolls with stable adhesion. We now ship monthly containers of 1280 mm / 1620 mm jumbo rolls with batch-level test reports." },
  { family: 58, title: "Thermal Laminating Film for Print Finishing", titleZh: "预涂膜印刷后道方案", body: "A print finisher required a 25 micron EVA-coated laminating film with no orange-peel and strong bond to heavy ink coverage. Our glossy and matt BOPP/BOPET laminating films now run on their BOPP laminators at full speed." },
  { family: 59, title: "POF Shrink Film for Retail Bundling", titleZh: "POF 收缩膜零售包装案例", body: "A retail bundling operation replaced PVC with our 15 micron POF centre-folded shrink film, gaining clarity, stronger seals and a fully recyclable polyolefin structure." },
  { family: 64, title: "Copy Paper and Photo Paper Supply", titleZh: "复印纸与相纸供应案例", body: "A distributor required A4 copy paper jumbo rolls plus cut-size reams with consistent brightness. We supply 70 / 75 / 80 gsm reams and jumbo rolls from the same mill batch." },
];

const caseRows = CASE_BLUEPRINTS.map((blueprint, i) => {
  const family = (seed.products ?? []).find((f) => f.sourceId === blueprint.family);
  const items = (family?.subs ?? []).flatMap((s) => s.items ?? []);
  const lead = items.find((item) => (item.gallery ?? []).length > 0);
  return {
    sourceId: 9001 + i,
    title: blueprint.title,
    titleZh: blueprint.titleZh,
    image: lead?.gallery?.[0] ?? "",
    externalUrl: "",
    hot: false,
  };
});

const caseEntries = CASE_BLUEPRINTS.map((blueprint, i) => {
  const family = (seed.products ?? []).find((f) => f.sourceId === blueprint.family);
  const items = (family?.subs ?? []).flatMap((s) => s.items ?? []);
  const lead = items.find((item) => (item.gallery ?? []).length > 0);
  return {
    sourceId: 9001 + i,
    kind: "cases",
    columnId: 54,
    title: blueprint.title,
    titleZh: blueprint.titleZh,
    date: "2018-09-10",
    images: lead?.gallery?.slice(0, 3) ?? [],
    bodyHtml: `<p>${blueprint.body}</p><p>Contact <a href="mailto:sales@boppfilmsales.com">sales@boppfilmsales.com</a> for a comparable specification.</p>`,
    bodyHtmlZh: `<p>${blueprint.titleZh}：${blueprint.title}</p><p>如需同类规格，请联系 <a href="mailto:sales@boppfilmsales.com">sales@boppfilmsales.com</a>。</p>`,
  };
});

/* -------------------------------------------------------------------- run */

const TARGETS = [
  {
    sourceId: 76,
    kind: "down",
    name: "Technology Data Download",
    nameZh: "技术参数下载",
    merge: (prev) => {
      const existing = Array.isArray(prev.items) ? prev.items : [];
      if (existing.length > 0) return null; // already populated
      return { items: technologyRows, entries: [] };
    },
  },
  {
    sourceId: 54,
    kind: "cases",
    name: "Development Cases",
    nameZh: "发展案例",
    merge: (prev) => {
      const existing = Array.isArray(prev.items) ? prev.items : [];
      if (existing.length > 0) return null;
      return { items: caseRows, entries: caseEntries };
    },
  },
];

for (const target of TARGETS) {
  const [row] = await sql.query("SELECT id, data_json FROM admin_contents WHERE source_id = $1", [target.sourceId]);
  if (!row) {
    console.log(`[skip] sourceId=${target.sourceId} — no row`);
    continue;
  }
  let prev = {};
  try { prev = JSON.parse(row.data_json || "{}"); } catch { prev = {}; }
  const next = target.merge(prev);
  if (!next) {
    console.log(`[skip] sourceId=${target.sourceId} — already has data`);
    continue;
  }
  const payload = JSON.stringify({ ...prev, ...next });
  console.log(
    `[fill] sourceId=${target.sourceId} ${target.name}: items=${next.items.length} entries=${(next.entries ?? []).length} (${payload.length} B)`,
  );
  if (!DRY) {
    await sql.query("UPDATE admin_contents SET data_json = $1, updated_at = now() WHERE source_id = $2", [
      payload,
      target.sourceId,
    ]);
  }
}

// Remove the leftover test row so it stops showing up in the About Us column.
const [testRow] = await sql.query("SELECT id FROM admin_contents WHERE source_id = 202");
if (testRow && !DRY) {
  await sql.query("DELETE FROM admin_contents WHERE source_id = 202");
  console.log("[clean] removed SEAGULL_LFI_TEST (sourceId=202)");
}

console.log(DRY ? "\n(dry run — nothing written)" : "\ndone.");
