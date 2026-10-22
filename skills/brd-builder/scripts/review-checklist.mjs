#!/usr/bin/env node
// Listes de contrôle de relecture par domaine, pour un document (BRD, PRD, conception) : des « tests unitaires » de la
// qualité des exigences. Générées par l'agent, COCHÉES PAR UN RELECTEUR NOMMÉ, jamais par l'agent. Un point écarté
// porte le nom du relecteur et une raison. Les points non traités bloquent la gouvernance du document (S80).
// Idée reprise de la commande checklist de spec-kit.
// Usage : node review-checklist.mjs <état.yaml> --domaines securite,accessibilite,ergonomie,donnees-sante,performance
//         node review-checklist.mjs <état.yaml> --etat
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadState, writeOut, fail, table } from './lib/common.mjs';
import { DOMAINS } from './lib/checklists.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--domaines');
if (!statePath) fail('Usage : node review-checklist.mjs <état.yaml> --domaines a,b | --etat', 2);
const dir = join(dirname(statePath), 'checklists');
if (args.includes('--etat')) {
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md')) : [];
  if (!files.length) { console.log('Aucune liste de contrôle.'); process.exit(0); }
  const rows = files.map(f => { const t = readFileSync(join(dir, f), 'utf8'); const it = [...t.matchAll(/^- \[( |x|X|~)\] CL-/gm)].map(m => m[1]); return [f, it.length, it.filter(m => /x/i.test(m)).length, it.filter(m => m === '~').length, it.filter(m => m === ' ').length]; });
  console.log(table(['Liste', 'Points', 'Cochés', 'Écartés', 'À traiter'], rows));
  process.exitCode = rows.some(r => r[4]) ? 1 : 0;
  process.exit();
}
const wanted = (args.includes('--domaines') ? args[args.indexOf('--domaines') + 1] : '').split(',').filter(Boolean);
const unknown = wanted.filter(d => !DOMAINS[d]);
if (!wanted.length || unknown.length) fail(`Domaines disponibles : ${Object.keys(DOMAINS).join(', ')}${unknown.length ? ` (inconnu : ${unknown.join(', ')})` : ''}.`, 2);
const s = loadState(statePath);
for (const d of wanted) {
  const p = join(dir, `${d}.md`);
  if (existsSync(p)) { console.log(`${p} existe déjà : non remplacé (les coches du relecteur y sont).`); continue; }
  const D = DOMAINS[d];
  writeOut(p, [`# Relecture — ${D.title} — ${s.initiative?.name ?? s.document}`, '',
    'Ces points testent la **qualité des exigences**, pas le code. Ils se cochent par un **relecteur nommé**, jamais par l\'agent :', '',
    '- `- [x] CL-… — Prénom Nom` : le point est satisfait ;', '- `- [~] CL-… — Prénom Nom : raison` : le point ne s\'applique pas, avec sa raison ;', '- un point non satisfait reste vide, et devient une zone d\'ombre ou une correction du document.', '',
    'Les points non traités bloquent la gouvernance du document.', '',
    ...D.items.map((q, i) => `- [ ] CL-${D.code}-${String(i + 1).padStart(2, '0')} ${q}`), ''].join('\n'));
  console.log(`Liste générée : ${p} (${D.items.length} points).`);
}
