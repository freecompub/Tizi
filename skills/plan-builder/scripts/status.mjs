#!/usr/bin/env node
// Point d'étape déterministe d'une initiative, à partir de son état et de l'index des sessions — sans interprétation.
// Usage : node status.mjs <chemin/state.yaml> [--id ID[,ID…]]
//   --id : mode consultation — la formulation humaine des identifiants demandés, et rien d'autre.
//          Un identifiant ne s'écrit jamais seul dans un message, et sa formulation se lit ici.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, loadState, fail, shLabel, label, PHASE_NOM, ingestedHandoffs, dossierDe } from './lib/common.mjs';
import { phaseTrail, gateConditions } from './lib/gates.mjs';
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
// Le document ET son dossier quand les deux noms diffèrent : « (test) » sur un chemin `qa/…` laissait
// chercher un dossier `test/` qui n'existe pas.
const ou = dossierDe(doc) === doc ? doc : `${doc}, dans ${dossierDe(doc)}/`;
const out = [`Point d'étape — ${s.initiative?.name ?? initiative} (${ou}) — phase : ${s.phase ?? '—'} — version : ${s.governance?.version ?? '—'} (${s.governance?.status ?? '—'})`, ''];
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
// de sortie sont écrites dans les fichiers de phase : celles qui se calculent se calculent, et elles
// vivent dans `lib/gates.mjs` — pour les cinq documents à phases, plus seulement pour le BRD.
const parcours = phaseTrail(s);
if (parcours.phases.length) {
  // Une phase passée dit quand et par qui, quand `phase_log` le porte : « j'ai fini la phase BRD » se
  // vérifie, et un passage sans trace se voit à sa place vide au lieu de se découvrir trois sessions
  // plus tard. Une phase close plusieurs fois le dit aussi : les phases du plan se répètent à chaque
  // cycle, et la ligne annonçait « Govern à venir » sur un plan dont la version 1.0 était figée.
  const marque = x => {
    if (x.courante) return x.closes.length ? `en cours (passage n°${x.closes.length + 1})` : 'en cours';
    // Hors de la table — une initiative close —, ce qui n'a pas de trace est inconnu, pas « à venir ».
    if (!x.passee) return parcours.horsTable ? 'sans trace' : 'à venir';
    const e = x.closes.at(-1);
    const fois = x.closes.length > 1 ? ` ×${x.closes.length}` : '';
    return e ? `✓${fois} (${[e.date, e.decided_by ? shLabel(s, e.decided_by) : ''].filter(Boolean).join(', ')})` : `✓${fois} (passage sans trace)`;
  };
  const terme = parcours.horsTable
    ? ` · ${PHASE_NOM[parcours.horsTable] ?? parcours.horsTable} — ${parcours.horsTable === 'close' ? 'initiative close' : 'phase hors de la table de ce document'}`
    : '';
  out.push('', `Phases : ${parcours.trail.map(x => `${x.nom} ${marque(x)}`).join(' · ')}${terme}`);
  // Un retour en arrière est un passage comme un autre, et il s'écrit dans le même journal : sans lui,
  // le parcours réel d'un dossier qui a reculé se lit comme un parcours tout droit.
  for (const r of parcours.retours) {
    out.push(`  ↩ retour en ${PHASE_NOM[r.to] ?? r.to} depuis ${PHASE_NOM[r.from] ?? r.from}${r.date ? ` le ${r.date}` : ''}${r.decided_by ? `, ${shLabel(s, r.decided_by)}` : ''}${r.zone ? ` — ${r.zone}` : ''}${r.reason ? ` : ${r.reason}` : ''}`);
  }
}

// Les avertissements actifs du catalogue, dérogations nommées retirées. `lib/rules.mjs` n'est livré que
// par les skills qui tiennent un document ; l'import est donc facultatif, comme celui des blocages dans
// `session-start.mjs` — un point d'étape ne doit jamais échouer sur une pièce absente.
const regles = await import('./lib/rules.mjs').catch(() => null);
// Les `refs.yaml` du plan portent les exigences de la release et les éléments de la conception, que
// l'état ne contient pas. La porte en a besoin, et le CATALOGUE aussi : `lint.mjs` les lui passe, pas
// ce script — si bien que sur un plan les deux annonçaient deux nombres d'avertissements différents,
// ce que le commentaire ci-dessous interdisait depuis le début. Un décompte qui ne concorde pas avec
// l'autre se recompte à la main.
const refsPath = join(dirname(statePath), 'refs.yaml');
const refs = existsSync(refsPath) ? loadState(refsPath) : null;
// Le même contexte que `lint.mjs`, sinon les deux scripts annoncent deux nombres différents.
const voisins = (nom, lire) => { const d = join(dirname(statePath), nom); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.md')).map(lire) : []; };
// Le contexte COMPLET de `lint.mjs` : les handoffs amont, la constitution, les listes de contrôle et
// les guides d'entretien. Il en manquait trois, et chacun retirait des constats du décompte.
const constitution = (() => { for (const r of ['.', racine]) { const c = join(r, '.tizi', 'constitution.yaml'); if (existsSync(c)) return loadState(c); } return null; })();
const actifs = regles ? regles.checkState(s, {
  refs: refs ?? {}, constitution, handoffs: ingestedHandoffs(s, statePath, refs ?? {}),
  checklists: voisins('checklists', f => ({ file: f, text: readFileSync(join(dirname(statePath), 'checklists', f), 'utf8') })),
  interviews: voisins('interviews', f => ({ file: f, text: readFileSync(join(dirname(statePath), 'interviews', f), 'utf8') })),
// `pending` sort du décompte avec `waived`, et pour la même raison : la porte compte ce qui manque au
// dossier, pas ce qu'on attend de quelqu'un d'autre. Les deux scripts filtrent pareil, sinon ils
// annoncent deux nombres différents — ce que le commentaire ci-dessus interdit.
}).filter(f => !f.waived && !f.pending).length : null;
// La porte de sortie, avec ses conditions comptées — pour les cinq documents à phases.
const porte = gateConditions(s, { actifs, refs });
if (porte) {
  out.push('', `Porte de sortie de ${porte.nom} — vers ${porte.suivante} : ${porte.tenues} condition(s) tenue(s) sur ${porte.mesurees} mesurée(s)${porte.nonMesurees ? `, ${porte.nonMesurees} non mesurée(s)` : ''}`);
  for (const [libelle, ok, detail] of porte.conditions) out.push(`  ${ok === true ? '✓' : ok === false ? '✗' : '?'} ${libelle}${ok === true ? '' : ` — ${detail}`}`);
  out.push('  Les conditions qui se jugent — la synthèse, le MVP, « assez de stories » — ne sont pas ici : elles se tranchent avec l\'utilisateur (references/phase-*.md).');
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
