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
//
// ── Ce que la première version rendait, et pourquoi elle a été refaite (9 novembre 2026) ──
// Mesurée sur un vrai BRD de 500 lignes écrit par un autre outil : **141 constats**, dont 125 — 89 % —
// venaient de QUATRE règles qui répétaient la même chose. « Aucune des 34 règles métier n'a de
// responsable » est un constat grave, peut-être le plus grave sur un corpus de règles de souscription ;
// l'écrire 34 fois le transforme en bruit. Trois défauts, tous corrigés ici :
//   1. le rapport répétait au lieu d'agréger — une absence qui porte sur TOUS les éléments de sa
//      famille est une absence de méthode, et elle se dit une fois, avec sa portée ;
//   2. il n'avait aucune hiérarchie — « personne ne tranche le périmètre » et « il y a un « et » dans
//      la phrase » tenaient la même ligne, triées par identifiant d'élément ;
//   3. il enfreignait sa propre doctrine : `L08` exigeait « doit / devra » sur 17 énoncés sur 17, alors
//      que le document tenait parfaitement une autre forme (« Disposer de… afin de… », BABOK). Une
//      règle de RÉDACTION qui parle sur tout un corpus ne décrit pas un défaut, elle décrit un STYLE.
// Et il ne disait rien de ce qu'un relecteur extérieur apporte de plus précieux : ce qui MANQUE, les
// zones d'ombre que le document n'a JAMAIS ouvertes, quoi reprendre et dans quel ordre, et ce que le
// document tient. Enfin, un code de règle seul ne dit rien à qui lit : chaque mention porte son libellé.
//
// Usage : node audit.mjs <state.yaml> [--json]
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, cell, table, list, loadState, writeOut, fail, today, ecrit, PHASE_NOM } from './lib/common.mjs';
import { verdicts, registresDe, STRUCT_RULES, TEXT_RULES, ZONES_TYPES, DOCUMENTS } from './lib/rules.mjs';

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
// Un code seul ne dit rien à qui lit le rapport : « L08 » n'est clair que pour qui tient le catalogue.
// Toute mention d'une règle passe par ici.
const nomme = r => `\`${r}\` — ${libelle(r)}`;

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
const struct = r => r in STRUCT_RULES;

// ── Portée d'un constat : un élément, ou toute une famille ? ─────────────────────────────────────
// Le préfixe d'identifiant est celui du document AUDITÉ — EX, RG, OM… —, pas une famille de Tizi : un
// document écrit ailleurs nomme ses éléments comme il veut, et un audit lui rend son vocabulaire.
const registres = registresDe(s);
const prefixeDe = id => (/^([A-Z]{1,4})-\d+$/.exec(String(id ?? '').trim()) ?? [])[1];
// Un couple (règle, préfixe) dont la règle a parlé sur TOUS les éléments du préfixe. En dessous de deux
// éléments, « tous » ne dit rien : un sur un n'est pas une méthode, c'est un cas.
const SEUIL = 2;
const couples = new Map();
for (const f of faux) {
  const p = prefixeDe(f.id);
  if (!p || !registres.has(p)) continue;
  const cle = `${f.rule}|${p}`;
  const vu = couples.get(cle) ?? { rule: f.rule, prefixe: p, ids: [], total: registres.get(p).size, message: f.message };
  if (!vu.ids.includes(f.id)) vu.ids.push(f.id);
  couples.set(cle, vu);
}
const systematiques = [...couples.values()]
  .filter(c => c.ids.length === c.total && c.total >= SEUIL)
  .sort((x, y) => y.total - x.total);
const clesSyst = new Set(systematiques.map(c => `${c.rule}|${c.prefixe}`));
// Ce qui MANQUE : une règle de structure qui parle sur toute une famille. Ce n'est pas N oublis, c'est
// une pratique que le document ne tient pas.
const manques = systematiques.filter(c => struct(c.rule));
// Un STYLE : la même mesure, sur une règle de rédaction. L'asymétrie est voulue, et c'est la doctrine
// du skill — une forme tenue partout est un choix d'écriture, une structure absente partout est un trou.
const styles = systematiques.filter(c => !struct(c.rule));
// Le reste : élément par élément, groupé par règle pour ne pas répéter son libellé.
const ponctuels = faux.filter(f => !clesSyst.has(`${f.rule}|${prefixeDe(f.id)}`));
const parRegle = m => {
  const g = new Map();
  for (const f of m) g.set(f.rule, [...(g.get(f.rule) ?? []), f]);
  return [...g].sort((x, y) => y[1].length - x[1].length);
};

// ── Les zones d'ombre que le document n'a jamais ouvertes ────────────────────────────────────────
// La typologie est celle du document audité (lib/rules.mjs, ZONES_TYPES). Un type qu'aucune question
// n'ouvre n'est pas un défaut en soi — mais c'est la question qu'un relecteur extérieur poserait.
const typologie = arr(ZONES_TYPES[s.document]);
const ouverts = new Set(arr(s.shadow_zones).map(z => String(z.type ?? '').trim()).filter(Boolean));
const jamais = typologie.filter(z => !ouverts.has(z.type));

// À reprendre, dans cet ordre. L'ordre est MÉCANIQUE et il est dit dans le rapport : une absence de
// méthode avant un cas isolé, la structure avant la forme, et la portée décroissante à l'intérieur de
// chaque groupe. Aucune gravité n'est écrite à la main : un second catalogue de gravités dériverait du
// premier, et c'est ce que ce dépôt refuse partout.
// Les identifiants se dédoublonnent : deux constats de la même règle sur le même élément — `S69` sur
// un énoncé qui porte deux chiffres — ne font pas deux éléments à reprendre.
const elements = fs => {
  const ids = [...new Set(fs.map(f => cell(f.id)))];
  return ids.slice(0, 8).join(', ') + (ids.length > 8 ? '…' : '');
};
const reprendre = [
  ...manques.map(c => ({ quoi: `${libelle(c.rule)} — sur **${c.total} \`${c.prefixe}-xxx\` sur ${c.total}**`, regle: c.rule, detail: c.message })),
  ...parRegle(ponctuels.filter(f => struct(f.rule))).map(([r, fs]) => ({
    quoi: `${libelle(r)} — ${new Set(fs.map(f => f.id)).size === 1 ? `sur ${cell(fs[0].id)}` : `sur ${new Set(fs.map(f => f.id)).size} élément(s) : ${elements(fs)}`}`, regle: r, detail: fs[0].message })),
  ...parRegle(ponctuels.filter(f => !struct(f.rule))).map(([r, fs]) => ({
    quoi: `${libelle(r)} — sur ${new Set(fs.map(f => f.id)).size} énoncé(s) : ${elements(fs)}`, regle: r, detail: fs[0].message })),
];

if (args.includes('--json')) {
  console.log(JSON.stringify({ document: s.document, faux, derogees, attente, muettes, vrais, horsJeu,
    manques: manques.map(c => ({ rule: c.rule, prefixe: c.prefixe, total: c.total })),
    styles: styles.map(c => ({ rule: c.rule, prefixe: c.prefixe, total: c.total })),
    jamaisOuvertes: jamais.map(z => z.type), reprendre, incertain: arr(a.uncertain) }, null, 2));
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

t.push(`\n## Ce qui manque — ${manques.length} absence(s) de méthode\n\n`);
t.push('Une absence qui porte sur **tous** les éléments d\'une même famille n\'est pas une série d\'oublis : c\'est une pratique que le document ne tient pas. Elle se dit donc **une fois**, avec sa portée — et la famille est nommée par le préfixe d\'identifiant du document audité, pas par le vocabulaire de Tizi.\n\n');
t.push(manques.length
  ? table(['Ce qui manque', 'Portée', 'Règle'], manques.map(c => [cell(libelle(c.rule)), `**${c.total} \`${c.prefixe}-xxx\` sur ${c.total}**`, `\`${c.rule}\``]))
  : '_Aucune. Aucune règle ne parle sur la totalité d\'une famille d\'éléments : ce qui a été constaté l\'a été cas par cas._\n');

t.push(`\n## Les zones d'ombre jamais ouvertes — ${jamais.length} type(s) sur ${typologie.length}\n\n`);
t.push(`Le document pose **${arr(s.shadow_zones).length} question(s)**, de ${ouverts.size} type(s). Ce tableau dit l'inverse : les types de question qu'il **ne pose pas**. Ce n'est pas un défaut — un type peut n'avoir aucune raison de s'ouvrir ici. C'est ce qu'un relecteur extérieur demanderait, et c'est la seule partie de ce rapport qui ne vient pas de ce qui est écrit, mais de ce qui ne l'est pas.\n\n`);
t.push(jamais.length
  ? table(['Type jamais ouvert', 'Signal typique', 'Ce qui le lèverait'], jamais.map(z => [`\`${z.type}\``, cell(z.signal), cell(z.action)]))
  : '_Aucun : le document a ouvert au moins une question de chacun des types que Tizi connaît pour ce document. C\'est rare._\n');

t.push(`\n## À reprendre, dans cet ordre — ${reprendre.length}\n\n`);
t.push('L\'ordre est **mécanique**, et le voici pour qu\'il se vérifie : une absence de méthode avant un cas isolé, la structure avant la forme, la portée décroissante à l\'intérieur de chaque groupe. Aucune gravité n\'est écrite à la main — un second catalogue de gravités dériverait du premier.\n\n');
t.push(reprendre.length
  ? table(['#', 'À reprendre', 'Ce que dit le constat'], reprendre.map((r, i) => [`${i + 1}`, `${cell(r.quoi)}<br/>\`${r.regle}\``, cell(r.detail)]))
  : '_Rien. Aucune règle qui avait de quoi lire n\'a trouvé à reprendre._\n');

t.push(`\n## En un coup d'œil\n\n`);
t.push(table(['Verdict', 'Règles', 'Ce que ça veut dire'], [
  ['**Constaté faux**', `${deStructure.length}`, `${faux.filter(f => struct(f.rule)).length} constat(s) : la règle avait de quoi lire, et elle a trouvé à reprendre`],
  ['**Constaté vrai**', `${vrais.length}`, 'elle avait de quoi lire et n\'a rien trouvé — ou ce qu\'elle surveille n\'existe pas ici, et « rien à reprocher » est alors exact'],
  ['**Non mesurable**', `${muettes.length}`, 'elle n\'a rien eu à lire. Ni vrai, ni faux : une case vide'],
  ['_Hors jeu_', `${horsJeu.length}`, '_ne s\'applique pas à ce document ou pas dans ce réglage — ne compte pas_'],
]));
t.push(`\nLes quatre lignes partitionnent le catalogue : ${deStructure.length} + ${vrais.length} + ${muettes.length} + ${horsJeu.length} = ${total}.\n`);
// Les règles de rédaction portent sur la FORME d'un énoncé — un terme non mesurable, une énumération
// ouverte, une exigence double. Elles ne sont pas au registre de structure et ne comptent donc dans
// aucune des quatre listes ; les taire laisserait croire que leurs constats n'existent pas.
t.push(`\nS'y ajoutent **${deRedaction.length} règle(s) de rédaction** (${faux.filter(f => !struct(f.rule)).length} constat(s)) : elles portent sur la forme d'un énoncé, pas sur la structure du document, et ne comptent dans aucune des quatre lignes ci-dessus.\n`);
if (systematiques.length) {
  const couvert = systematiques.reduce((n, c) => n + c.ids.length, 0);
  t.push(`\n**${faux.length} constat(s)** en tout, dont **${couvert} expliqués par ${systematiques.length} absence(s) de méthode ou choix d'écriture** : les lire un par un donnerait ${Math.round((couvert / Math.max(faux.length, 1)) * 100)} % de répétition, et c'est ce que faisait la première version de ce rapport.\n`);
}

if (styles.length) {
  t.push(`\n## Choix d'écriture, pas défauts — ${styles.length}\n\n`);
  t.push('Une règle de **rédaction** qui parle sur **tous** les énoncés d\'une famille ne décrit pas un défaut : elle décrit une forme que le document tient partout, donc un choix d\'écriture. La faire compter comme une série de fautes, ce serait auditer une approche contre une autre approche — ce que ce rapport s\'interdit en tête. Ces règles sont donc sorties des constats et posées ici, avec leur mesure.\n\n');
  t.push(table(['Règle', 'Ce qu\'elle attendait', 'Portée'], styles.map(c => [nomme(c.rule), cell(c.message), `**${c.total} \`${c.prefixe}-xxx\` sur ${c.total}**`])));
  t.push('\nÀ poser à l\'équipe comme une question, pas comme un reproche : cette forme est-elle délibérée ?\n');
}

t.push(`\n## Constaté faux — ${deStructure.length} règle(s) de structure, ${deRedaction.length} de rédaction, ${faux.length} constat(s)\n\n`);
if (ponctuels.length) {
  t.push('Les constats qui restent, élément par élément, groupés par règle pour ne pas répéter son libellé. Ce qui portait sur toute une famille est dit plus haut.\n\n');
  t.push(table(['Règle', 'Sur quoi', 'Ce qui a été constaté'], parRegle(ponctuels).flatMap(([r, fs]) =>
    fs.map((f, i) => [i === 0 ? nomme(r) : '', cell(f.id), cell(f.message)]))));
} else if (faux.length) {
  t.push('_Tous les constats portent sur une famille entière : ils sont dits plus haut, dans « ce qui manque » et « choix d\'écriture »._\n');
} else {
  t.push('_Aucun. Toute règle qui avait de quoi lire n\'a rien trouvé à reprendre._\n');
}

if (attente.length) {
  t.push(`\n### Parti et pas revenu — ${attente.length}\n\n`);
  t.push('Une question posée qui n\'a pas encore sa réponse n\'est ni tenue ni en échec : elle vit.\n\n');
  t.push(table(['Règle', 'Sur quoi', 'État'], attente.map(f => [nomme(f.rule), cell(f.id), cell(f.message)])));
}

if (derogees.length) {
  t.push(`\n### Assumé par écrit — ${derogees.length}\n\n`);
  t.push('Ces constats portent une dérogation nommée dans le document audité. Elle vient de l\'équipe, pas de nous : un audit la montre, il ne la recompte pas comme un défaut.\n\n');
  t.push(table(['Règle', 'Sur quoi', 'La raison écrite'], derogees.map(f => [nomme(f.rule), cell(f.id), cell(f.waived)])));
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
    .map(([quoi, regles]) => [cell(quoi), regles.map(nomme).join('<br/>')])));
  t.push(`\nUne lecture vide n'est pas toujours un reproche : un document écrit ailleurs ne porte pas la trace que Tizi tient de sa propre fabrication. Ce qui se lit ici, c'est **ce que l'audit n'a pas pu établir**, et pour quelle raison précise.\n`);
} else {
  t.push('_Aucune. Toutes les règles qui s\'appliquent à ce document ont eu de quoi se prononcer._\n');
}

t.push(`\n## Constaté vrai — ce que le document tient, ${vrais.length} règle(s)\n\n`);
t.push('Elles avaient de quoi lire et n\'ont rien trouvé à reprendre, ou ce qu\'elles surveillent n\'existe pas ici — pas de dérogation de seuil, donc pas de dérogation muette. C\'est un constat, pas un silence, et il se lit : une file de codes ne dit rien de ce qui a été vérifié.\n\n');
t.push(vrais.length ? table(['Règle', 'Ce qui a été vérifié sans rien trouver'], vrais.map(r => [`\`${r}\``, cell(libelle(r))])) : '_Aucune._\n');

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
console.log(`Audit : ${manques.length} absence(s) de méthode, ${reprendre.length} point(s) à reprendre, ${jamais.length} type(s) de zone d'ombre jamais ouvert(s) sur ${typologie.length}.`);
console.log(`  ${deStructure.length} règle(s) de structure en défaut${deRedaction.length ? ` et ${deRedaction.length} de rédaction` : ''} (${faux.length} constats), ${vrais.length} constatées vraies, ${muettes.length} non mesurables, ${horsJeu.length} hors jeu.`);
if (styles.length) console.log(`  ${styles.length} règle(s) de rédaction parlent sur tout un corpus : rendues comme un choix d'écriture, pas comme des défauts.`);
if (!incertain.length) console.log('Aucune incertitude déclarée à l\'import : sur un document écrit ailleurs, c\'est à vérifier plutôt qu\'à croire.');
