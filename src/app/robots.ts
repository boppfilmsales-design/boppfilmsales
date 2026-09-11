import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin"],
    },
    sitemap: "https://www.boppfilmsales.com/sitemap.xml",
    host: "https://www.boppfilmsales.com",
  };
}
