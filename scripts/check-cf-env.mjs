/**
 * Preflight check before `opennextjs-cloudflare deploy`.
 *
 * Why this exists: `set CLOUDFLARE_API_TOKEN=...` in PowerShell does NOT set an
 * environment variable (`set` is an alias for `Set-Variable`), so wrangler
 * silently falls back to the OAuth login saved by `wrangler login` — usually a
 * different Cloudflare account, where the D1 database and R2 bucket do not
 * exist. The deploy then dies with
 *   "R2 bucket '<name>' not found ... [code: 10085]"
 * after several minutes of building and uploading assets.
 *
 * This script fails in ~1 second instead, and says exactly what is wrong.
 *
 * Usage (PowerShell):
 *   $env:CLOUDFLARE_API_TOKEN = "cfat_..."
 *   $env:CLOUDFLARE_ACCOUNT_ID = "1558b11cf56bf7597de219af04f1834b"
 *   npm run deploy
 */
import { readFileSync } from "node:fs";

const API = "https://api.cloudflare.com/client/v4";

/** Strip `//` comments so the file can be parsed as plain JSON. */
function readWranglerJsonc(path = "wrangler.jsonc") {
  const src = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
  return JSON.parse(src);
}

function die(message) {
  console.error(`\n[cf-env] ${message}\n`);
  process.exit(1);
}

async function cf(path, token, { method = "GET" } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text().catch(() => "") };
  }
  return { ok: true, status: res.status, json: await res.json() };
}

const cfg = readWranglerJsonc();
const account = process.env.CLOUDFLARE_ACCOUNT_ID || cfg.account_id;
const token = process.env.CLOUDFLARE_API_TOKEN;
const bucket = cfg.r2_buckets?.[0]?.bucket_name;
const databaseId = cfg.d1_databases?.[0]?.database_id;
const workerName = cfg.name;

if (!token) {
  die(
    "CLOUDFLARE_API_TOKEN is not set — the deploy would use the account saved by\n" +
      "`wrangler login`, which is usually the wrong one.\n\n" +
      "PowerShell (note: `set VAR=value` does NOT work, it is Set-Variable):\n" +
      '  $env:CLOUDFLARE_API_TOKEN = "cfat_..."\n' +
      `  $env:CLOUDFLARE_ACCOUNT_ID = "${account || "<account-id>"}"\n` +
      "  npm run deploy\n\n" +
      "Or authenticate interactively instead: npx wrangler login",
  );
}

if (!account) {
  die("No account id found. Set CLOUDFLARE_ACCOUNT_ID or add `account_id` to wrangler.jsonc.");
}

console.log(`[cf-env] worker   : ${workerName}`);
console.log(`[cf-env] account  : ${account}${process.env.CLOUDFLARE_ACCOUNT_ID ? " (env)" : " (wrangler.jsonc)"}`);

// 1. Confirm the token can actually see this account.
const accounts = await cf(`/accounts?per_page=50`, token);
if (!accounts.ok) {
  die(`Token rejected by Cloudflare API (HTTP ${accounts.status}). Is CLOUDFLARE_API_TOKEN correct/expired?`);
}
const visible = (accounts.json?.result ?? []).map((a) => a.id);
if (!visible.includes(account)) {
  die(
    `This API token cannot access account ${account}.\n` +
      `Accounts it can see: ${visible.join(", ") || "(none)"}\n` +
      "Either use a token created in that account, or deploy to one of the accounts above.",
  );
}

// 2. R2 bucket must exist in that account — this is what killed the last deploy.
if (bucket) {
  const r2 = await cf(`/accounts/${account}/r2/buckets`, token);
  const names = (r2.json?.result?.buckets ?? []).map((b) => b.name);
  if (!names.includes(bucket)) {
    die(
      `R2 bucket "${bucket}" does not exist in account ${account}.\n` +
        `Buckets present: ${names.join(", ") || "(none)"}\n\n` +
        `Create it with:  npx wrangler r2 bucket create ${bucket}\n` +
        "…but the ~434 MB media library lives in the other account, so prefer\n" +
        "deploying to the account that already holds the bucket.",
    );
  }
  console.log(`[cf-env] r2 bucket: ${bucket} OK`);
}

// 3. D1 database must exist too.
if (databaseId) {
  const d1 = await cf(`/accounts/${account}/d1/database/${databaseId}`, token);
  if (!d1.ok) {
    die(
      `D1 database ${databaseId} is not reachable in account ${account} (HTTP ${d1.status}).\n` +
        "Create one with `npx wrangler d1 create boppfilmsales-db`, put the new id in\n" +
        "wrangler.jsonc, then seed it: node .zh-work/seed-d1.mjs <new-id>",
    );
  }
  console.log(`[cf-env] d1       : ${d1.json?.result?.name ?? databaseId} OK`);
}

console.log("[cf-env] preflight passed, deploying…\n");
