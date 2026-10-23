#!/usr/bin/env node
// Applique un plan d'opérations préparé par plan-builder, après trois verrous :
//   1. intégrité : operations.yaml correspond à son empreinte (operations.yaml.sha256) ;
//   2. approbation : cette empreinte figure dans governance.backlog_approvals de l'état du plan ;
//   3. fraîcheur : l'état du plan (hors approbations) et la table sync-map.yaml sont ceux du moment de la préparation.
// Seul ce script lit les jetons d'écriture. Il s'arrête à la première erreur et journalise tout.
// Usage : node apply-operations.mjs <plan/<slug>/exports/<cible>/operations.yaml> --state <plan/<slug>/state.yaml> [--dry-run]
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, fileSha256, verifyHandoff, planStateDigest } from './lib/common.mjs';

const args = process.argv.slice(2);
const opsPath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--state');
const statePath = args.includes('--state') ? args[args.indexOf('--state') + 1] : '';
const dryRun = args.includes('--dry-run');
if (!opsPath || !statePath) fail('Usage : node apply-operations.mjs <operations.yaml> --state <state.yaml> [--dry-run]', 2);

// ── Verrou 1 : intégrité ──
const integrity = verifyHandoff(opsPath);
if (!integrity.ok) fail(`Refus — plan d'opérations non intègre :\n${integrity.problems.map(p => `  - ${p}`).join('\n')}\nPrépare un nouveau plan avec plan-operations.mjs.`);
const plan = loadState(opsPath);
if (plan.kind !== 'backlog-operations') fail('Refus — ce fichier n\'est pas un plan d\'opérations.');
const opsSha = integrity.sha256;

// ── Verrou 2 : approbation ──
const s = loadState(statePath);
const approval = arr(s.governance?.backlog_approvals).find(a => a.target === plan.target && a.sha256 === opsSha);
if (!approval) fail(`Refus — aucune approbation pour l'empreinte ${opsSha} (${plan.target}). L'approbation se déclare à plan-builder, qui l'enregistre avec cette empreinte exacte.`);
if (!approval.declared_by) fail('Refus — l\'approbation n\'a pas de décideur déclaré.');
const autonomy = approval.autonomy ?? 'partiel';
if (!['complet', 'partiel', 'manuel'].includes(autonomy)) fail(`Refus — niveau d'autonomie inconnu : ${autonomy}.`);

// ── Verrou 3 : fraîcheur et destination ──
const root = dirname(statePath);
const syncPath = join(root, 'exports', 'sync-map.yaml');
const currentSync = existsSync(syncPath) ? fileSha256(syncPath) : '';
if (plan.plan?.state_sha256 !== planStateDigest(s)) {
  // Le refus est juste, mais il n'arrive pas là où la cause s'est produite : la cause la plus
  // fréquente est une sprint review, qui reporte les fusions dans le plan. Si une revue a été
  // enregistrée depuis la préparation, on la nomme plutôt que de laisser chercher.
  const depuis = arr(s.iterations)
    .map(i => ({ id: i.id, date: i.review?.team?.date ?? i.review?.date ?? '' }))
    .filter(r => r.date && String(r.date) >= String(plan.generated ?? ''))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const cause = depuis.length
    ? ` Une sprint review a été enregistrée depuis : ${depuis.map(r => `${r.id} le ${r.date}`).join(', ')} — elle reporte les fusions dans le plan, ce qui change son état.`
    : '';
  fail(`Refus — plan périmé : l'état du plan a changé depuis sa préparation du ${plan.generated ?? '—'} (autre chose qu'une approbation).${cause} Prépare un nouveau plan d'opérations (plan-operations.mjs --target ${plan.target}) et fais réapprouver la nouvelle empreinte : aucune approbation ne se reporte d'un plan à l'autre.`);
}
if ((plan.sync_map_sha256 ?? '') !== currentSync) fail('Refus — plan périmé : la table de correspondance a changé depuis la préparation (une autre exécution a eu lieu). Prépare un nouveau plan.');
const settings = s.settings ?? {};
const destination = plan.target === 'github' ? settings.github?.repo : settings.jira?.project_key;
if (!destination || destination !== plan.destination) fail(`Refus — destination incohérente : plan pour « ${plan.destination} », état configuré pour « ${destination ?? '—'} ».`);

// ── Sélection selon l'autonomie ──
const DESTRUCTIVE = ['close', 'transition', 'delete'];
const decide = op => {
  if (op.needs_review && !arr(approval.reviewed).includes(op.id)) return `à relire, non accepté dans l'approbation (${op.needs_review})`;
  if (autonomy === 'manuel' && !arr(approval.ops).includes(op.id)) return 'niveau manuel : opération non listée dans l\'approbation';
  if (autonomy === 'partiel' && DESTRUCTIVE.includes(op.action)) return 'niveau partiel : action destructive exclue';
  return '';
};

// ── Résolution des références symboliques ──
const sync = existsSync(syncPath) ? (yaml.load(readFileSync(syncPath, 'utf8')) ?? {}) : {};
sync[plan.target] ??= {};
const map = sync[plan.target];
const milestones = new Map();
function resolve(value) {
  if (typeof value === 'string') {
    const whole = value.match(/^\{\{(ref|milestone):([^}]+)\}\}$/);
    if (whole) {
      const v = whole[1] === 'ref' ? map[whole[2]] : milestones.get(whole[2]);
      return v === undefined ? value : v;
    }
    return value.replace(/\{\{ref:([^}]+)\}\}/g, (m, k) => (map[k] === undefined ? m : (plan.target === 'github' ? `#${map[k]}` : map[k])));
  }
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  return value;
}
const unresolved = v => /\{\{(ref|milestone):/.test(JSON.stringify(v));

// ── Clients ──
let call;
if (!dryRun) {
  if (plan.target === 'github') {
    const token = process.env.GITHUB_WRITE_TOKEN, api = process.env.GITHUB_API_URL ?? 'https://api.github.com';
    if (!token) fail('GITHUB_WRITE_TOKEN n\'est pas défini dans l\'environnement.');
    call = async (method, path, data) => {
      const res = await fetch(`${api}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'backlog-executor' }, body: data ? JSON.stringify(data) : undefined });
      if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${(await res.text()).slice(0, 300)}`);
      return res.status === 204 ? null : res.json();
    };
  } else {
    const base = (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, ''), email = process.env.JIRA_WRITE_EMAIL, token = process.env.JIRA_WRITE_TOKEN;
    if (!base || !email || !token) fail('JIRA_BASE_URL, JIRA_WRITE_EMAIL et JIRA_WRITE_TOKEN doivent être définis dans l\'environnement.');
    const auth = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
    call = async (method, path, data) => {
      const res = await fetch(`${base}${path}`, { method, headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined });
      if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${(await res.text()).slice(0, 300)}`);
      return res.status === 204 ? null : res.json();
    };
  }
}
const saveSync = () => writeOut(syncPath, `# Correspondance identifiants du plan ↔ outils de suivi — mise à jour par backlog-executor uniquement.\n${yaml.dump(sync)}`);

async function execute(op) {
  const fields = resolve(op.fields ?? {});
  const remote = resolve(op.remote);
  if (unresolved(fields) || unresolved(remote)) throw new Error('référence symbolique non résolue : rien n\'est envoyé');
  if (dryRun) {
    // Simulation : on suppose la création réussie pour résoudre les références suivantes ; rien n'est enregistré.
    if (op.action === 'create' || op.action === 'link') map[op.key] = op.action === 'link' ? remote : `nouveau:${op.key}`;
    if (op.action === 'create_milestone') milestones.set(fields.title, `nouveau:${fields.title}`);
    return { remote: remote ?? '(à créer)', sent: fields };
  }
  const repo = plan.destination;
  if (plan.target === 'github') {
    switch (op.action) {
      case 'create_label': await call('POST', `/repos/${repo}/labels`, { name: fields.name }); return {};
      case 'create_milestone': { const m = await call('POST', `/repos/${repo}/milestones`, { title: fields.title }); milestones.set(fields.title, m.number); return { remote: m.number }; }
      case 'create': { const r = await call('POST', `/repos/${repo}/issues`, fields); map[op.key] = r.number; saveSync(); return { remote: r.number }; }
      case 'update': await call('PATCH', `/repos/${repo}/issues/${remote}`, fields); return { remote };
      case 'link': map[op.key] = remote; saveSync(); return { remote };
      default: throw new Error(`action non prise en charge : ${op.action}`);
    }
  }
  switch (op.action) {
    case 'create': { const r = await call('POST', '/rest/api/3/issue', { fields }); map[op.key] = r.key; saveSync(); return { remote: r.key }; }
    case 'update': await call('PUT', `/rest/api/3/issue/${remote}`, { fields }); return { remote };
    case 'link': map[op.key] = remote; saveSync(); return { remote };
    default: throw new Error(`action non prise en charge : ${op.action}`);
  }
}

// ── Exécution ──
const results = [];
let failed = false;
const skippedKeys = new Map(); // élément non créé → opération ignorée qui l'aurait créé
const refsIn = op => [...JSON.stringify([op.fields ?? {}, op.remote ?? '']).matchAll(/\{\{ref:([^}]+)\}\}/g)].map(m => m[1]);
for (const op of arr(plan.operations)) {
  if (failed) { results.push({ id: op.id, action: op.action, key: op.key, status: 'non_exécuté' }); continue; }
  const blockedBy = refsIn(op).find(k => skippedKeys.has(k) && map[k] === undefined);
  const skip = blockedBy ? `dépend de ${blockedBy}, dont la création (${skippedKeys.get(blockedBy)}) est ignorée` : decide(op);
  if (skip && (op.action === 'create' || op.action === 'link')) skippedKeys.set(op.key, op.id);
  if (skip) { results.push({ id: op.id, action: op.action, key: op.key, status: 'ignoré', reason: skip }); continue; }
  try {
    const r = await execute(op);
    results.push({ id: op.id, action: op.action, key: op.key, status: dryRun ? 'simulé' : 'fait', remote: r.remote ?? '', ...(dryRun ? { sent: r.sent } : {}) });
  } catch (e) {
    failed = true;
    results.push({ id: op.id, action: op.action, key: op.key, status: 'échec', error: e.message });
  }
}

const count = st => results.filter(r => r.status === st).length;
if (dryRun) {
  for (const r of results) console.log(`${r.id} ${r.action} ${r.key} — ${r.status}${r.reason ? ` : ${r.reason}` : ''}${r.error ? ` : ${r.error}` : ''}`);
  console.log(`Simulation : ${count('simulé')} opération(s) seraient appliquées, ${count('ignoré')} ignorée(s). Verrous : intégrité, approbation (${approval.declared_by}, ${autonomy}) et fraîcheur vérifiés. Aucun appel réseau.`);
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { operations: opsPath, operations_sha256: opsSha, approval: { declared_by: approval.declared_by, date: approval.date ?? '', autonomy }, executed: new Date().toISOString(), results };
  writeOut(join(dirname(opsPath), `execution-${stamp}.yaml`), `# Journal d'exécution — backlog-executor.\n${yaml.dump(log, { lineWidth: 120 })}`);
  console.log(`Exécution ${plan.target} : ${count('fait')} faite(s), ${count('ignoré')} ignorée(s), ${count('échec')} en échec, ${count('non_exécuté')} non exécutée(s). Journal : execution-${stamp}.yaml`);
  if (failed) process.exit(1);
}
