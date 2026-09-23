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

async function main() {
  // Resolve team (project lives under team slug "2646s-projects")
  const teams = await (await fetch(`${API}/v2/teams`, { headers })).json();
  const team =
    (teams.teams || []).find((t) => t.slug === '2646s-projects') ||
    (teams.teams || [])[0];
  const teamId = team ? team.id : undefined;
  const tq = teamId ? `?teamId=${teamId}` : '';

  // Resolve project
  const projs = await (await fetch(`${API}/v9/projects${tq}`, { headers })).json();
  const project = (projs.projects || []).find(
    (p) => /boppfilmsales/.test(p.name) || /boppfilmsales/.test(p.slug)
  );
  if (!project) {
    console.error('Project not found — check token scope / team membership.');
    process.exit(1);
  }
  console.log('Project:', project.name, project.id, '| team:', teamId || 'personal');

  // Existing env vars
  const existing = await (
    await fetch(`${API}/v10/projects/${project.id}/env${tq}`, { headers })
  ).json();
  const envList = existing.envs || [];

  // Upsert each env var
  for (const [key, value] of Object.entries(ENVS)) {
    const found = envList.find((e) => e.key === key);
    const body = JSON.stringify({ value, target: TARGET, type: 'encrypted' });
    let r;
    if (found) {
      r = await fetch(`${API}/v10/projects/${project.id}/env/${found.id}${tq}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body,
      });
    } else {
      r = await fetch(`${API}/v10/projects/${project.id}/env${tq}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...JSON.parse(body) }),
      });
    }
    console.log((found ? 'PATCH ' : 'POST '), key, '->', r.status);
  }

  // Trigger a production redeploy from the github main branch
  console.log('Triggering production redeploy from github main...');
  const dep = await fetch(`${API}/v13/deployments${tq}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: project.name,
      projectId: project.id,
      target: 'production',
      gitSource: {
        type: 'github',
        org: 'boppfilmsales-design',
        repo: 'boppfilmsales',
        ref: 'main',
      },
    }),
  });
  const d = await dep.json();
  console.log('Deploy ->', dep.status, d.url || d.id || JSON.stringify(d).slice(0, 200));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
