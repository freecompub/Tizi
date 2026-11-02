#!/usr/bin/env node
// Vérifie un handoff avant de l'ingérer : son intégrité, et L'ÉTAT DU DOCUMENT dont il vient.
// Usage : node verify-handoff.mjs <chemin/handoff/v<x.y>/handoff.yaml> [--accepte-non-baseline]
// Code de sortie 1 si le handoff a été altéré, ou s'il ne vient pas d'une baseline : ne pas l'ingérer.
//
// Chaque `build-handoff.mjs` écrit `source.status` — l'état de gouvernance du document figé —, et un
// seul script le lisait : `plan-builder/ingest-handoffs.mjs`, en `console.warn`, que rien ne persiste
// et que personne ne relit. Les quatre autres étapes passaient par ici, voyaient « Handoff intègre »,
// et ingéraient sans savoir si le document avait été approuvé. Intègre veut dire « non altéré », pas
// « approuvé » : un brouillon intact est intact, et c'est tout ce que ça dit.
import { dirname, join, resolve } from 'node:path';
import { verifyHandoff, loadState, fail } from './lib/common.mjs';

const args = process.argv.slice(2);
const path = args.find(a => !a.startsWith('--'));
if (!path) fail('Usage : node verify-handoff.mjs <handoff.yaml> [--accepte-non-baseline]', 2);
// handoff/v<x.y>/handoff.yaml → versions/v<x.y>/state.yaml
const vdir = dirname(resolve(path));
const frozen = join(dirname(dirname(vdir)), 'versions', vdir.split('/').pop(), 'state.yaml');
const r = verifyHandoff(path, frozen);
if (!r.ok) {
  console.error(`Handoff NON intègre :\n${r.problems.map(p => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
const source = loadState(path).source ?? {};
const status = String(source.status ?? '').trim();
const version = Object.entries(source).find(([k]) => k.endsWith('_version'))?.[1] ?? '';
const entete = `Handoff intègre — ${source.initiative || 'initiative sans nom'}${version ? `, v${version}` : ''}, état du document : ${status || 'non déclaré'}.`;
// L'empreinte ET l'état partent dans l'état de l'étape suivante : sans le second, l'aval ne peut plus
// savoir sur quoi il a été construit, et S108 n'a rien à lire.
const aReporter = `À reporter dans l'état de l'étape suivante : sha256 ${r.sha256}, status ${status || '""'}.`;
if (status === 'baseline') {
  console.log(`${entete}\n${aReporter}`);
  process.exit(0);
}
// Un état ABSENT ne se refuse pas : le champ n'existait pas dans les handoffs d'avant, et refuser
// punirait un dossier en cours pour une version des scripts. On le DIT, et `S108` le porte dans l'aval
// jusqu'à sa gouvernance — ce que « Handoff intègre », tout seul, ne faisait pas.
if (!status) {
  console.log([entete, '',
    'L\'état du document amont n\'est pas relevé dans ce handoff : impossible de savoir d\'ici s\'il a été figé.',
    'Régénère-le avec build-handoff.mjs sur la version figée pour l\'y porter. S108 le rappellera dans l\'état aval jusqu\'à sa gouvernance.',
    '', aReporter].join('\n'));
  process.exit(0);
}
console.error([entete, '',
  `Ce handoff ne vient pas d'une baseline. Intègre veut dire « non altéré » : le document est intact, et il n'a pas été figé${status ? ` (il est à « ${status} »)` : ''}.`,
  'Construire dessus, c\'est bâtir sur un texte qui peut encore changer sans que rien ne le dise — et l\'étape suivante scelle une empreinte qui deviendra fausse au prochain gel.',
  '',
  'Deux voies, et c\'est l\'utilisateur qui tranche, pas toi :',
  '  - faire figer le document amont (freeze-version.mjs --baseline), puis régénérer son handoff ;',
  '  - ingérer quand même, en connaissance de cause : relance avec --accepte-non-baseline, et reporte',
  `    \`status: ${status || 'non déclaré'}\` dans l'état de l'étape suivante — S108 le rappellera jusqu'à la gouvernance.`,
].join('\n'));
if (!args.includes('--accepte-non-baseline')) process.exit(1);
console.log(`\n--accepte-non-baseline : ingestion autorisée en connaissance de cause.\n${aReporter}`);
