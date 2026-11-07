#!/usr/bin/env node
// Vérification légère de la phase de construction (BRD ou PRD, selon le champ `document` de l'état).
// Exécute le catalogue de lib/rules.mjs en mode AVERTISSEMENT : le script ne bloque jamais (code de sortie 0).
// Le contrôle formel bloquant relève d'une phase ultérieure et réutilisera le même catalogue.
// Usage : node lint.mjs <state.yaml> [--id ID[,ID…]] [--json]
//   --id   : ne vérifie que ces éléments (à utiliser avant de présenter un lot à l'utilisateur)
//   --json : sortie machine
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadState, fail, ingestedHandoffs } from './lib/common.mjs';
import { checkState, abstentions, STRUCT_RULES } from './lib/rules.mjs';

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
// Les coordonnées vivent à CÔTÉ de l'état, jamais dedans : `contacts.yaml` ne se commite pas (S114).
// Absent, c'est `null` — le catalogue le distingue de `undefined`, qui veut dire que personne n'a
// regardé : « on n'a pas regardé » n'est pas « il n'y a rien », et c'est le second qui se reproche.
const contactsPath = join(dirname(statePath), 'contacts.yaml');
const contacts = existsSync(contactsPath) ? loadState(contactsPath) : null;
// Guides d'entretien présents sur le disque : un guide ne se périme pas tout seul quand son absent arrive.
const interviews = (() => { const d = join(dirname(statePath), 'interviews'); return existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.md')).map(f => ({ file: f, text: readFileSync(join(d, f), 'utf8') })) : []; })();
// S53 vit dans le catalogue, comme le reste : le contrôle des handoffs ingérés était ici, et `status.mjs`
// ne pouvait donc pas le faire — la porte annonçait moins d'avertissements que le lint.
let findings = checkState(state, { refs, constitution, contacts, checklists, interviews, handoffs: ingestedHandoffs(state, statePath, refs) });
if (only.size) findings = findings.filter(f => only.has(f.id));
// Un avertissement dérogé ne disparaît pas : il change de liste. Un trou nommé se répare, un trou
// silencieux se propage — et une dérogation invisible est un contrôle désarmé sans trace.
const derogees = findings.filter(f => f.waived);
findings = findings.filter(f => !f.waived);
// Une relecture partie et pas encore revenue n'est pas un trou : c'est une question qui vit. Elle
// change de liste comme une dérogation, elle ne disparaît pas — et elle ne compte pas au débit de qui
// a posé la question, sinon demander coûte autant que ne pas demander. La sortie machine les garde
// dans le lot, avec leur drapeau : c'est un état, pas une absence de constat.
const attente = findings.filter(f => f.pending);
if (!args.includes('--json')) findings = findings.filter(f => !f.pending);

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
if (!args.includes('--json') && attente.length) {
  console.log(`\n${attente.length} question(s) posée(s) et pas encore revenue(s) :`);
  for (const f of attente) console.log(`  … [${f.rule}] ${f.id} — ${f.message}`);
  console.log('  Ni tenues ni en échec : non mesurées. Relancer est un geste de l\'utilisateur, pas une correction du dossier.');
}

// Ne pas savoir n'est pas constater. Mesuré : sur un état entièrement vide, 3 règles sur 131 parlent —
// les 128 autres se taisaient sans qu'on puisse distinguer ce silence d'un « tout va bien ». Ce bloc
// rend la case vide visible. Les lignes évitent la forme `[Sxx]` à dessein : la signature des tests
// dorés capture ce motif pour comparer les CONSTATS, et une abstention n'est pas un constat.
if (!args.includes('--json')) {
  const muettes = abstentions(state, refs);
  if (muettes.length) {
    console.log(`\n${muettes.length} règle(s) non mesurée(s) — elles n'ont rien eu à lire :`);
    for (const f of muettes) console.log(`  \u2205 ${f.rule} — ${STRUCT_RULES[f.rule]} : ${f.message.replace(/^non mesurée : /, '')}`);
    console.log('  Ni vrai, ni faux : une case vide. L\'absence de constat ne vaut pas constat de conformité.');
  }
}
