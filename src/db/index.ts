import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

/**
 * Cloudflare D1 data-access layer.
 *
 * The site runs on Cloudflare Workers (via @opennextjs/cloudflare) and stores
 * everything in D1, reached through the `DB` binding declared in
 * `wrangler.jsonc`. D1 is a Worker binding rather than a TCP connection, so
 * there is no connection pool and no metered egress — reads and writes never
 * leave Cloudflare's network.
 *
 * `getCloudflareContext()` is only available while a request is being handled,
 * so the drizzle instance is built lazily on first use (see the `db` proxy
 * below) instead of at module load time.
 */
export type Db = DrizzleD1Database<typeof schema>;

let _db: Db | undefined;

/** Resolve the D1 binding from the current Cloudflare context. */
function binding(): D1Database {
  const { env } = getCloudflareContext();
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) {
    throw new Error(
      "D1 binding `DB` is missing. Add the `d1_databases` entry to wrangler.jsonc and re-run `npm run cf-typegen`.",
    );
  }
  return db;
}

export function getDb(): Db {
  if (!_db) _db = drizzle(binding(), { schema });
  return _db;
}

/** Drop the cached drizzle instance (used by scripts that swap bindings). */
export function resetDb(): void {
  _db = undefined;
}

export const db = new Proxy({} as Db, {
  get: (_t, p) => Reflect.get(getDb() as object, p),
});

export { schema };
