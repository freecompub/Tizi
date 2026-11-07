#!/usr/bin/env node
// Génère, à partir de audit/<slug>/state.yaml (le document étranger posé dans la forme d'état de
// Tizi) et refs.yaml s'il existe :
//   audit/<slug>/audit.md   le rapport à trois colonnes : constaté faux / constaté vrai / non mesurable
// Le fichier est écrasé à chaque génération.
//
// Ce script ne contient AUCUNE grille. Les grilles, ce sont les règles : `verdicts()` de lib/rules.mjs
// les trie, et ce fichier les met en page. Un rapport qui recomposerait ces listes à sa façon finirait
// par en donner une version différente de celle du lint, et c'est la dérive que
// `les-documents-et-leur-generateur` a trouvée ailleurs dans ce dépôt.
//
// Ce qu'un audit ne dit JAMAIS : qu'une manière de travailler est fausse. Une pratique est obligatoire,
// l'approche qui la réalise est locale et intransposable (Rubin, *Essential Scrum*, ch. 23). Un document
// qui n'est pas écrit dans la forme de Tizi n'est pas un document fautif : les règles qui lisaient la
// trace de Tizi s'abstiennent, et c'est la troisième colonne qui le dit.
// Usage : node audit.mjs <state.yaml> [--json]
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, cell, table, list, loadState, writeOut, fail, today, ecrit, PHASE_NOM } from './lib/common.mjs';
import { verdicts, STRUCT_RULES, TEXT_RULES, DOCUMENTS } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
if (!statePath) fail('Usage : node audit.mjs <state.yaml> [--json]', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const refsPath = join(root, 'refs.yaml');
const refs = existsSync(refsPath) ? loadState(refsPath) : {};
const a = s.audit ?? {};
if (!DOCUMENTS.includes(s.document ?? '')) {
  fail(`\`document\` vaut « ${s.document ?? 'rien'} » : un audit se fait contre le catalogue d'un document que Tizi vérifie (${DOCUMENTS.join(', ')}). C'est le premier choix de l'import, et il se décide avec l'utilisateur : auditer un backlog contre les règles du BRD ne rendrait que du bruit.`, 2);
}
// Le libellé d'une règle, de structure ou de rédaction. Les deux familles apparaissent dans les
// constats — `checkState` compose les deux — et un rapport qui n'en nommerait qu'une laisserait des
// lignes sans libellé, ce qui est exactement ce qu'on reproche à un document.
const LIBELLE = { ...STRUCT_RULES, ...Object.fromEntries(TEXT_RULES.map(r => [r.id, r.name.replace(/_/g, ' ')])) };
const libelle = r => LIBELLE[r] ?? '—';

const { constats, muettes, vrais, horsJeu } = verdicts(s, { refs });
// Un constat dérogé n'est pas un constat : il a été assumé par écrit. Dans un audit, une dérogation
// vient du document audité, pas de nous — on ne l'efface pas, on la montre, parce que c'est une
// décision de quelqu'un et qu'un audit en rend compte au lieu de la recompter comme un défaut.
const derogees = constats.filter(f => f.waived);
const attente = constats.filter(f => !f.waived && f.pending);
const faux = constats.filter(f => !f.waived && !f.pending);
// Deux familles de règles se mêlent dans les constats, et il a fallu un test pour s'en apercevoir : la
// première version additionnait les deux dans la partition et annonçait « 23 + 24 + 26 + 64 = 131 »,
// une addition fausse de six — les six règles de RÉDACTION, qui ne sont pas au registre de structure.
// Un audit qui se trompe dans son propre compte ne se relit pas : les deux familles se comptent à part.
const reglesFausses = [...new Set(faux.map(f => f.rule))];
const deStructure = reglesFausses.filter(r => r in STRUCT_RULES);
const deRedaction = reglesFausses.filter(r => !(r in STRUCT_RULES));
const total = Object.keys(STRUCT_RULES).length;

if (args.includes('--json')) {
  console.log(JSON.stringify({ document: s.document, faux, derogees, attente, muettes, vrais, horsJeu, incertain: arr(a.uncertain) }, null, 2));
  process.exit(0);
}

const t = [];
t.push(`# Audit — ${ecrit(a.title) ? a.title : (s.initiative?.name ?? 'document sans titre')}\n\n`);
t.push(`Document audité : **${s.document}**${ecrit(s.phase) ? ` (phase déclarée : ${PHASE_NOM[s.phase] ?? s.phase})` : ''}. Rapport établi le ${today()}.\n`);
t.push(`Source lue : ${ecrit(a.source) ? a.source : '**non dite** — un audit nomme ce qu\'il a lu, sinon il ne se vérifie pas'}.\n\n`);
// L'avertissement est en tête et pas en annexe : c'est la phrase qui empêche de lire le reste de
// travers, et un lecteur pressé ne lit que le début.
t.push(`> Ce rapport confronte un document écrit ailleurs aux ${total} règles du catalogue de Tizi.
> **Il ne juge pas une manière de travailler.** Une pratique est obligatoire, l'approche qui la réalise
> est locale : on n'audite jamais une approche contre une autre approche. Un écart est une question à
> poser à l'équipe, pas un défaut — et une règle peut être enfreinte quand la pragmatique de la
> situation l'exige, à condition que ce soit dit.
`);

t.push(`## En un coup d'œil\n\n`);
t.push(table(['Verdict', 'Règles', 'Ce que ça veut dire'], [
  ['**Constaté faux**', `${deStructure.length}`, `${faux.filter(f => f.rule in STRUCT_RULES).length} constat(s) : la règle avait de quoi lire, et elle a trouvé à reprendre`],
  ['**Constaté vrai**', `${vrais.length}`, 'elle avait de quoi lire et n\'a rien trouvé — ou ce qu\'elle surveille n\'existe pas ici, et « rien à reprocher » est alors exact'],
  ['**Non mesurable**', `${muettes.length}`, 'elle n\'a rien eu à lire. Ni vrai, ni faux : une case vide'],
  ['_Hors jeu_', `${horsJeu.length}`, '_ne s\'applique pas à ce document ou pas dans ce réglage — ne compte pas_'],
]));
t.push(`\nLes quatre lignes partitionnent le catalogue : ${deStructure.length} + ${vrais.length} + ${muettes.length} + ${horsJeu.length} = ${total}.\n`);
// Les règles de rédaction portent sur la FORME d'un énoncé — un terme non mesurable, une énumération
// ouverte, une exigence double. Elles ne sont pas au registre de structure et ne comptent donc dans
// aucune des quatre listes ; les taire laisserait croire que leurs constats n'existent pas.
t.push(`\nS'y ajoutent **${deRedaction.length} règle(s) de rédaction** (${faux.filter(f => !(f.rule in STRUCT_RULES)).length} constat(s)) : elles portent sur la forme d'un énoncé, pas sur la structure du document, et ne comptent dans aucune des quatre lignes ci-dessus.\n`);

t.push(`\n## Constaté faux — ${deStructure.length} règle(s) de structure, ${deRedaction.length} de rédaction, ${faux.length} constat(s)\n\n`);
t.push(faux.length
  ? table(['Règle', 'Sur quoi', 'Ce qui a été constaté'], faux.map(f => [`\`${f.rule}\``, cell(f.id), cell(f.message)]))
  : '_Aucun. Toute règle qui avait de quoi lire n\'a rien trouvé à reprendre._\n');

if (attente.length) {
  t.push(`\n### Parti et pas revenu — ${attente.length}\n\n`);
  t.push('Une question posée qui n\'a pas encore sa réponse n\'est ni tenue ni en échec : elle vit.\n\n');
  t.push(table(['Règle', 'Sur quoi', 'État'], attente.map(f => [`\`${f.rule}\``, cell(f.id), cell(f.message)])));
}

if (derogees.length) {
  t.push(`\n### Assumé par écrit — ${derogees.length}\n\n`);
  t.push('Ces constats portent une dérogation nommée dans le document audité. Elle vient de l\'équipe, pas de nous : un audit la montre, il ne la recompte pas comme un défaut.\n\n');
  t.push(table(['Règle', 'Sur quoi', 'La raison écrite'], derogees.map(f => [`\`${f.rule}\``, cell(f.id), cell(f.waived)])));
}

t.push(`\n## Non mesurable — ${muettes.length} règle(s)\n\n`);
t.push(`C'est la colonne qui manquait, et c'est elle qui rend l'audit honnête. **Ne pas savoir n'est pas constater** : une règle qui n'a rien eu à lire ne dit pas que tout va bien. Chacune nomme ce qu'elle aurait lu.\n\n`);
if (muettes.length) {
  // Groupées par lecture : sur un document étranger, vingt règles disent souvent trois choses — pas
  // de registre de parties prenantes, pas de sources, pas de trace de décision.
  const par = new Map();
  for (const f of muettes) {
    const cle = f.message.replace(/^non mesurée : /, '');
    par.set(cle, [...(par.get(cle) ?? []), f.rule]);
  }
  t.push(table(['Ce qu\'elles auraient lu', 'Règles'], [...par].sort((x, y) => y[1].length - x[1].length)
    .map(([quoi, regles]) => [cell(quoi), regles.length === 1 ? `\`${regles[0]}\` — ${libelle(regles[0])}` : regles.map(r => `\`${r}\``).join(', ')])));
  t.push(`\nUne lecture vide n'est pas toujours un reproche : un document écrit ailleurs ne porte pas la trace que Tizi tient de sa propre fabrication. Ce qui se lit ici, c'est **ce que l'audit n'a pas pu établir**, et pour quelle raison précise.\n`);
} else {
  t.push('_Aucune. Toutes les règles qui s\'appliquent à ce document ont eu de quoi se prononcer._\n');
}

t.push(`\n## Constaté vrai — ${vrais.length} règle(s)\n\n`);
t.push('Elles avaient de quoi lire et n\'ont rien trouvé à reprendre, ou ce qu\'elles surveillent n\'existe pas ici — pas de dérogation de seuil, donc pas de dérogation muette. C\'est un constat, pas un silence.\n\n');
t.push(vrais.length ? `${vrais.map(r => `\`${r}\``).join(' · ')}\n` : '_Aucune._\n');

// Ce que l'import n'a pas pu établir. Ce n'est pas un verdict sur le document : c'est une limite de
// l'audit, et elle se déclare. Même discipline qu'`adopt.mjs` : rien n'est déduit sans preuve.
const incertain = arr(a.uncertain);
t.push(`\n## Ce que l'import n'a pas pu établir — ${incertain.length}\n\n`);
t.push('Rien n\'est déduit sans preuve. Ce qui suit n\'est pas un défaut du document : c\'est la part de l\'audit qui n\'a pas de fondement, et la taire en ferait un rapport qui affirme plus qu\'il ne sait.\n\n');
t.push(incertain.length
  ? table(['Ce qui n\'a pas pu être établi', 'Pourquoi', 'Ce qui le lèverait'],
    incertain.map(u => [cell(u.what ?? u.quoi), cell(u.why ?? u.pourquoi), cell(u.resolve ?? u.lever)]))
  : '_L\'import ne déclare aucune incertitude. Sur un document écrit ailleurs, c\'est rare : vérifier que la liste est vide pour de bon, et non par oubli._\n');

if (arr(a.ecarts).length) {
  // Un écart d'approche n'est pas un défaut, et il n'a pas sa place dans « constaté faux ». Il a sa
  // place dans un rapport : c'est une question à poser à l'équipe.
  t.push(`\n## Écarts d'approche — ${arr(a.ecarts).length} question(s), aucun défaut\n\n`);
  t.push('Ce que l\'équipe fait autrement. Une pratique est obligatoire, son approche est locale : ces lignes sont des questions à lui poser, pas des reproches.\n\n');
  t.push(list(arr(a.ecarts).map(e => `**${cell(e.pratique ?? e.what)}** — ${cell(e.approche ?? e.how)}${ecrit(e.question) ? ` → ${cell(e.question)}` : ''}`)));
}

writeOut(join(root, 'audit.md'), t.join(''));
console.log(`Audit : ${deStructure.length} règle(s) de structure en défaut${deRedaction.length ? ` et ${deRedaction.length} de rédaction` : ''} (${faux.length} constats), ${vrais.length} constatées vraies, ${muettes.length} non mesurables, ${horsJeu.length} hors jeu.`);
if (!incertain.length) console.log('Aucune incertitude déclarée à l\'import : sur un document écrit ailleurs, c\'est à vérifier plutôt qu\'à croire.');
