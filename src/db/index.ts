import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

type Db = ReturnType<typeof drizzle>;

let _pool: Pool | undefined;
let _db: Db | undefined;

export function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required");
    _pool = new Pool({ connectionString: databaseUrl });
  }
  return _pool;
}

export function getDb(): Db {
  if (!_db) _db = drizzle(getPool());
  return _db;
}

export const db = new Proxy({} as Db, {
  get: (_t, p) => Reflect.get(getDb() as object, p),
});

export const pool = new Proxy({} as Pool, {
  get: (_t, p) => {
    const v = Reflect.get(getPool() as object, p);
    return typeof v === "function" ? v.bind(getPool()) : v;
  },
});