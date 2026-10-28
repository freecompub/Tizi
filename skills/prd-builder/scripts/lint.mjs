#!/usr/bin/env node
// Vérification légère de la phase de construction (BRD ou PRD, selon le champ `document` de l'état).
// Exécute le catalogue de lib/rules.mjs en mode AVERTISSEMENT : le script ne bloque jamais (code de sortie 0).
// Le contrôle formel bloquant relève d'une phase ultérieure et réutilisera le même catalogue.
// Usage : node lint.mjs <state.yaml> [--id ID[,ID…]] [--json]
//   --id   : ne vérifie que ces éléments (à utiliser avant de présenter un lot à l'utilisateur)
//   --json : sortie machine
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadState, fail, verifyHandoff } from './lib/common.mjs';
import { checkState } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && !/^[A-Z]+-/.test(a));
if (!statePath) fail('Usage : node lint.mjs <state.yaml> [--id ID[,ID…]] [--json]', 2);
const idArg = args.includes('--id') ? args[args.indexOf('--id') + 1] : '';
const only = new Set(idArg.split(',').filter(Boolean));

const state = loadState(statePath);
// Les handoffs amont copiés par ingest-handoffs.mjs (planification) servent de contexte à la vérification.
const refsPath = join(dirname(statePath), 'refs.yaml');
const refs = existsSync(refsPath) ? loadState(refsPath) : {};
// Constitution du produit et listes de contrôle de relecture, si elles existent : la vérification les prend en compte.
const constitution = (() => { for (const r of ['.', dirname(dirname(dirname(statePath)))]) if (existsSync(join(r, '.tizi', 'constitution.yaml'))) return loadState(join(r, '.tizi', 'constitution.yaml')); return null; })();
const checklists = (() => { const d = join(dirname(statePath), 'checklists'); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.md')).map(f => ({ file: f, text: readFileSync(join(d, f), 'utf8') })) : []; })();
// Guides d'entretien présents sur le disque : un guide ne se périme pas tout seul quand son absent arrive.
const interviews = (() => { const d = join(dirname(statePath), 'interviews'); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.md')) : []; })();
let findings = checkState(state, { refs, constitution, checklists, interviews });

// S53 : le handoff ingéré doit toujours exister avec l'empreinte relevée à l'ingestion.
const ingested = [];
if (state.document === 'prd' && state.source_brd?.path) ingested.push([state.source_brd.path, state.source_brd.sha256]);
if (state.document === 'sad' && state.source_prd?.path) ingested.push([state.source_prd.path, state.source_prd.sha256]);
if (state.document === 'plan') for (const k of ['prd', 'sad']) if (refs.paths?.[k]) ingested.push([join(dirname(statePath), refs.paths[k]), refs.sha256?.[k]]);
for (const [p, recorded] of ingested) {
  const r = verifyHandoff(p);
  if (!recorded) findings.push({ rule: 'S53', id: p, message: 'empreinte du handoff non relevée à l\'ingestion (lancer verify-handoff.mjs et reporter sha256 dans l\'état)' });
  else if (!existsSync(p)) findings.push({ rule: 'S53', id: p, message: 'handoff ingéré introuvable' });
  else if (r.sha256 !== recorded) findings.push({ rule: 'S53', id: p, message: 'le handoff a changé depuis l\'ingestion : relancer l\'ingestion et faire le point sur les écarts' });
  else if (!r.ok) findings.push({ rule: 'S53', id: p, message: r.problems.join(' ; ') });
}
if (only.size) findings = findings.filter(f => only.has(f.id));
// Un avertissement dérogé ne disparaît pas : il change de liste. Un trou nommé se répare, un trou
// silencieux se propage — et une dérogation invisible est un contrôle désarmé sans trace.
const derogees = findings.filter(f => f.waived);
findings = findings.filter(f => !f.waived);

if (args.includes('--json')) {
  console.log(JSON.stringify(findings, null, 2));
} else if (!findings.length) {
  console.log(`Vérification : aucun avertissement${only.size ? ` sur ${[...only].join(', ')}` : ''}.`);
} else {
  const byId = new Map();
  for (const f of findings) byId.set(f.id, [...(byId.get(f.id) ?? []), f]);
  console.log(`Vérification : ${findings.length} avertissement(s) sur ${byId.size} élément(s).\n`);
  for (const [id, fs] of byId) {
    console.log(id);
    for (const f of fs) console.log(`  ⚠ [${f.rule}] ${f.message}`);
  }
  console.log('\nCes avertissements ne bloquent pas. Pour en accepter un en connaissance de cause, nomme la dérogation sur l\'élément :');
  console.log(`  lint_waivers: [{ rule: ${findings[0].rule}, reason: "…" }]`);
  console.log('  Sans raison écrite, elle ne compte pas. Et sur un constat qui ne porte pas sur un élément — une');
  console.log('  collection, un fichier —, la dérogation va à la racine de l\'état, avec son `id`.');
}
if (!args.includes('--json') && derogees.length) {
  console.log(`\n${derogees.length} avertissement(s) couvert(s) par une dérogation nommée :`);
  for (const f of derogees) console.log(`  · [${f.rule}] ${f.id} — ${f.waived}`);
}
