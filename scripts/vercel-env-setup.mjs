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

// Pretty-print a non-OK response so failures are diagnosable.
async function logStatus(label, res, bodyObj) {
  let detail = '';
  if (!res.ok) {
    try { detail = JSON.stringify(await res.json()); } catch { detail = await res.text(); }
  }
  console.log(`${label} -> ${res.status}${detail ? ' ' + detail : ''}`);
  return res.ok;
}

async function main() {
  // Resolve team + project by searching every accessible scope (personal + each team)
  // until the boppfilmsales project is found — avoids relying on a hardcoded slug.
  const matches = (p) => /boppfilmsales/.test(p.name) || /boppfilmsales/.test(p.slug);
  let teamId;
  let project;
  {
    const projs = await (await fetch(`${API}/v9/projects`, { headers })).json();
    project = (projs.projects || []).find(matches);
    teamId = undefined;
  }
  if (!project) {
    const teams = await (await fetch(`${API}/v2/teams`, { headers })).json();
    for (const t of teams.teams || []) {
      const projs = await (
        await fetch(`${API}/v9/projects?teamId=${t.id}`, { headers })
      ).json();
      project = (projs.projects || []).find(matches);
      if (project) { teamId = t.id; break; }
    }
  }
  if (!project) {
    console.error('Project not found — check token scope / team membership.');
    process.exit(1);
  }
  const tq = teamId ? `?teamId=${teamId}` : '';
  console.log('Team:', teamId || 'personal', '| Project:', project.name, project.id);

  // Existing env vars
  const existing = await (
    await fetch(`${API}/v10/projects/${project.id}/env${tq}`, { headers })
  ).json();
  const envList = existing.envs || [];

  // Upsert each env var. The PATCH body MUST include `key`.
  for (const [key, value] of Object.entries(ENVS)) {
    const found = envList.find((e) => e.key === key);
    const body = JSON.stringify({ key, value, target: TARGET, type: 'encrypted' });
    const hdr = { ...headers, 'Content-Type': 'application/json' };
    let res;
    if (found) {
      res = await fetch(`${API}/v10/projects/${project.id}/env/${found.id}${tq}`, {
        method: 'PATCH', headers: hdr, body,
      });
      await logStatus(`PATCH  ${key}`, res);
    } else {
      res = await fetch(`${API}/v10/projects/${project.id}/env${tq}`, {
        method: 'POST', headers: hdr, body,
      });
      await logStatus(`POST  ${key}`, res);
    }
  }

  // Trigger a production redeploy from the github main branch.
  // NOTE: the deployments endpoint routes by `name` — do NOT pass `projectId` in the body.
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
