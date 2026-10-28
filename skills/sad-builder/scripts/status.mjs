#!/usr/bin/env node
// Point d'étape déterministe d'une initiative, à partir de son état et de l'index des sessions — sans interprétation.
// Usage : node status.mjs <chemin/state.yaml> [--id ID[,ID…]]
//   --id : mode consultation — la formulation humaine des identifiants demandés, et rien d'autre.
//          Un identifiant ne s'écrit jamais seul dans un message, et sa formulation se lit ici.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, fail, shLabel, label } from './lib/common.mjs';
import { condenseOf, sessionsFor } from './lib/sessions.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && !/^[A-Z]+-/.test(a));
if (!statePath) fail('Usage : node status.mjs <state.yaml> [--id ID[,ID…]]', 2);
const s = loadState(statePath);

// Mode consultation : la formulation humaine des identifiants demandés. Un identifiant ne s'écrit
// jamais seul dans un message, et sa formulation se LIT ici au lieu d'être convoquée de mémoire.
if (args.includes('--id')) {
  const ids = (args[args.indexOf('--id') + 1] ?? '').split(',').map(x => x.trim()).filter(Boolean);
  if (!ids.length) fail('Usage : node status.mjs <state.yaml> --id ID[,ID…]', 2);
  for (const id of ids) {
    const forme = label(s, id);
    console.log(forme === id ? `${id} : inconnu dans ce dossier` : forme);
  }
  process.exit(0);
}
const doc = s.document ?? 'brd';
const initiative = statePath.replace(/\/state\.yaml$/, '').split('/').slice(-2).join('/');
// Les sessions se cherchent à la racine du dépôt, pas dans le répertoire courant : lancé avec un chemin
// absolu depuis ailleurs, le point d'étape annonçait « Sessions conservées : 0 » alors que l'index
// existait. Il mentait au lieu de refuser.
const racine = statePath.replace(/\/state\.yaml$/, '').split('/').slice(0, -2).join('/') || '.';
// Le dossier porte aussi des sources, des parties prenantes et des hypothèses, et le point d'étape ne
// les comptait pas : à la fin de la première session réelle, l'agent les a comptées de mémoire et a
// annoncé 11 sources pour 10, 6 hypothèses pour 5 — le dernier identifiant lu comme un décompte. Un
// script qui ne compte pas tout fait recompter le reste à la main.
const COLLECTIONS = {
  brd: ['stakeholders', 'sources', 'candidate_needs', 'hypotheses', 'objectives', 'business_requirements', 'business_rules', 'decisions', 'risks'],
  prd: ['stakeholders', 'sources', 'goals', 'personas', 'journeys', 'functional_requirements', 'acceptance_criteria', 'nfrs', 'design_decisions', 'hypotheses'],
  sad: ['drivers', 'contexts', 'elements', 'relations', 'decisions', 'nfr_responses', 'data_entities', 'interfaces', 'threats'],
  plan: ['stories', 'examples', 'tasks', 'iterations'],
  impl: ['tasks'], test: ['exploratory', 'nfr_results', 'waivers'],
}[doc] ?? [];
const out = [`Point d'étape — ${s.initiative?.name ?? initiative} (${doc}) — phase : ${s.phase ?? '—'} — version : ${s.governance?.version ?? '—'} (${s.governance?.status ?? '—'})`, ''];
for (const c of COLLECTIONS) {
  const items = arr(s[c]);
  if (!items.length) continue;
  // Les sources n'ont pas de statut de cycle de vie, et leur TYPE est ce qu'on veut voir : dix sources
  // toutes de type `cadrage` disent que le dossier n'est jamais sorti de la pièce du premier échange.
  const cle = c === 'sources' ? 'type' : 'status';
  const by = {};
  for (const x of items) by[x[cle] ?? '—'] = (by[x[cle] ?? '—'] ?? 0) + 1;
  // Une collection sans statut — les sources en ont un de relecture, pas de cycle de vie — rendait
  // « sources : 10 — 10 — » : juste, illisible, donc recompté à la main. Le total suffit alors.
  const detail = by['—'] === items.length ? '' : ` — ${Object.entries(by).map(([k, n]) => `${n} ${k}`).join(', ')}`;
  out.push(`${c} : ${items.length}${detail}`);
}
// Le point d'étape disait la phase COURANTE et la porte PRÉCÉDENTE — les cinq dimensions de synthèse —
// jamais la position dans la chaîne, ni ce qui reste avant la porte suivante. Au moment où l'utilisateur
// a annoncé « j'ai fini la phase BRD » sur un dossier réel, Define était faite, Govern n'avait pas
// commencé, quatre sections du document étaient encore `proposé`, et rien ne le disait. Les conditions
// de sortie sont écrites dans les fichiers de phase : celles qui se calculent se calculent.
const PHASES = { brd: ['assess', 'discover', 'define', 'govern'], prd: ['frame', 'specify', 'govern'],
  sad: ['explore', 'design', 'govern'], plan: ['slice', 'refine', 'schedule', 'govern', 'review'] }[doc] ?? [];
const NOM = { assess: 'Assess', discover: 'Discover', define: 'Define', govern: 'Govern', frame: 'Frame',
  specify: 'Specify', explore: 'Explore', design: 'Design', slice: 'Slice', refine: 'Refine', schedule: 'Schedule', review: 'Review' };
const rang = PHASES.indexOf(s.phase);
if (rang >= 0) {
  out.push('', `Phases : ${PHASES.map((p, i) => `${NOM[p]} ${i < rang ? '✓' : i === rang ? 'en cours' : 'à venir'}`).join(' · ')}`);
}

// Les avertissements actifs du catalogue, dérogations nommées retirées. `lib/rules.mjs` n'est livré que
// par les skills qui tiennent un document ; l'import est donc facultatif, comme celui des blocages dans
// `session-start.mjs` — un point d'étape ne doit jamais échouer sur une pièce absente.
const regles = await import('./lib/rules.mjs').catch(() => null);
// Le même contexte que `lint.mjs`, sinon les deux scripts annoncent deux nombres différents — et un
// décompte qui ne concorde pas avec l'autre se recompte à la main.
const voisins = (nom, lire) => { const d = join(dirname(statePath), nom); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.md')).map(lire) : []; };
const actifs = regles ? regles.checkState(s, {
  checklists: voisins('checklists', f => ({ file: f, text: readFileSync(join(dirname(statePath), 'checklists', f), 'utf8') })),
  interviews: voisins('interviews', f => f),
}).filter(f => !f.waived).length : null;
const CANVAS = ['problems', 'users', 'solutions_today', 'user_metrics', 'business_metrics'];
const vides = o => Object.entries(o ?? {}).filter(([, v]) => v !== 'validé').map(([k]) => k);
const PORTES = {
  assess: () => [
    ['le canevas d\'opportunité est rempli', CANVAS.every(k => arr(s.opportunity?.canvas?.[k]).length), `${CANVAS.filter(k => !arr(s.opportunity?.canvas?.[k]).length).join(', ') || '—'} à remplir`],
    ['une décision d\'opportunité est rendue, par une personne nommée', Boolean(s.opportunity?.decision && s.opportunity.decision !== 'en_attente' && s.opportunity?.decided_by), `décision : ${s.opportunity?.decision ?? '—'}`],
  ],
  discover: () => [
    ['le problème est formulé et confirmé par l\'utilisateur', Boolean(s.problem?.statement && s.problem?.confirmed), s.problem?.statement ? 'formulé, pas confirmé' : 'pas encore formulé'],
    ['au moins un signal de succès', arr(s.success_signals).length > 0, `${arr(s.success_signals).length} signal(aux)`],
    ['un council en mode couverture est passé', arr(s.council_runs).some(r => r.mode === 'couverture'), `modes passés : ${[...new Set(arr(s.council_runs).map(r => r.mode))].join(', ') || 'aucun'}`],
    ['chaque besoin candidat est sourcé', arr(s.candidate_needs).every(n => arr(n.sources).length), `${arr(s.candidate_needs).filter(n => !arr(n.sources).length).length} sans source`],
    ['la porte de synthèse est déclarée', Boolean(s.synthesis_check?.date), 'cinq dimensions à juger avec l\'utilisateur'],
  ],
  define: () => [
    ['toutes les sections du document sont validées', vides(s.brd_sections).length === 0, `${vides(s.brd_sections).length} section(s) : ${vides(s.brd_sections).join(', ')}`],
    ['chaque objectif porte une exigence, et chaque exigence un objectif', (() => {
      const brs = arr(s.business_requirements).filter(b => b.status !== 'abandonné');
      const couverts = new Set(brs.flatMap(b => arr(b.objectives)));
      return arr(s.objectives).every(o => couverts.has(o.id)) && brs.every(b => arr(b.objectives).length);
    })(), 'rattachements manquants'],
    ['aucun besoin candidat resté « confirmé »', !arr(s.candidate_needs).some(n => n.status === 'confirmé'), `${arr(s.candidate_needs).filter(n => n.status === 'confirmé').length} à solder`],
    ['aucune décision restée « proposé »', !arr(s.decisions).some(d => d.status === 'proposé'), `${arr(s.decisions).filter(d => d.status === 'proposé').length} à rendre`],
  ],
  govern: () => [
    ['des relecteurs sont nommés', arr(s.governance?.reviewers).length > 0, 'déduits de la cartographie'],
    ['au moins une approbation', arr(s.governance?.approvals).some(a => a.decision?.startsWith('approuvé')), `${arr(s.governance?.approvals).length} approbation(s)`],
    ['une version de référence est figée', arr(s.governance?.baselines).length > 0, 'freeze-version.mjs --baseline'],
  ],
}[s.phase];
if (PORTES && doc === 'brd') {
  const conds = [
    ...PORTES(),
    ['aucune zone d\'ombre bloquante ouverte', !arr(s.shadow_zones).some(z => z.status === 'ouverte' && z.blocking), `${arr(s.shadow_zones).filter(z => z.status === 'ouverte' && z.blocking).length} bloquante(s)`],
    ...(actifs === null ? [] : [['aucun avertissement ni corrigé ni dérogé (lint.mjs)', actifs === 0, `${actifs} avertissement(s) actif(s)`]]),
  ];
  const suivante = rang >= 0 && rang + 1 < PHASES.length ? NOM[PHASES[rang + 1]] : 'la suite';
  out.push('', `Porte de sortie de ${NOM[s.phase]} — vers ${suivante} : ${conds.filter(c => c[1]).length} condition(s) sur ${conds.length}`);
  for (const [libelle, ok, detail] of conds) out.push(`  ${ok ? '✓' : '✗'} ${libelle}${ok ? '' : ` — ${detail}`}`);
  out.push('  Le passage se décide avec l\'utilisateur, jamais seul (references/questions.md).');
}

const zo = arr(s.shadow_zones).filter(z => z.status === 'ouverte').sort((a, b) => (b.blocking ? 1 : 0) - (a.blocking ? 1 : 0));
out.push('', `Zones d'ombre ouvertes : ${zo.length}${zo.filter(z => z.blocking).length ? ` (dont ${zo.filter(z => z.blocking).length} bloquante(s))` : ''}`);
// La zone était glosée — son identifiant suivi de sa question — et le destinataire rendu en
// identifiant nu, dans la même ligne : « ZO-008 … — à SH-01 », alors que `name` dit « Samir » juste à
// côté. `shLabel` existe depuis longtemps dans le fichier commun, et seuls les artefacts ÉCRITS
// l'appelaient : les deux scripts qui parlent dans la conversation rendaient l'adresse au lieu du nom.
for (const z of zo.slice(0, 8)) out.push(`  ${z.blocking ? '!' : '-'} ${z.id} ${z.question ?? ''}${z.ask_to ? ` — à ${shLabel(s, z.ask_to)}` : ''}`);
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
// La checklist est écrite par groupes (`- group: 1` puis `items:`), et ce filtre ne lisait que le
// premier niveau : au deuxième dossier réel, sept questions ouvertes n'étaient affichées nulle part.
// On aplatit, en gardant la forme plate au cas où un état ancien la porte encore.
const items = arr(s.questions).flatMap(g => (arr(g.items).length ? arr(g.items).map(i => ({ ...i, group: g.title ?? g.group })) : [g]));
const qs = items.filter(q => /ouverte|partielle|❓/.test(String(q.state ?? q.status ?? '')));
if (qs.length) {
  out.push('', `Questions ouvertes ou partielles de la checklist : ${qs.length}`);
  for (const q of qs.slice(0, 8)) out.push(`  ${/partielle/.test(String(q.state ?? q.status ?? '')) ? '◐' : '-'} ${q.id ?? ''} ${q.text ?? q.question ?? ''}${q.group ? ` — ${q.group}` : ''}`);
}
if (s.session?.next_action) out.push('', `Prochaine action notée : ${s.session.next_action}`);
const sess = sessionsFor(initiative, racine);
out.push('', `Sessions conservées pour ${initiative} : ${sess.length}`);
for (const x of sess.slice(-3)) { const c = condenseOf(x, racine); out.push(`  - ${String(x.ended).slice(0, 16).replace('T', ' ')} · ${x.user_messages} message(s) · extrait : ${x.extract}${c ? ` · condensé : ${c}` : ' · pas de condensé'}`); }
if (sess.length && !condenseOf(sess.at(-1), racine)) out.push('', 'La dernière session n\'a pas de condensé : le rédiger à partir de son extrait avant de reprendre.');
console.log(out.join('\n'));
