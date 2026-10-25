#!/usr/bin/env node
// Point d'étape déterministe d'une initiative, à partir de son état et de l'index des sessions — sans interprétation.
// Usage : node status.mjs <chemin/state.yaml>
import { arr, loadState, fail } from './lib/common.mjs';
import { condenseOf, sessionsFor } from './lib/sessions.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node status.mjs <state.yaml>', 2);
const s = loadState(statePath);
const doc = s.document ?? 'brd';
const initiative = statePath.replace(/\/state\.yaml$/, '').split('/').slice(-2).join('/');
const COLLECTIONS = {
  brd: ['candidate_needs', 'objectives', 'business_requirements', 'business_rules', 'decisions', 'risks'],
  prd: ['goals', 'personas', 'journeys', 'functional_requirements', 'acceptance_criteria', 'nfrs', 'design_decisions', 'hypotheses'],
  sad: ['drivers', 'contexts', 'elements', 'relations', 'decisions', 'nfr_responses', 'data_entities', 'interfaces', 'threats'],
  plan: ['stories', 'examples', 'tasks', 'iterations'],
  impl: ['tasks'], test: ['exploratory', 'nfr_results', 'waivers'],
}[doc] ?? [];
const out = [`Point d'étape — ${s.initiative?.name ?? initiative} (${doc}) — phase : ${s.phase ?? '—'} — version : ${s.governance?.version ?? '—'} (${s.governance?.status ?? '—'})`, ''];
for (const c of COLLECTIONS) {
  const items = arr(s[c]);
  if (!items.length) continue;
  const by = {};
  for (const x of items) by[x.status ?? '—'] = (by[x.status ?? '—'] ?? 0) + 1;
  out.push(`${c} : ${items.length} — ${Object.entries(by).map(([k, n]) => `${n} ${k}`).join(', ')}`);
}
const zo = arr(s.shadow_zones).filter(z => z.status === 'ouverte').sort((a, b) => (b.blocking ? 1 : 0) - (a.blocking ? 1 : 0));
out.push('', `Zones d'ombre ouvertes : ${zo.length}${zo.filter(z => z.blocking).length ? ` (dont ${zo.filter(z => z.blocking).length} bloquante(s))` : ''}`);
for (const z of zo.slice(0, 8)) out.push(`  ${z.blocking ? '!' : '-'} ${z.id} ${z.question ?? ''}${z.ask_to ? ` — à ${z.ask_to}` : ''}`);
// La porte de synthèse se déclare avec l'utilisateur à la fin de Discover, et `S65` ne la contrôle qu'à
// l'entrée de Define : jusque-là, rien ne disait ce qu'il restait à couvrir. Sur le premier dossier réel,
// les cinq dimensions étaient vides après une heure et demie de cadrage, avec zéro partie prenante
// entendue, et aucun outil ne le montrait. Le point d'étape l'affiche désormais comme une distance à
// parcourir, avec les deux comptes qui se calculent — les trois autres dimensions se jugent, pas se
// comptent, et restent à déclarer.
const DIMENSIONS = {
  fidelite: 'la synthèse reflète les sources, pas des suppositions',
  couverture: 'toutes les parties prenantes concernées sont représentées',
  robustesse: 'chaque besoin retenu repose sur plusieurs sources',
  actionnabilite: 'le problème est assez clair pour guider la suite',
  alignement: 'l\'équipe et les parties prenantes s\'y reconnaissent',
};
if (doc === 'brd' && !['assess', 'close'].includes(s.phase)) {
  const sc = s.synthesis_check ?? {};
  const declarees = Object.keys(DIMENSIONS).filter(d => sc[d]?.status);
  out.push('', `Porte de synthèse avant Define : ${declarees.length} dimension(s) sur 5 déclarée(s)${sc.date ? ` le ${sc.date}` : ''}`);
  const shs = arr(s.stakeholders);
  const entendues = shs.filter(x => x.status === 'interrogée').length;
  const bcs = arr(s.candidate_needs).filter(x => x.status !== 'abandonné');
  const uniques = bcs.filter(x => new Set(arr(x.sources).map(y => y.ref ?? y)).size < 2).length;
  const compte = {
    couverture: `${entendues} partie(s) prenante(s) entendue(s) sur ${shs.length}`,
    robustesse: bcs.length ? `${uniques} besoin(s) candidat(s) sur ${bcs.length} à source unique` : '',
  };
  for (const [d, quoi] of Object.entries(DIMENSIONS)) {
    const x = sc[d] ?? {};
    const etat = x.status ? `${x.status}${x.status === 'faible' && !x.assumed ? ' (non assumée)' : ''}` : 'à déclarer';
    out.push(`  ${x.status === 'ok' ? '✓' : x.status ? '!' : '·'} ${d.padEnd(15)}${etat} — ${compte[d] || quoi}`);
  }
}
const qs = arr(s.questions).filter(q => (q.status ?? '').includes('ouverte') || String(q.state ?? q.status ?? '').includes('❓'));
if (qs.length) { out.push('', `Questions ouvertes de la checklist : ${qs.length}`); for (const q of qs.slice(0, 8)) out.push(`  - ${q.id ?? ''} ${q.text ?? q.question ?? ''}`); }
if (s.session?.next_action) out.push('', `Prochaine action notée : ${s.session.next_action}`);
const sess = sessionsFor(initiative);
out.push('', `Sessions conservées pour ${initiative} : ${sess.length}`);
for (const x of sess.slice(-3)) { const c = condenseOf(x); out.push(`  - ${String(x.ended).slice(0, 16).replace('T', ' ')} · ${x.user_messages} message(s) · extrait : ${x.extract}${c ? ` · condensé : ${c}` : ' · pas de condensé'}`); }
if (sess.length && !condenseOf(sess.at(-1))) out.push('', 'La dernière session n\'a pas de condensé : le rédiger à partir de son extrait avant de reprendre.');
console.log(out.join('\n'));
