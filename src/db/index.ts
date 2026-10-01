import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle as drizzleRemote } from "drizzle-orm/sqlite-proxy";

import * as schema from "./schema";

/**
 * Data-access layer.
 *
 * `www.boppfilmsales.com` runs on Cloudflare Workers and reaches D1 through the
 * `DB` binding declared in `wrangler.jsonc` — a Worker binding rather than a TCP
 * connection, so there is no pool and no metered egress.
 *
 * `www.apigcl.com` runs on Vercel, where that binding does not exist. It talks
 * to the *same* D1 database over Cloudflare's HTTP query API instead, so both
 * domains read and write one database and no replication is involved. Set
 * `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` and
 * `CLOUDFLARE_API_TOKEN` in the Vercel project for that path to activate.
 *
 * `getCloudflareContext()` is only available while a request is being handled,
 * so the instance is built lazily (see the `db` proxy below).
 */
export type Db = DrizzleD1Database<typeof schema>;

let _db: Db | undefined;

/** Resolve the D1 binding from the current Cloudflare context. */
function binding(): D1Database | undefined {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as { DB?: D1Database }).DB;
  } catch {
    // No Cloudflare context — we are not on Workers (e.g. Vercel).
    return undefined;
  }
}

/**
 * D1 over the HTTP query API, for runtimes without the Worker binding.
 *
 * D1 speaks SQLite, so the SQL drizzle generates here is identical to the SQL
 * it generates for the binding; only the transport differs. That is what lets
 * one `schema.ts` serve both deployments.
 */
function httpBinding(options: {
  accountId: string;
  databaseId: string;
  token: string;
}): Db {
  const url = `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/d1/database/${options.databaseId}/query`;

  return drizzleRemote(
    async (sql, params, method) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql, params }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`D1 HTTP ${response.status}: ${await response.text()}`);
      }

      const payload = (await response.json()) as {
        success: boolean;
        errors?: unknown;
        result?: Array<{ results?: Record<string, unknown>[] }>;
      };

      if (!payload.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(payload.errors)}`);
      }

      const rows = payload.result?.[0]?.results ?? [];

      // `sqlite-proxy` expects positional rows. D1 returns objects, and
      // JavaScript preserves string-key insertion order, so the values line up
      // with the selected columns.
      if (method === "get") {
        const first = rows[0];
        return { rows: first ? Object.values(first) : [] };
      }
      return { rows: rows.map((row) => Object.values(row)) };
    },
    { schema },
  ) as unknown as Db;
}

/**
 * Public identifiers of the D1 database. Neither is a secret — the account id
 * appears in every Cloudflare dashboard URL and the database id in every
 * `wrangler d1` command — so they are baked in as defaults and only the API
 * token has to be supplied as an environment variable on Vercel.
 */
const DEFAULT_ACCOUNT_ID = "1558b11cf56bf7597de219af04f1834b";
const DEFAULT_DATABASE_ID = "0fa6ed59-fc86-43e5-a28c-ea3fef1837f8";

/**
 * `next build` evaluates every page once to pre-render it. Those evaluations
 * must not touch a database: on Vercel a `fetch` to the D1 HTTP API is a
 * `no-store` request, Next.js then decides the route "couldn't be rendered
 * statically", aborts the build, and Vercel's post-build step trips over the
 * half-written `.next` with `ENOENT: lstat '.next/lock'`.
 *
 * The Cloudflare build never had the problem because its binding is simply
 * absent at build time. Reporting "no database" here reproduces that: every
 * caller already falls back to the build-time snapshot in `src/data/`, and the
 * real query happens on the first request instead.
 */
function isBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

export function getDb(): Db {
  if (!_db) {
    const bound = isBuildPhase() ? undefined : binding();
    if (bound) {
      _db = drizzle(bound, { schema });
    } else {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
      const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID || DEFAULT_DATABASE_ID;
      const token = isBuildPhase() ? undefined : process.env.CLOUDFLARE_API_TOKEN;
      if (!token) {
        throw new Error(
          isBuildPhase()
            ? "No database during the build phase — using the build-time snapshot."
            : "No database available: the D1 binding `DB` is missing and " +
              "CLOUDFLARE_API_TOKEN is not set, so the HTTP query API cannot be reached.",
        );
      }
      _db = httpBinding({ accountId, databaseId, token });
    }
  }
  return _db;
}

/** Drop the cached instance (used by scripts that swap bindings). */
export function resetDb(): void {
  _db = undefined;
}

export const db = new Proxy({} as Db, {
  get: (_t, p) => Reflect.get(getDb() as object, p),
});

export { schema };
