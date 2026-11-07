#!/usr/bin/env node
// Ce que le council rapporte, sur un portefeuille. Lit les `council_runs` de tous les documents de
// toutes les initiatives d'un dépôt, et dit par passage ce qu'il a coûté et ce qu'il a produit.
//
// Pourquoi ce script existe : les compteurs de `council_runs` ont été écrits « pour mesurer si le
// council valait le coup », et **personne ne les agrégeait**. Vérifié avant de l'écrire : la seule
// mention de ce bloc dans tous les scripts était une liste d'exclusion. Des chiffres qu'aucun outil
// ne relit ne mesurent rien — ils trompent un lecteur, ce qui est pire que de ne pas les écrire.
//
// Le piège, que `references/council.md` nomme lui-même : un passage partagé entre plusieurs
// initiatives s'écrit **à l'identique dans chacune**, avec sa portée dans `initiatives`. Une somme
// naïve le compte autant de fois qu'il y a d'initiatives — « 40 proposées » devient 120. C'est arrivé.
// Les passages se dédoublonnent donc sur date + mode + portée, et le script dit combien il en a fusionné.
//
// Usage : node council-report.mjs [racine] [--json]
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { arr, cell, table, loadState, rootArg, txt } from './lib/common.mjs';

const args = process.argv.slice(2);
const root = rootArg(args.find(a => !a.startsWith('--')),
  'Usage : node council-report.mjs [racine] [--json] — pour le dépôt courant : node council-report.mjs .');
// Les quatre documents qui ont un council. L'implémentation et les tests n'en ont pas.
const DOSSIERS = ['brd', 'prd', 'sad', 'plan'];

const etats = [];
for (const d of DOSSIERS) {
  const dir = join(root, d);
  if (!existsSync(dir)) continue;
  for (const slug of readdirSync(dir)) {
    const p = join(dir, slug, 'state.yaml');
    if (existsSync(p)) etats.push({ doc: d, slug, s: loadState(p) });
  }
}

// Un passage, dédoublonné. La clé est ce qui identifie le passage lui-même, pas le fichier où il est
// écrit : sa date, son mode et sa portée. Les questions, elles, sont PROPRES à chaque fichier — le
// gabarit le dit : « dans CE fichier, seulement celles dont le `target` porte sur cette initiative ».
// On les accumule donc, tout en ne comptant `proposed` qu'une fois.
const passages = new Map();
for (const { doc, slug, s } of etats) {
  for (const r of arr(s.council_runs)) {
    const portee = arr(r.initiatives).length ? [...arr(r.initiatives)].sort().join(',') : slug;
    // Le DOCUMENT fait partie de la clé, et le test l'a montré : sans lui, le council de préparation
    // du BRD et celui de la planification se fondaient en un seul dès qu'ils portaient la même date.
    // Un passage partagé entre initiatives l'est entre les MÊMES documents — le BRD de A et le BRD de
    // B —, jamais entre un BRD et un plan.
    const cle = `${txt(r.date)}|${txt(r.mode)}|${doc}|${portee}`;
    const vu = passages.get(cle) ?? { date: r.date, mode: r.mode, doc, portee, lenses: new Set(), proposed: 0, questions: [], fichiers: 0, doublons: 0 };
    vu.fichiers += 1;
    vu.proposed = Math.max(vu.proposed, Number(r.proposed) || 0);
    for (const l of arr(r.lenses)) vu.lenses.add(l);
    // Les questions aussi se dédoublonnent, et l'essai l'a montré : le gabarit prescrit que chaque
    // fichier ne porte que les questions qui visent SON initiative, mais rien ne l'impose, et un
    // passage partagé recopié en entier dans deux dossiers faisait compter chaque question deux fois.
    // La clé est l'énoncé : si les fichiers suivent le gabarit, les énoncés diffèrent et rien n'est
    // fusionné ; s'ils se recopient, on compte une fois. Le dédoublonnage ne gonfle jamais.
    for (const q of arr(r.questions)) {
      const cleQ = String(q.text ?? '').trim().toLowerCase();
      if (cleQ && vu.questions.some(x => String(x.text ?? '').trim().toLowerCase() === cleQ)) { vu.doublons += 1; continue; }
      vu.questions.push({ ...q, doc, slug });
    }
    passages.set(cle, vu);
  }
}
const lots = [...passages.values()];
const fusionnes = lots.reduce((n, p) => n + Math.max(0, p.fichiers - 1), 0);
const doublons = lots.reduce((n, p) => n + p.doublons, 0);

// Ce que chaque question retenue est devenue. C'est la seule chose qui dise si le council a servi, et
// elle n'était pas calculable avant le 7 novembre 2026 : une question hors sujet se fermait en `levée`,
// comme une question à laquelle on avait répondu. Le quatrième statut, `sans_objet`, les sépare.
const zones = new Map();
for (const { s } of etats) for (const z of arr(s.shadow_zones)) zones.set(z.id, z);
const SORTS = ['levée', 'assumée', 'sans_objet', 'ouverte', 'zone inconnue', 'sans zone'];
const sortDe = q => {
  if (q.outcome !== 'retenue') return null;
  if (!q.zone) return 'sans zone';
  const z = zones.get(q.zone);
  if (!z) return 'zone inconnue';
  return SORTS.includes(z.status) ? z.status : 'ouverte';
};

const toutes = lots.flatMap(p => p.questions);
const parIssue = o => toutes.filter(q => q.outcome === o).length;
const retenues = toutes.filter(q => q.outcome === 'retenue');
const parSort = Object.fromEntries(SORTS.map(k => [k, retenues.filter(q => sortDe(q) === k).length]));
const proposees = lots.reduce((n, p) => n + p.proposed, 0);
const moy = (a, b) => (b ? Math.round((a / b) * 10) / 10 : null);

if (args.includes('--json')) {
  console.log(JSON.stringify({ passages: lots.map(p => ({ ...p, lenses: [...p.lenses] })), fusionnes, proposees, parSort }, null, 2));
  process.exit(0);
}

if (!lots.length) {
  // Ne pas savoir n'est pas constater : zéro passage et zéro question ne se présentent pas comme un
  // résultat. `council_runs` est vide dans tous les états du dépôt au 7 novembre 2026.
  console.log(`Aucun passage de council enregistré dans ${etats.length} document(s) de ce dépôt.`);
  console.log('Ce n\'est pas une mesure : c\'est l\'absence de mesure. Un council qui se lance écrit son');
  console.log('passage dans `council_runs` (date, mode, lentilles, portée, questions proposées et retenues)');
  console.log('— voir `references/council.md`. Sans cette trace, rien ne dira jamais s\'il valait le coup.');
  process.exit(0);
}

console.log(`Council — ${lots.length} passage(s) sur ${etats.length} document(s)${fusionnes ? `, ${fusionnes} écriture(s) fusionnée(s) (passages partagés)` : ''}${doublons ? `, ${doublons} question(s) recopiée(s) d'un dossier à l'autre et comptée(s) une fois` : ''}.\n`);
console.log(table(['Date', 'Document', 'Mode', 'Portée', 'Lentilles', 'Proposées', 'Retenues', 'Écartées', 'Réservées'],
  lots.sort((a, b) => txt(a.date).localeCompare(txt(b.date))).map(p => [cell(p.date), cell(p.doc), cell(p.mode), cell(p.portee),
    `${p.lenses.size}`, `${p.proposed}`,
    `${p.questions.filter(q => q.outcome === 'retenue').length}`,
    `${p.questions.filter(q => q.outcome === 'écartée').length}`,
    `${p.questions.filter(q => q.outcome === 'réservée').length}`])));

console.log(`\nSur le portefeuille : ${proposees} question(s) proposée(s) par les lentilles, ${toutes.length} arbitrée(s) — ${parIssue('retenue')} retenue(s), ${parIssue('écartée')} écartée(s), ${parIssue('réservée')} réservée(s).`);
console.log(`Ce qu'un passage rapporte, en moyenne : ${txt(moy(parIssue('retenue'), lots.length))} question(s) retenue(s) pour ${txt(moy(proposees, lots.length))} proposée(s).`);

// Une question écartée ou réservée sans raison écrite : le gabarit la rend obligatoire, et un compteur
// ne se relit pas. Sans la raison, « 39 écartées » ne dit pas si c'étaient des doublons, des solutions
// déguisées ou de bonnes questions mal arbitrées.
const muettes = toutes.filter(q => ['écartée', 'réservée'].includes(q.outcome) && !String(q.reason ?? '').trim());
if (muettes.length) console.log(`\n⚠ ${muettes.length} question(s) écartée(s) ou réservée(s) sans raison écrite : le compte ne se relit pas sans elle.`);

console.log(`\nCe que les ${retenues.length} question(s) retenue(s) sont devenues :\n`);
console.log(table(['Devenue', 'Combien', 'Ce que ça dit du council'], [
  ['levée', `${parSort['levée']}`, 'la question avait une réponse, et le council l\'a fait chercher'],
  ['assumée', `${parSort['assumée']}`, 'la question tenait, et l\'équipe a choisi de vivre avec — en le disant'],
  ['sans objet', `${parSort['sans_objet']}`, '**hors sujet** : la question ne se posait pas. C\'est le coût du council'],
  ['encore ouverte', `${parSort['ouverte']}`, 'pas encore tranchée : ni au crédit ni au débit'],
  ['sans zone', `${parSort['sans zone']}`, 'retenue et jamais transformée en zone d\'ombre : la trace s\'arrête là'],
  ['zone inconnue', `${parSort['zone inconnue']}`, 'la zone citée n\'existe dans aucun état : un renvoi mort'],
]));

const tranchees = parSort['levée'] + parSort['assumée'] + parSort['sans_objet'];
if (tranchees) {
  const part = Math.round((parSort['sans_objet'] / tranchees) * 1000) / 10;
  console.log(`\nSur ${tranchees} question(s) tranchée(s), ${part} % étaient hors sujet. C'est le chiffre qui dit si le council vaut le coup, et il n'était pas calculable avant le quatrième statut : « hors sujet » et « on a trouvé la réponse » se fermaient de la même façon.`);
} else {
  console.log('\nAucune question retenue n\'est encore tranchée : la part de hors-sujet n\'est pas mesurable, elle n\'est pas nulle.');
}
