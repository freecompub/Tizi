#!/usr/bin/env node
// Vérifie et fusionne les constats de l'analyse croisée (cross-analyzer) : chaque constat cite au moins deux énoncés
// existants (un seul pour un manque), sans score de confiance ; il devient une QUESTION pour l'humain — une zone
// d'ombre proposée —, jamais une correction automatique.
// Usage : node cross-merge.mjs <état.yaml>
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, writeOut, fail, table, today, humanReviewFooter } from './lib/common.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node cross-merge.mjs <état.yaml>', 2);
const dir = join(dirname(statePath), 'analyse');
if (!existsSync(join(dir, 'ids.json'))) fail('Dossier absent : lancer cross-context.mjs.');
if (!existsSync(join(dir, 'findings.yaml'))) fail(`Constats absents : ${join(dir, 'findings.yaml')}.`);
const ids = new Set(JSON.parse(readFileSync(join(dir, 'ids.json'), 'utf8')));
const raw = arr(yaml.load(readFileSync(join(dir, 'findings.yaml'), 'utf8'))?.findings);
const KINDS = { contradiction: 2, doublon: 2, incohérence: 2, manque: 1 };
const kept = [], rejected = [], stripped = [];
for (const f of raw) {
  for (const k of Object.keys(f)) if (/confian|confidence|certitude|score|probab/i.test(k)) { delete f[k]; stripped.push(f.id ?? '?'); }
  const cited = arr(f.items);
  const unknown = cited.filter(x => !ids.has(x));
  if (!KINDS[f.kind]) rejected.push(`${f.id ?? '?'} : nature « ${f.kind} » inconnue`);
  else if (cited.length < KINDS[f.kind]) rejected.push(`${f.id ?? '?'} : un ${f.kind} cite au moins ${KINDS[f.kind]} énoncé(s)`);
  else if (unknown.length) rejected.push(`${f.id ?? '?'} : énoncé(s) inexistant(s) ${unknown.join(', ')}`);
  else if (!f.explanation || !f.question) rejected.push(`${f.id ?? '?'} : sans explication ou sans question à poser`);
  else kept.push(f);
}
const proposals = kept.map((f, i) => ({ id: `ZO-analyse-${String(i + 1).padStart(2, '0')}`, type: f.kind === 'contradiction' ? 'contradiction' : f.kind === 'manque' ? 'regle_metier_manquante' : 'hypothese_non_verifiee', question: f.question, related: f.items, origin: 'analyse croisée', blocking: f.kind === 'contradiction', status: 'proposée' }));
writeOut(join(dir, 'proposals.yaml'), `# Zones d'ombre proposées par l'analyse croisée (${today()}) — à valider avec l'utilisateur avant de les ajouter à l'état\n${yaml.dump({ shadow_zones: proposals }, { lineWidth: 120 })}`);
const md = [`# Analyse croisée — ${today()}`, '', `${kept.length} constat(s) retenu(s), ${rejected.length} rejeté(s) pour forme. Chaque constat est une question pour l'humain, pas une correction. Cette liste se trie, elle ne se pose pas : les questions retenues deviennent des zones d'ombre, et ask-five.mjs dira lesquelles poser, deux ou trois à la fois.`, '',
  kept.length ? table(['Nature', 'Énoncés', 'Explication', 'Question à poser'], kept.map(f => [f.kind, f.items.join(', '), f.explanation, f.question])) : '_Aucun constat._', '',
  ...(rejected.length ? ['## Constats rejetés pour forme', '', ...rejected.map(r => `- ${r}`), ''] : []), ...(stripped.length ? [`_Mentions de confiance retirées : ${stripped.join(', ')}._`, ''] : [])];
writeOut(join(dir, 'report.md'), md.join('\n') + humanReviewFooter('rapport d\'analyse croisée'));
console.log(`Analyse croisée : ${kept.length} constat(s) retenu(s) → ${join(dir, 'proposals.yaml')} ; ${rejected.length} rejeté(s) pour forme.`);
