import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    root: __dirname,
  },
  /**
   * `src/data/site-seed.json` is read with `fs` (see
   * `src/db/site-seed-reader.ts`) rather than imported, so the bundler has no
   * edge to it and would not copy it into the standalone output. Declare it
   * explicitly, otherwise the seed routine cannot populate an empty database
   * in production.
   */
  outputFileTracingIncludes: {
    "/api/**": ["./src/data/site-seed.json"],
    "/admin": ["./src/data/site-seed.json"],
    "/news/**": ["./src/data/site-seed.json"],
    "/zh/**": ["./src/data/site-seed.json"],
    "/**": ["./src/data/site-seed.json"],
  },
};

// Initialise OpenNext Cloudflare bindings for local development only.
// This must never run during `next build`, otherwise the dev-binding
// initialisation can hang the production build.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    initOpenNextCloudflareForDev();
  });
}

export default nextConfig;
