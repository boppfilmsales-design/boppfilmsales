import type { MetadataRoute } from "next";
import { allProducts, getCategories, getContents } from "@/lib/site";

const BASE = "https://www.boppfilmsales.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    "",
    "/products",
    "/downloads",
    "/about",
    "/news",
    "/product-lines",
    "/honor",
    "/service",
    "/cases",
    "/contact",
    "/zh",
    "/zh/products",
    "/zh/downloads",
    "/zh/about",
    "/zh/contact",
  ].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "" ? 1 : path.includes("products") ? 0.9 : 0.7,
  }));

  const categories = getCategories().flatMap((category) => [
    {
      url: `${BASE}/products/${category.sourceId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE}/zh/products/${category.sourceId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  const products = allProducts().flatMap(({ category, product }) => [
    {
      url: `${BASE}/products/${category.sourceId}/${product.sourceId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${BASE}/zh/products/${category.sourceId}/${product.sourceId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ]);

  const subs = getCategories().flatMap((category) =>
    category.subs.map((sub) => ({
      url: `${BASE}/products/${category.sourceId}/list/${sub.sourceId}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  const entries = (["about", "lines", "honor", "service", "cases"] as const).flatMap((kind) =>
    getContents(kind).flatMap((column) =>
      (column.entries ?? [])
        .filter((entry) => !entry.isLink)
        .map((entry) => ({
          url: `${BASE}/entry/${kind}/${column.sourceId}/${entry.sourceId}`,
          lastModified: now,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
    ),
  );

  return [...staticRoutes, ...categories, ...subs, ...products, ...entries];
}
