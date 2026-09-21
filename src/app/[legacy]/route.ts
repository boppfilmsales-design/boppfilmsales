import { notFound, permanentRedirect } from "next/navigation";
import { allProducts, getCategories, getContents, getItem, type SiteContent } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Legacy about.php?i_id=<n> values, as printed on the old site. */
const ABOUT_IID: Record<string, number> = {
  "16": 13,
  "100": 55,
  "101": 56,
  "306": 169,
  "335": 171,
  "336": 172,
};

/** show.php column ids that belong to the news section (database backed). */
const NEWS_COLUMNS = new Set(["41", "49", "52"]);

const KINDS = ["about", "lines", "honor", "service", "cases"] as const;

/** product_show.php / product.php use the *sub category* id, the new site uses
 *  /products/<family id>/<item id>. */
function familyOfSub(subId: string) {
  return getCategories().find((family) => family.subs.some((sub) => String(sub.sourceId) === subId));
}

function productHref(subId: string, itemId: string) {
  const found = allProducts().find(
    ({ product }) => String(product.sourceId) === itemId && String(product.catId) === subId,
  ) ?? allProducts().find(({ product }) => String(product.sourceId) === itemId);
  if (!found) return "";
  return `/products/${found.category.sourceId}/${found.product.sourceId}`;
}

function columnKind(sourceId: string): (typeof KINDS)[number] | undefined {
  for (const kind of KINDS) {
    const column = getContents(kind).find((item: SiteContent) => String(item.sourceId) === sourceId);
    if (column) return kind;
  }
  return undefined;
}

function entryHref(kind: string, columnId: string, id: string) {
  return `/entry/${kind}/${columnId}/${id}`;
}

/**
 * Every legacy *.php URL of apigcl.com is redirected to the matching page of
 * the new site (see the README for the full table).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ legacy: string }> },
) {
  const { legacy } = await params;
  if (!legacy.endsWith(".php")) notFound();
  const query = new URL(request.url).searchParams;
  const id = (name: string) => query.get(name) ?? "";
  const cId = id("c_id") || id("id");
  const topId = id("top_id") || cId;
  const iId = id("i_id");

  switch (legacy) {
    case "about.php":
    case "about_list_txt.php": {
      const aboutId = iId ? ABOUT_IID[iId] ?? Number(iId) : Number(cId);
      permanentRedirect(`/about?id=${aboutId}`);
    }
    case "about_list_img.php":
    case "honor.php":
      permanentRedirect(`/honor?id=${cId || "16"}`);
    case "product_lines.php":
      permanentRedirect(`/product-lines?id=${cId}`);
    case "product_lines_show.php":
      permanentRedirect(entryHref("lines", cId, iId));
    case "service.php":
      permanentRedirect(`/service?id=${cId}`);
    case "service_show.php":
      permanentRedirect(entryHref("service", cId, iId));
    case "case.php":
      permanentRedirect(`/cases?id=${cId}`);
    case "down.php":
      permanentRedirect("/downloads");
    case "product_info.php":
      permanentRedirect("/products");
    case "product.php": {
      if (cId && topId && topId !== cId) permanentRedirect(`/products/${topId}/list/${cId}`);
      if (!cId) permanentRedirect("/products");
      const family = familyOfSub(cId);
      permanentRedirect(family ? `/products/${family.sourceId}/list/${cId}` : `/products/${cId}`);
    }
    case "product_show.php": {
      if (!getItem(cId, iId)) notFound();
      const href = productHref(cId, iId);
      permanentRedirect(href || "/products");
    }
    case "product_detail.php": {
      const found = allProducts().find(({ product }) => String(product.sourceId) === iId);
      if (!found) notFound();
      permanentRedirect(`/products/${found.category.sourceId}/${iId}`);
    }
    case "show.php": {
      if (NEWS_COLUMNS.has(cId)) {
        const slug =
          cId === "41" ? "industry-news" : cId === "49" ? "company-news" : "employees-literary";
        permanentRedirect(`/news/${slug}/${iId}`);
      }
      const kind = columnKind(cId);
      if (!kind) notFound();
      permanentRedirect(kind === "about" ? `/about?id=${cId}` : entryHref(kind, cId, iId));
    }
    default:
      notFound();
  }
}

