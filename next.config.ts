import type { NextConfig } from "next";

/**
 * Vercel sets `VERCEL=1` in its build environment; Cloudflare's OpenNext build
 * does not.
 */
const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  /**
   * `output: "standalone"` is what OpenNext needs to assemble a Worker bundle,
   * but it restructures `.next` — and Vercel's post-build step then fails with
   * `ENOENT: no such file or directory, lstat '/vercel/path0/.next/lock'`
   * immediately after a perfectly clean `next build`.
   *
   * Vercel does not need standalone output (it has its own builder), so the
   * option is enabled only for the Cloudflare build. See
   * community.vercel.com/t/build-failure-post-build-enoent-on-next-export-detail-json-and-next-lock/47082
   */
  ...(isVercel ? {} : { output: "standalone" }),
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
   *
   * Vercel traces its serverless functions itself, so this is only meaningful
   * for the standalone (Cloudflare) build.
   */
  ...(isVercel
    ? {}
    : {
        outputFileTracingIncludes: {
          "/api/**": ["./src/data/site-seed.json"],
          "/admin": ["./src/data/site-seed.json"],
          "/news/**": ["./src/data/site-seed.json"],
          "/zh/**": ["./src/data/site-seed.json"],
          "/**": ["./src/data/site-seed.json"],
        },
      }),
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
