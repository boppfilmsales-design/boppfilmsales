import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration — SQLite / Cloudflare D1 flavour.
 *
 * The site now stores everything in D1 (see `src/db/index.ts`), so migrations
 * are generated as SQLite. `drizzle-kit generate` writes plain SQL to
 * `./drizzle`, which is then applied to D1 with:
 *
 *   npx wrangler d1 migrations apply boppfilmsales-db --remote
 *
 * The old `DATABASE_URL` (Neon) is intentionally no longer required here; it
 * is still kept in `.env.local` so the legacy database can be inspected or
 * used as a fallback.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
