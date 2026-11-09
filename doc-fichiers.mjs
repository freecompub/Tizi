#!/usr/bin/env node
// Génère `documentation/fichiers-communs.md` : quel fichier est livré dans quel skill.
//
// Ce document SE GÉNÈRE, pour la même raison que `regles-de-controle.md` : la liste était écrite à la
// main dans le README et elle avait dérivé sur **six entrées** — `lib/rules.mjs` annoncé commun alors
// qu'il est dans cinq skills, `lib/checklists.mjs` dans trois, `block.mjs` et `cross-*.mjs` dans deux,
// `lint.mjs` annoncé propre aux quatre skills de document alors qu'`audit-builder` le porte aussi, et
// `lib/gates.mjs`, présent dans les huit, absent de la liste. Trouvé par l'audit indépendant du
// 8 novembre 2026 (constat C9), qui recommandait exactement ceci : un tableau de présence généré.
//
// Une liste de fichiers écrite à la main ne vieillit pas mieux qu'une liste de règles : elle se périme
// au premier skill ajouté, et on la croit. Rien n'est recopié ici — tout est lu sur le disque.
//
// Usage : node doc-fichiers.mjs [--verifier]
//   sans option : écrit le document      --verifier : code 1 si le document n'est plus à jour
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const RACINE = new URL('.', import.meta.url).pathname;
const SKILLS = join(RACINE, 'skills');
const SORTIE = join(RACINE, 'documentation', 'fichiers-communs.md');
const skills = readdirSync(SKILLS).filter(d => existsSync(join(SKILLS, d, 'SKILL.md'))).sort();

// Tous les fichiers d'un dossier d'un skill, chemins relatifs à ce dossier.
function fichiersDe(skill, sous) {
  const base = join(SKILLS, skill, sous);
  if (!existsSync(base)) return [];
  const out = [];
  const marche = dir => {
    for (const e of readdirSync(dir).sort()) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) marche(p);
      else out.push(relative(base, p).split('\\').join('/'));
    }
  };
  marche(base);
  return out;
}

// Un tableau de présence : une ligne par fichier, une colonne par skill, et le compte.
function presence(sous) {
  const par = new Map();
  for (const s of skills) for (const f of fichiersDe(s, sous)) par.set(f, [...(par.get(f) ?? []), s]);
  return [...par].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

const entete = ['Fichier', ...skills.map(s => s.replace(/-builder$/, '').replace('backlog-executor', 'backlog')), 'Dans'];
const ligne = ([f, ou]) => [`\`${f}\``, ...skills.map(s => (ou.includes(s) ? '✓' : '·')), `${ou.length}`];
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`,
  ...rows.map(r => `| ${r.join(' | ')} |`), ''].join('\n');

const out = [];
const h = (n, t) => out.push(`${'#'.repeat(n)} ${t}`, '');
const p = t => out.push(t, '');

h(1, 'Fichiers livrés, skill par skill');
p(`Document **généré** par \`node doc-fichiers.mjs\` — ne pas le modifier à la main. Il dit quel fichier est livré dans quel skill, et rien d'autre : l'**identité** des copies homonymes est garantie ailleurs, par \`tests/skills.test.mjs\`, qui compare les empreintes de tout fichier ou sous-agent portant le même nom dans deux skills.`);
p(`${skills.length} skills : ${skills.map(s => `\`${s}\``).join(', ')}. Dans les tableaux, « ✓ » veut dire livré, « · » absent, et la dernière colonne compte les skills qui le portent.`);

h(2, 'scripts/');
const scripts = presence('scripts');
const partout = scripts.filter(([, o]) => o.length === skills.length);
p(`${scripts.length} fichiers distincts, dont **${partout.length} présents dans les ${skills.length} skills**. Un script commun oublié dans un seul skill casse une installation partielle en silence : c'est arrivé avec \`adopt.mjs\`, que le point d'étape appelle et qui manquait au huitième skill.`);
out.push(table(entete, scripts.map(ligne)));

h(2, 'references/');
p('Deux références sont communes aux huit skills et vérifiées identiques — la continuité entre sessions et la forme d\'une question. Les autres références homonymes sont propres à chaque skill par construction : un council de BRD et un council de plan ne posent pas les mêmes questions.');
out.push(table(entete, presence('references').map(ligne)));

h(2, 'templates/ et agents/');
p('Le modèle d\'état d\'un skill, et ses sous-agents.');
for (const sous of ['templates', 'agents']) {
  const rows = presence(sous);
  if (!rows.length) continue;
  out.push(`**${sous}/**`, '');
  out.push(table(entete, rows.map(ligne)));
}
const sans = skills.filter(s => !fichiersDe(s, 'templates').length);
p(sans.length
  ? `Sans \`templates/\` : ${sans.map(s => `\`${s}\``).join(', ')} — ${sans.length === 1 ? 'il ne tient aucun état' : 'ils ne tiennent aucun état'} de document, ${sans.length === 1 ? 'il applique' : 'ils appliquent'} un plan déjà écrit.`
  : 'Tous les skills portent un modèle d\'état.');

const doc = `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
if (process.argv.includes('--verifier')) {
  let actuel = '';
  try { actuel = readFileSync(SORTIE, 'utf8'); } catch { /* absent */ }
  if (actuel === doc) { console.log(`${SORTIE} est à jour.`); process.exit(0); }
  console.error(`${SORTIE} n'est plus à jour : relance \`node doc-fichiers.mjs\`.`);
  process.exit(1);
}
writeFileSync(SORTIE, doc);
console.log(`${SORTIE} écrit : ${skills.length} skills, ${scripts.length} fichiers de scripts dont ${partout.length} partout.`);
