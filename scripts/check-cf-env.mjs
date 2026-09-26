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
import { spawnSync } from "node:child_process";
import https from "node:https";

/** Strip `//` comments and trailing commas so the file can be parsed as JSON. */
function readWranglerJsonc(path = "wrangler.jsonc") {
  const src = readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(src);
}

function die(message) {
  console.error(`\n[cf-env] ${message}\n`);
  process.exit(1);
}

/**
 * Call the Cloudflare REST API.
 *
 * Deliberately uses `node:https` rather than `fetch`: on Windows, aborting a
 * fetch (and especially `AbortSignal.timeout()`) can trip a libuv assertion
 * that kills the entire deploy process with
 *   Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), src\win\async.c
 *   exit code 3221226505 (0xC0000409)
 */
function cf(path, token, { method = "GET", body } = {}) {
  return new Promise((resolve) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request(
      {
        host: "api.cloudflare.com",
        path: `/client/v4${path}`,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status >= 200 && status < 300) {
            try {
              resolve({ ok: true, status, json: JSON.parse(body) });
            } catch {
              resolve({ ok: false, status, body });
            }
          } else {
            resolve({ ok: false, status, body });
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error("request timed out after 15s")));
    req.on("error", (error) => resolve({ ok: false, status: 0, body: `request failed: ${error.message}` }));
    if (payload) req.write(payload);
    req.end();
  });
}

/** Best-effort extraction of Cloudflare's own error text. */
function cfError(res) {
  const raw = (res.body ?? "").trim();
  try {
    const parsed = JSON.parse(raw);
    const messages = (parsed.errors ?? []).map((e) => `${e.code ?? ""} ${e.message ?? ""}`.trim());
    if (messages.length) return messages.join("; ");
  } catch {
    /* not JSON */
  }
  return raw.slice(0, 300) || "(empty response)";
}

const cfg = readWranglerJsonc();
const account = process.env.CLOUDFLARE_ACCOUNT_ID || cfg.account_id;
let token = process.env.CLOUDFLARE_API_TOKEN;
const bucket = cfg.r2_buckets?.[0]?.bucket_name;
const databaseId = cfg.d1_databases?.[0]?.database_id;
const workerName = cfg.name;

if (!token) {
  // `.cf-token` is gitignored; scripts/deploy.mjs also reads it, so a plain
  // `npm run deploy` needs no shell setup.
  try {
    token = readFileSync(".cf-token", "utf8").trim();
  } catch {
    /* no .cf-token */
  }
}

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

// The token is nearly always copied together with the surrounding line
// ("API 令牌: cfat_…", or a whole block of credentials). Rather than failing on
// the extra text, pull the token out of it.
const trimmed = token.trim();
const extracted = trimmed.match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
if (extracted && extracted !== trimmed) {
  console.log(
    `[cf-env] extracted the token from the surrounding text you pasted ` +
      `(${trimmed.length} chars -> ${extracted.length} chars)`,
  );
}
token = extracted ?? trimmed;

// A real Cloudflare API token is ~40 ASCII chars. Anything shorter, containing
// `...`, or containing non-ASCII text is the placeholder from a copy-pasted
// instruction — Cloudflare answers those with
// `HTTP 400 / 6003 Invalid request headers` instead of a clean 401.
/**
 * On Windows, peek at the clipboard: if it already holds something shaped like
 * a Cloudflare token, tell the user the one command that will use it. Read-only
 * and advisory — the token is never used unless they put it in the env var.
 */
function clipboardHint() {
  if (process.platform !== "win32") return "";
  try {
    const res = spawnSync("powershell.exe", ["-NoProfile", "-Command", "Get-Clipboard"], {
      encoding: "utf8",
      timeout: 5000,
    });
    const value = (res.stdout ?? "").trim();
    const found = value.match(/cfat_[A-Za-z0-9_-]{20,}/)?.[0];
    if (found) {
      return (
        `\nGood news: the clipboard already holds a token (${found.slice(0, 8)}…, ${found.length} chars).\n` +
        "Just run (this keeps only the token, even if the clipboard holds a whole line):\n" +
        "  $env:CLOUDFLARE_API_TOKEN = [regex]::Match((Get-Clipboard), 'cfat_[A-Za-z0-9_-]+').Value\n" +
        "  npm run deploy\n"
      );
    }
  } catch {
    /* clipboard unavailable */
  }
  return "";
}

const badChar = token.match(/[^\x21-\x7E]/)?.[0];
if (token.length < 30 || token.includes("...") || badChar) {
  const why = badChar
    ? `it contains the character "${badChar}" — you pasted the placeholder text itself`
    : `it is only ${token.length} characters`;
  die(
    `CLOUDFLARE_API_TOKEN is not a real token: ${why}.\n\n` +
      "Do not type it by hand. Copy the token (or the whole credentials block)\n" +
      "from https://dash.cloudflare.com/profile/api-tokens, then run:\n\n" +
      "  $env:CLOUDFLARE_API_TOKEN = [regex]::Match((Get-Clipboard), 'cfat_[A-Za-z0-9_-]+').Value\n" +
      "  npm run deploy\n" +
      clipboardHint() +
      "\nNo token handy? Authenticate in the browser instead:\n" +
      "  npx wrangler login\n" +
      "  npm run deploy",
  );
}

if (!account) {
  die("No account id found. Set CLOUDFLARE_ACCOUNT_ID or add `account_id` to wrangler.jsonc.");
}

console.log(`[cf-env] worker   : ${workerName}`);
console.log(`[cf-env] account  : ${account}${process.env.CLOUDFLARE_ACCOUNT_ID ? " (env)" : " (wrangler.jsonc)"}`);
console.log(`[cf-env] token    : ${token.slice(0, 12)}… (${token.length} chars)`);

// 1. Confirm the token can actually see this account.
const accounts = await cf(`/accounts?per_page=50`, token);
if (!accounts.ok) {
  die(
    `Cloudflare rejected the token (HTTP ${accounts.status}).\n` +
      `  ${cfError(accounts)}\n\n` +
      "Check that CLOUDFLARE_API_TOKEN is the full token copied from the Cloudflare\n" +
      "dashboard (it starts with `cfat_`), not a truncated or placeholder value.\n" +
      "Verify it independently with:  npx wrangler whoami",
  );
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
  if (!r2.ok || !names.includes(bucket)) {
    die(
      (r2.ok
        ? `R2 bucket "${bucket}" does not exist in account ${account}.\n` +
          `Buckets present: ${names.join(", ") || "(none)"}\n`
        : `Could not list R2 buckets (HTTP ${r2.status}): ${cfError(r2)}\n`) +
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
        `  ${cfError(d1)}\n\n` +
        "Create one with `npx wrangler d1 create boppfilmsales-db`, put the new id in\n" +
        "wrangler.jsonc, then seed it: node .zh-work/seed-d1.mjs <new-id>",
    );
  }
  console.log(`[cf-env] d1       : ${d1.json?.result?.name ?? databaseId} OK`);
}

// 4. Deploying needs WRITE access to Workers. A token that can only read
//    (it lists scripts fine) dies at the very end of the deploy with
//    "No access to the specified resource" on `assets-upload-session`, after
//    ~90 s of building. Probe that same endpoint up front: 404 means the
//    permission is there and the script simply does not exist yet.
const probe = await cf(`/accounts/${account}/workers/scripts/${workerName}/assets-upload-session`, token, {
  method: "POST",
  body: {},
});
if (probe.status === 403 || /no access|not authorized|insufficient/i.test(probe.body ?? "")) {
  die(
    `This token cannot deploy Workers to account ${account} — it can read them,\n` +
      `but the assets-upload-session call is refused (HTTP ${probe.status}):\n` +
      `  ${cfError(probe)}\n\n` +
      "It is missing the `Account → Workers Scripts → Edit` permission.\n" +
      "Easiest fix — skip API tokens entirely and log in with the browser:\n" +
      "  Remove-Item .cf-token\n" +
      "  npx wrangler login\n" +
      "  npm run deploy\n\n" +
      "Or create a new token at https://dash.cloudflare.com/profile/api-tokens with\n" +
      "  Account | Workers Scripts | Edit   (Account Resources: include this account)\n" +
      "and paste it into the .cf-token file (notepad .cf-token).",
  );
}

console.log("[cf-env] preflight passed, deploying…\n");
