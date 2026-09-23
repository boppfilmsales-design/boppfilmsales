// Sets Vercel env vars for the boppfilmsales project and triggers a production redeploy.
// Reads values from .env.local (gitignored) so no secrets are hardcoded in this file.
//
// Usage (run on your own machine, where network to api.vercel.com works):
//   node scripts/vercel-env-setup.mjs <VERCEL_TOKEN>
//
// The token can also be passed via env: VERCEL_TOKEN=... node scripts/vercel-env-setup.mjs
import { readFileSync } from 'node:fs';

const TOKEN = process.argv[2] || process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error('Usage: node scripts/vercel-env-setup.mjs <VERCEL_TOKEN>');
  process.exit(1);
}

// --- Parse .env.local (project root) ---
const env = {};
try {
  const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m) env[m[1]] = m[2];
  }
} catch (e) {
  console.error('Could not read .env.local:', e.message);
  process.exit(1);
}

const KEYS = ['DATABASE_URL', 'DIRECT_URL', 'SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const ENVS = {};
for (const k of KEYS) {
  if (!env[k]) { console.error(`Missing ${k} in .env.local`); process.exit(1); }
  ENVS[k] = env[k];
}

const API = 'https://api.vercel.com';
const headers = { Authorization: `Bearer ${TOKEN}` };
const TARGET = ['production', 'preview', 'development'];

// Known-good IDs captured from a prior successful API run (so discovery is never a hard blocker).
const FALLBACK = {
  teamId: 'team_cwpfjDlChfm4oxRROP6n8HSf',
  projectId: 'prj_RNvhyYkwx9tRga8YEY2SGoXuVpIA',
  projectName: 'boppfilmsales',
};

const matches = (p) => /boppfilmsales/.test(p.name || '') || /boppfilmsales/.test(p.slug || '');

async function getJSON(url) {
  const r = await fetch(url, { headers });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

async function resolveProject() {
  // 1) personal scope
  let res = await getJSON(`${API}/v9/projects`);
  let project = (res.body.projects || []).find(matches);
  if (project) return { project, teamId: undefined };

  // 2) each team scope
  const teamsRes = await getJSON(`${API}/v2/teams`);
  for (const t of teamsRes.body.teams || []) {
    res = await getJSON(`${API}/v9/projects?teamId=${t.id}`);
    project = (res.body.projects || []).find(matches);
    if (project) return { project, teamId: t.id };
  }

  // 3) fallback to the known IDs from the earlier successful run
  res = await getJSON(
    `${API}/v9/projects/${FALLBACK.projectId}${FALLBACK.teamId ? `?teamId=${FALLBACK.teamId}` : ''}`
  );
  if (res.ok && res.body && res.body.id) {
    console.log('(used fallback team/project IDs)');
    return { project: res.body, teamId: FALLBACK.teamId };
  }
  throw new Error(
    `Could not resolve boppfilmsales project. teams=${JSON.stringify(teamsRes.body).slice(0, 300)}`
  );
}

async function logStatus(label, res, bodyObj) {
  let detail = '';
  if (!res.ok) {
    try { detail = JSON.stringify(bodyObj); } catch { detail = ''; }
  }
  console.log(`${label} -> ${res.status}${detail ? ' ' + detail : ''}`);
  return res.ok;
}

async function main() {
  const { project, teamId } = await resolveProject();
  const tq = teamId ? `?teamId=${teamId}` : '';
  console.log('Team:', teamId || 'personal', '| Project:', project.name, project.id);

  // Existing env vars
  const existing = await (
    await fetch(`${API}/v10/projects/${project.id}/env${tq}`, { headers })
  ).json();
  const envList = existing.envs || [];

  // Upsert each env var. PATCH body MUST include `key`.
  for (const [key, value] of Object.entries(ENVS)) {
    const found = envList.find((e) => e.key === key);
    const body = JSON.stringify({ key, value, target: TARGET, type: 'encrypted' });
    const hdr = { ...headers, 'Content-Type': 'application/json' };
    let res;
    if (found) {
      res = await fetch(`${API}/v10/projects/${project.id}/env/${found.id}${tq}`, {
        method: 'PATCH', headers: hdr, body,
      });
      await logStatus(`PATCH  ${key}`, res, await res.json().catch(() => ({})));
    } else {
      res = await fetch(`${API}/v10/projects/${project.id}/env${tq}`, {
        method: 'POST', headers: hdr, body,
      });
      await logStatus(`POST  ${key}`, res, await res.json().catch(() => ({})));
    }
  }

  // Trigger a production redeploy from the github main branch.
  // The deployments endpoint routes by `name` — do NOT pass `projectId` in the body.
  console.log('Triggering production redeploy from github main...');
  const dep = await fetch(`${API}/v13/deployments${tq}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: project.name,
      target: 'production',
      gitSource: {
        type: 'github',
        org: 'boppfilmsales-design',
        repo: 'boppfilmsales',
        ref: 'main',
      },
    }),
  });
  const d = await dep.json().catch(() => ({}));
  console.log('Deploy ->', dep.status, d.url || d.id || JSON.stringify(d).slice(0, 240));
  if (dep.ok && d.url) {
    console.log(`\nOpen: https://${d.url}  (or https://${project.name}.vercel.app once ready)`);
  }
  // Avoid a hard process.exit (which can trip a Node UV_HANDLE_CLOSING assert on Windows).
  if (!dep.ok) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exitCode = 1;
});
