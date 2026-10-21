#!/usr/bin/env node
// Mesure du déclenchement des skills : pour chaque requête de evals/triggers.yaml, quel skill l'agent active-t-il ?
// Méthode reprise de bmad-eval (BMAD-METHOD) : chaque skill installé reçoit un marqueur qu'il recopie quand il s'active ;
// chaque requête est jouée plusieurs fois (le déclenchement est probabiliste) ; une séparation entraînement/test,
// stratifiée et FIXE, permet d'améliorer les descriptions sur l'entraînement et de juger sur le test seulement.
//
// Usage : node evals/run-triggers.mjs --agent claude|copilot [--runs 3] [--seuil 0.5] [--agent-cmd "<commande>"] [--dry-run]
// Une passe où l'agent n'a pas tourné est une erreur d'intégrité : elle ne compte ni pour ni contre une requête.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const args = process.argv.slice(2);
const opt = (k, d = '') => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const agent = opt('--agent'), runs = Number(opt('--runs', '3')), threshold = Number(opt('--seuil', '0.5'));
const agents = yaml.load(readFileSync(join(HERE, 'agents.yaml'), 'utf8'));
if (!agents[agent]) { console.error('Usage : node evals/run-triggers.mjs --agent claude|copilot [--runs 3] [--seuil 0.5] [--dry-run]'); process.exit(2); }
const queries = yaml.load(readFileSync(join(HERE, 'triggers.yaml'), 'utf8')).queries;
const sh = s => `'${String(s).replace(/'/g, `'\\''`)}'`;
const MARK = 'TIZI-SKILL-ACTIF';

// Séparation stratifiée 60/40, déterministe : la même requête tombe toujours du même côté.
const bucket = q => parseInt(createHash('sha256').update(q.query).digest('hex').slice(0, 8), 16) / 0xffffffff;
const groups = new Map();
for (const q of queries) groups.set(q.expected, [...(groups.get(q.expected) ?? []), q]);
for (const g of groups.values()) g.sort((a, b) => bucket(a) - bucket(b)).forEach((q, i) => { q.split = i < Math.ceil(g.length * 0.6) ? 'entraînement' : 'test'; });

// Dépôt de travail : tous les skills installés, chacun avec son marqueur en tête de corps.
const ws = mkdtempSync(join(tmpdir(), 'tizi-triggers-'));
spawnSync('git init -q', { cwd: ws, shell: true });
spawnSync(`node ${sh(join(ROOT, 'install.mjs'))} --project . --target ${agents[agent].install_target}`, { cwd: ws, shell: true });
const skillsDir = join(ws, agents[agent].install_target === 'copilot' ? '.github/skills' : '.claude/skills');
for (const s of readdirSync(skillsDir)) {
  const p = join(skillsDir, s, 'SKILL.md');
  const text = readFileSync(p, 'utf8');
  const end = text.indexOf('\n---', 4) + 4;
  writeFileSync(p, `${text.slice(0, end)}\n\n> Mesure de déclenchement : ta toute première ligne de réponse doit être exactement \`${MARK} ${s}\`.\n${text.slice(end)}`);
}
if (args.includes('--dry-run')) { console.log(`(simulation) dépôt prêt : ${ws} — ${queries.length} requêtes, ${queries.filter(q => q.split === 'test').length} en test.`); process.exit(0); }

const results = [];
for (const q of queries) {
  const fired = new Map(); let ok = 0, integrity = 0;
  for (let k = 0; k < runs; k++) {
    const tpl = opt('--agent-cmd') || agents[agent].first;
    const r = spawnSync(tpl.replace('{prompt}', sh(q.query)).replace('{turn}', '0'), { cwd: ws, shell: true, encoding: 'utf8', timeout: 300000 });
    if (r.error || r.status === 127 || r.signal) { integrity++; continue; }
    ok++;
    for (const m of (r.stdout ?? '').matchAll(new RegExp(`${MARK} ([a-z0-9-]+)`, 'g'))) fired.set(m[1], (fired.get(m[1]) ?? 0) + 1);
  }
  const rates = Object.fromEntries([...fired].map(([s, n]) => [s, n / Math.max(ok, 1)]));
  const top = Object.entries(rates).filter(([, r]) => r >= threshold).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const got = top[0] ?? 'aucun';
  results.push({ ...q, runs: ok, integrity, rates, got, correct: ok > 0 ? got === q.expected : null });
  console.log(`${ok ? (got === q.expected ? '✓' : '✗') : '!'} [${q.split}] attendu ${q.expected}, obtenu ${got}${ok ? '' : ' — INTÉGRITÉ'} · ${q.query.slice(0, 70)}`);
}

// Rapport : précision et rappel par skill, sur l'entraînement et sur le test séparément.
const skills = [...new Set(queries.map(q => q.expected).filter(e => e !== 'aucun'))].sort();
const stat = (rows, s) => {
  const v = rows.filter(r => r.correct !== null);
  const tp = v.filter(r => r.expected === s && r.got === s).length, fn = v.filter(r => r.expected === s && r.got !== s).length, fp = v.filter(r => r.expected !== s && r.got === s).length;
  return { tp, fn, fp, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null };
};
const f = x => (x == null ? '—' : x.toFixed(2));
const lines = [`# Déclenchement des skills — ${agent} — ${new Date().toISOString().slice(0, 10)}`, '', `${runs} passe(s) par requête ; un skill est retenu s'il s'active dans au moins ${threshold * 100} % des passes. Améliorer les descriptions à partir des échecs de l'**entraînement** seulement ; juger sur le **test**.`, ''];
for (const split of ['entraînement', 'test']) {
  const rows = results.filter(r => r.split === split);
  lines.push(`## ${split[0].toUpperCase()}${split.slice(1)} (${rows.length} requêtes, ${rows.filter(r => r.correct).length} correctes)`, '', '| Skill | Précision | Rappel | Faux négatifs | Faux positifs |', '|---|---|---|---|---|');
  for (const s of skills) { const x = stat(rows, s); lines.push(`| ${s} | ${f(x.precision)} | ${f(x.recall)} | ${x.fn} | ${x.fp} |`); }
  const none = rows.filter(r => r.expected === 'aucun');
  lines.push('', `Requêtes qui ne devaient rien déclencher : ${none.filter(r => r.got === 'aucun').length}/${none.length} sont restées sans skill.`, '');
}
lines.push('## Échecs de l\'entraînement', '', ...results.filter(r => r.split === 'entraînement' && r.correct === false).map(r => `- attendu **${r.expected}**, obtenu **${r.got}** : « ${r.query} »`), '');
lines.push(`Erreurs d'intégrité : ${results.reduce((n, r) => n + r.integrity, 0)}. Les échecs du test ne sont volontairement pas détaillés : les lire pour corriger une description fausserait la mesure suivante.`);
const out = join(HERE, 'results', `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-declenchement-${agent}`);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'report.md'), `${lines.join('\n')}\n`);
writeFileSync(join(out, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(`\nRapport : ${join(out, 'report.md')}`);
