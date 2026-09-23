import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "src", "data");

function readJson(p) {
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

function stripHtml(value, max = 220) {
  const text = (value ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function productImageUrl(value) {
  const source = (value ?? "").trim();
  if (!source) return "";
  if (source.startsWith("/")) return source;
  if (/^https?:\/\//i.test(source)) return source;
  return `/uploads/products/${source}`;
}

const seed = readJson(path.join(dataDir, "site-seed.json"));
const validFilesList = readJson(path.join(dataDir, "valid-files.json"));

const families = seed.products ?? [];
const itemsById = seed.items ?? {};
const contents = seed.contents ?? [];
const validFiles = new Set(validFilesList);

function familyProducts(family) {
  const ordered = (family.itemIds ?? [])
    .map((id) => itemsById[`${family.sourceId}:${id}`])
    .filter(Boolean);
  if (ordered.length) return ordered;
  return family.subs.flatMap((sub) => sub.items ?? []);
}

function familyCount(family) {
  return familyProducts(family).length;
}

function featuredProducts(limit = 10) {
  const out = [];
  for (const category of families) {
    const product = familyProducts(category).find((p) => (p.gallery ?? []).length > 0);
    if (product) out.push({ category, product });
    if (out.length >= limit) break;
  }
  return out;
}

function catalogueImages(limit = 12) {
  const out = [];
  for (const category of families) {
    for (const product of familyProducts(category)) {
      for (const image of product.gallery ?? []) {
        out.push({ src: productImageUrl(image), title: product.title || category.name });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

function isValidFile(file) {
  if (!file) return false;
  const name = file.split("/").pop() || file;
  return validFiles.has(name);
}

function validProductPdfs(product) {
  return (product.pdfs ?? []).filter((pdf) => pdf?.file && isValidFile(pdf.file));
}

function allPdfs(limit) {
  const out = [];
  const seen = new Set();
  for (const category of families) {
    for (const sub of category.subs) {
      for (const product of sub.items) {
        for (const pdf of validProductPdfs(product)) {
          if (pdf.file && !seen.has(pdf.file)) {
            seen.add(pdf.file);
            out.push({
              label: pdf.label,
              file: pdf.file,
              product: product.title || category.name,
            });
            if (limit && out.length >= limit) return out;
          }
        }
      }
    }
  }
  return out;
}

function productCount(category) {
  if (category) return familyCount(category);
  return families.reduce((sum, c) => sum + familyCount(c), 0);
}

function categoryProductNames(category, limit = 3) {
  return familyProducts(category)
    .slice(0, limit)
    .map((item) => item.title)
    .filter(Boolean);
}

function categoryProductNamesZh(category, limit = 3) {
  return familyProducts(category)
    .slice(0, limit)
    .map((item) => item.titleZh || item.title)
    .filter(Boolean);
}

function contentBody(content, lang) {
  if (!content) return "";
  const items = content.items ?? {};
  if (lang === "zh") {
    const zh = content.itemsZh ?? {};
    return zh.bodyHtml || items.bodyHtml || "";
  }
  return items.bodyHtml ?? "";
}

function homeAboutZhHtml() {
  const about = contents.find((c) => c.kind === "about" && String(c.sourceId) === "13");
  return contentBody(about, "zh");
}

const navCategories = families.map((family) => ({
  sourceId: family.sourceId,
  name: family.name,
  nameZh: family.nameZh,
  count: familyCount(family),
  sampleNames: categoryProductNames(family, 3),
  sampleNamesZh: categoryProductNamesZh(family, 3),
  subs: (family.subs ?? []).map((sub) => ({
    sourceId: sub.sourceId,
    name: sub.name,
    nameZh: sub.nameZh,
    firstItemId: sub.itemIds?.[0] ?? sub.items?.[0]?.sourceId ?? 0,
    count: sub.items?.length ?? 0,
  })),
}));

const homeSummary = {
  categories: navCategories,
  featured: featuredProducts(10).map(({ category, product }) => ({
    category: {
      sourceId: category.sourceId,
      name: category.name,
      nameZh: category.nameZh,
    },
    product: {
      sourceId: product.sourceId,
      title: product.title,
      titleZh: product.titleZh,
      gallery0: productImageUrl(product.gallery?.[0] ?? ""),
    },
  })),
  gallery: catalogueImages(8),
  pdfs: allPdfs(30),
  totalProducts: productCount(),
  aboutZhHtml: homeAboutZhHtml(),
};

fs.writeFileSync(
  path.join(dataDir, "site-nav.json"),
  JSON.stringify({ categories: navCategories }),
);
fs.writeFileSync(path.join(dataDir, "home-summary.json"), JSON.stringify(homeSummary));

const navSize = (fs.statSync(path.join(dataDir, "site-nav.json")).size / 1024).toFixed(1);
const homeSize = (fs.statSync(path.join(dataDir, "home-summary.json")).size / 1024).toFixed(1);
console.log(`Generated src/data/site-nav.json (${navSize} KB)`);
console.log(`Generated src/data/home-summary.json (${homeSize} KB)`);
