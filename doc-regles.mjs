#!/usr/bin/env node
// Génère `documentation/regles-de-controle.md` : toutes les règles de contrôle, étape par étape.
//
// Ce document SE GÉNÈRE. C'est la doctrine du dossier appliquée au dossier lui-même : « un document
// qui part se génère, il ne se rédige pas » (references/questions.md). Une liste de 117 règles écrite
// à la main dérive au premier chantier — et une liste de règles qui dérive est pire qu'une absence de
// liste, parce qu'on la croit. Rien n'est recopié ici : les énoncés sont ceux du catalogue, les
// conditions de porte celles de `lib/gates.mjs`, les seuils ceux de `COVERAGE_DEFAULTS`.
//
// Ce qui est lu à l'exécution : `STRUCT_RULES`, `TEXT_RULES`, `COVERAGE_DEFAULTS`, `PHASES`.
// Ce qui est lu dans le source : l'émetteur de chaque règle, le texte de ses messages, les libellés
// des conditions de porte, et ceux des portes de PR, de release et des garde-fous d'export.
//
// Usage : node doc-regles.mjs [--verifier]
//   sans option : écrit le document      --verifier : code 1 si le document n'est plus à jour
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STRUCT_RULES, TEXT_RULES, COVERAGE_DEFAULTS } from './skills/brd-builder/scripts/lib/rules.mjs';
import { PHASES, PHASE_NOM } from './skills/brd-builder/scripts/lib/common.mjs';
import { INDICATIF, gateConditions } from './skills/brd-builder/scripts/lib/gates.mjs';

const RACINE = new URL('.', import.meta.url).pathname;
const SORTIE = join(RACINE, 'documentation', 'regles-de-controle.md');
const lire = p => readFileSync(join(RACINE, p), 'utf8');
const SRC_REGLES = lire('skills/brd-builder/scripts/lib/rules.mjs');
const SRC_PORTES = lire('skills/brd-builder/scripts/lib/gates.mjs');

// ── Lecture du source ───────────────────────────────────────────────────────
// Un message est souvent un gabarit : `${m.pct} %` n'a pas de sens hors exécution. On remplace chaque
// interpolation par « … » — ce qui reste est la phrase que le lecteur verra, sans ses chiffres.
const gabarit = t => t.replace(/\$\{[^}]*\}/g, '…').replace(/…{2,}/g, '…').replace(/\\'/g, "'").replace(/\\`/g, '`').replace(/\s+/g, ' ').trim();

// Chaque ligne du catalogue, rattachée à la fonction qui la contient.
function parFonction(src) {
  const lignes = src.split('\n');
  let fn = '(module)';
  const out = [];
  for (const l of lignes) {
    const m = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=/.exec(l);
    if (m) fn = m[1] ?? m[2];
    out.push({ fn, l });
  }
  return out;
}
const LIGNES = parFonction(SRC_REGLES);

// Code de règle → { emetteurs, messages }. Un code peut être émis à plusieurs endroits : S09 l'est par
// cinq fonctions, et chaque message dit une chose différente.
// Lire un message demande un vrai lecteur, pas une expression régulière. Trois formes se présentent :
// le littéral simple, le gabarit avec interpolations — dont certaines en contiennent d'autres
// (`${status ? `état : ${status}` : '…'}`) —, et le ternaire, où le constat dit deux choses selon le
// cas (S101 : une porte franchie, ou un retour en arrière). Une expression régulière rendait une case
// vide pour S101 et S108, et du JavaScript brut pour l'autre. On parcourt donc les caractères : on
// garde le texte, on remplace chaque interpolation par « … », et on rend TOUTES les branches.
function messagesDe(texte) {
  const out = [];
  let i = 0;
  const litteral = (fin, gabarit) => {
    let t = '';
    while (i < texte.length) {
      const c = texte[i];
      if (c === '\\') { t += texte[i + 1] === 'n' ? ' ' : texte[i + 1]; i += 2; continue; }
      if (c === fin) { i += 1; return t; }
      if (gabarit && c === '$' && texte[i + 1] === '{') {
        // Sauter l'interpolation, accolades ET accents graves imbriqués compris.
        let p = 0; i += 1;
        do {
          if (texte[i] === '{') p += 1;
          else if (texte[i] === '}') p -= 1;
          else if (texte[i] === '`') { i += 1; litteral('`', true); continue; }
          i += 1;
        } while (i < texte.length && p > 0);
        t += '…';
        continue;
      }
      t += c; i += 1;
    }
    return t;
  };
  while (i < texte.length) {
    const c = texte[i];
    if (c === '`') { i += 1; out.push(litteral('`', true)); continue; }
    if (c === "'") { i += 1; out.push(litteral("'", false)); continue; }
    i += 1;
  }
  return out.map(t => t.replace(/…{2,}/g, '…').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
// La portée d'un `push` : du code de règle à la fermeture de l'objet, accolades équilibrées.
function porteeDuPush(src, depart) {
  let p = 0;
  for (let i = depart; i < src.length; i += 1) {
    if (src[i] === '{') p += 1;
    else if (src[i] === '}') { if (p === 0) return src.slice(depart, i); p -= 1; }
  }
  return src.slice(depart, depart + 2000);
}
const regles = new Map();
for (const m of SRC_REGLES.matchAll(/rule: '([A-Z]\d{2,3})'/g)) {
  const code = m[1];
  const fn = LIGNES[SRC_REGLES.slice(0, m.index).split('\n').length - 1]?.fn ?? '(module)';
  if (!regles.has(code)) regles.set(code, new Map());
  if (!regles.get(code).has(fn)) regles.get(code).set(fn, new Set());
  const portee = porteeDuPush(SRC_REGLES, m.index);
  const im = portee.indexOf('message:');
  if (im < 0) continue;
  for (const msg of messagesDe(portee.slice(im + 'message:'.length))) regles.get(code).get(fn).add(msg);
}
const emetteursDe = code => [...regles.get(code).keys()];

// Quelles ÉTAPES atteignent une fonction ? Résolu par le graphe d'appel, pas par une table tenue à la
// main : une table se désynchronise, un graphe se recalcule. `checkState` compose les contrôles
// communs aux quatre documents ; les quatre `checkXxx` sont les racines.
const RACINES = { checkBrd: 'brd', checkPrd: 'prd', checkSad: 'sad', checkPlan: 'plan' };
const DOCS = ['brd', 'prd', 'sad', 'plan'];
const appelants = new Map();
for (const { fn, l } of LIGNES) {
  for (const m of l.matchAll(/(?:\.\.\.|[^A-Za-z0-9_.])([a-zA-Z][A-Za-z0-9_]*)\s*\(/g)) {
    const cible = m[1];
    if (cible === fn) continue;
    if (!appelants.has(cible)) appelants.set(cible, new Set());
    appelants.get(cible).add(fn);
  }
}
function etapesDe(fn, vus = new Set()) {
  if (vus.has(fn)) return new Set();
  vus.add(fn);
  if (RACINES[fn]) return new Set([RACINES[fn]]);
  if (fn === 'checkState' || fn === '(module)') return new Set(DOCS);
  const out = new Set();
  for (const p of appelants.get(fn) ?? []) for (const d of etapesDe(p, vus)) out.add(d);
  return out.size ? out : new Set(DOCS);
}
const etapesDeRegle = code => {
  const out = new Set();
  for (const fn of emetteursDe(code)) for (const d of etapesDe(fn)) out.add(d);
  return [...out].sort((a, b) => DOCS.indexOf(a) - DOCS.indexOf(b));
};

// Les conditions de porte ne se PARSENT pas : on appelle `gateConditions` sur un état minimal, pour
// chaque document et chaque phase, et on lit les libellés qu'elle rend. Un parsing du source attrapait
// la première chaîne des tableaux d'aide — « problems », « perimetre » — et les présentait comme des
// conditions de porte. Appeler la fonction, c'est documenter ce qu'elle fait, pas ce qu'elle a l'air de faire.
function conditionsDePorte() {
  const out = {};
  for (const [doc, phases] of Object.entries(PHASES)) {
    out[doc] = {};
    for (const ph of phases) {
      const g = gateConditions({ document: doc, phase: ph });
      out[doc][ph] = g ? g.conditions.map(c => gabarit(c[0])) : [];
    }
  }
  return out;
}
// Les conditions présentes à TOUTES les portes d'un document : les zones d'ombre, et le lint pour les
// quatre documents que le catalogue de règles vérifie. Déduites par document, pas listées — et pas
// déduites globalement : l'étape 6 n'a pas de condition de lint, et une intersection sur les cinq
// documents aurait donc répété la ligne du lint à chacune des treize portes des quatre autres.
function conditionsCommunes(portes) {
  const out = {};
  for (const [doc, phases] of Object.entries(portes)) {
    const listes = Object.values(phases).filter(l => l.length);
    out[doc] = listes.length ? listes[0].filter(c => listes.every(l => l.includes(c))) : [];
  }
  return out;
}

// Les métriques de couverture, avec leur libellé.
const metriques = new Map([...SRC_REGLES.matchAll(/metric\('([a-z_]+)', '((?:[^'\\]|\\.)*)'/g)].map(m => [m[1], gabarit(m[2])]));

// Les portes de PR (étape 5), de release (étape 6) et les garde-fous d'export.
const libelles = (src, re) => [...src.matchAll(re)].map(m => [m[1], gabarit(m[2])]);
const dedoublonne = paires => [...new Map(paires).entries()].sort((a, b) => Number(a[0].slice(1)) - Number(b[0].slice(1)));
const PORTE_PR = dedoublonne(libelles(lire('skills/impl-builder/scripts/pr-gate.mjs'), /check\('(C\d+)', [`']((?:[^`'\\]|\\.)*)[`']/g));
const PORTE_RELEASE = dedoublonne(libelles(lire('skills/test-builder/scripts/release-matrix.mjs'), /\['(R\d+)', [`']((?:[^`'\\]|\\.)*)[`']/g));
// Les garde-fous : la LISTE vient du commentaire qui les énumère — il est la seule source qui porte
// `G5`, lequel n'a pas de détecteur parce qu'il est tenu par construction (seuls les éléments validés
// sont exportés). Le libellé vient du détecteur quand il en existe un. Sans ça, la table en annonçait
// cinq pour six, et le seul garde-fou qui ne se détecte pas était celui qui disparaissait.
const SRC_OPS = lire('skills/plan-builder/scripts/plan-operations.mjs');
const GARDE_FOUS = (() => {
  const enumere = /^\/\/ (G1 .*?)\.$/ms.exec(SRC_OPS.slice(SRC_OPS.indexOf('// G1 ')).replace(/\n\/\/ /g, ' '));
  const liste = [...(enumere?.[1] ?? '').matchAll(/(G\d)\s+([^,]+?)(?=,\s*G\d|$)/g)].map(m => [m[1], gabarit(m[2])]);
  const detecte = new Map([...libelles(SRC_OPS, /hit\('(G\d)', [A-Z]+, '((?:[^'\\]|\\.)*)'/g),
    ...libelles(SRC_OPS, /guard: '(G\d)', item: key, field, message: [`']((?:[^`'\\]|\\.)*)[`']/g)]);
  return liste.map(([c, intitule]) => [c, intitule, detecte.get(c) ?? '']);
})();


// ── Rendu ───────────────────────────────────────────────────────────────────
const ETAPES = [
  { n: 1, doc: 'brd', titre: 'Besoin métier (BRD)', dossier: 'brd/<slug>/', skill: 'brd-builder' },
  { n: 2, doc: 'prd', titre: 'Produit (PRD)', dossier: 'prd/<slug>/', skill: 'prd-builder' },
  { n: 3, doc: 'sad', titre: 'Conception (SAD)', dossier: 'sad/<slug>/', skill: 'sad-builder' },
  { n: 4, doc: 'plan', titre: 'Planification', dossier: 'plan/<slug>/', skill: 'plan-builder' },
  { n: 5, doc: 'impl', titre: 'Implémentation', dossier: 'impl/<slug>/', skill: 'impl-builder' },
  { n: 6, doc: 'test', titre: 'Vérification de release', dossier: 'qa/<slug>/', skill: 'test-builder' },
];
const PORTES = conditionsDePorte();
const COMMUNES = conditionsCommunes(PORTES);
const cell = v => String(v ?? '—').replace(/\|/g, '\\|');
const table = (entetes, lignes) => (lignes.length
  ? [`| ${entetes.join(' | ')} |`, `|${entetes.map(() => '---').join('|')}|`, ...lignes.map(r => `| ${r.map(cell).join(' | ')} |`), ''].join('\n')
  : '_Aucune._\n');

// Les règles d'une étape, dans l'ordre de leur code. Celles qui ne concernent qu'un document sont
// listées chez lui ; celles qui portent sur les quatre sont dans la section commune, une seule fois.
const codes = [...regles.keys()].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
const propres = doc => codes.filter(c => { const e = etapesDeRegle(c); return e.length < DOCS.length && e.includes(doc); });
const communes = codes.filter(c => etapesDeRegle(c).length === DOCS.length);
const NOM_ETAPE = { brd: '1', prd: '2', sad: '3', plan: '4' };
// Les messages que CETTE étape voit : une règle partagée dit souvent autre chose ailleurs. `S01` parle
// d'indicateur et de cible au BRD, de KPI et de cible au PRD — les deux dans une seule case ne se lisent pas.
const messagesPour = (c, doc) => [...new Set(emetteursDe(c).filter(fn => etapesDe(fn).has(doc))
  .flatMap(fn => [...regles.get(c).get(fn)]))].join(" · ") || '—';
const ligneRegle = (c, doc) => {
  const autres = etapesDeRegle(c).filter(d => d !== doc).map(d => NOM_ETAPE[d]);
  return [`\`${c}\``, STRUCT_RULES[c] ?? '—', messagesPour(c, doc), autres.length ? `aussi étape ${autres.join(', ')}` : '—'];
};
const maxCode = Math.max(...codes.map(c => Number(c.slice(1))));

const out = [];
const h = (n, t) => out.push(`${'#'.repeat(n)} ${t}`, '');
const p = t => out.push(t, '');

h(1, "Règles de contrôle, étape par étape");
p("**Ce document est généré par `doc-regles.mjs`. Ne le modifie pas à la main.** Une liste de 117 règles écrite à la main dérive au premier changement du catalogue, et une liste qui dérive est pire qu'une absence de liste : on la croit. Les énoncés ci-dessous sont ceux du catalogue (`skills/*/scripts/lib/rules.mjs`), les conditions de porte celles de `lib/gates.mjs`, les seuils ceux de `COVERAGE_DEFAULTS`. Pour le régénérer : `node doc-regles.mjs`. Pour vérifier qu'il est à jour : `node doc-regles.mjs --verifier`.");
p(`Au total : **${codes.length} règles de structure** (\`S00\`–\`S${maxCode}\`), **${TEXT_RULES.length} règles de rédaction** (\`L01\`–\`L0${TEXT_RULES.length}\`), **${PORTE_PR.length} conditions** à la porte de PR, **${PORTE_RELEASE.length}** à la porte de release, **${GARDE_FOUS.length} garde-fous** d'export, et les conditions calculées des portes de phase des cinq documents à phases.`);

h(2, "Comment lire une règle");
p("Une **règle de structure** (`Sxx`) porte sur la forme de l'état : un champ manquant, un renvoi mort, un compte qui ne concorde pas. Une **règle de rédaction** (`Lxx`) porte sur le texte d'un énoncé. Les deux sont des **avertissements** : elles ne bloquent jamais, elles informent l'auteur au moment où il écrit. Elles sont rendues par `lint.mjs`, comptées par `status.mjs`, et reprises dans le document généré.");
p("Une **condition de porte** est autre chose : elle ne crie pas pendant le travail, elle se compte au moment de changer de phase. C'est pourquoi `S04` et `S05` — critère d'acceptation et priorité d'une exigence — sont dus à la porte de Define et pas pendant : les critères s'écrivent à l'étape 3 et les priorités s'arbitrent à l'étape 4, et un contrôle qui crie pendant le travail qu'il prescrit s'apprend à s'ignorer.");
p("Une condition a **trois** états — tenue, en échec, **non mesurée** — et une condition non mesurée ne s'affiche jamais ✓ : une absence de mesure n'est pas une réussite. Ce qui ne se calcule pas n'est pas dans la porte : « le MVP satisfait les critères », « assez de stories sont prêtes », « les participants se reconnaîtraient dans la synthèse » restent dans les fichiers de phase et se tranchent avec l'utilisateur. Le compte affiché dit « n tenues sur m mesurées », jamais « la porte est franchie » — **le passage se décide avec l'utilisateur, jamais seul**.");
p("**Toute règle se dérogue, et une dérogation porte sa raison.** Un avertissement se dérogue sur l'élément qu'il concerne (`lint_waivers: [{ rule, reason }]`) ou, s'il ne porte sur aucun élément — une collection, un fichier —, à la racine de l'état avec son `id`. Sans raison écrite, la dérogation ne compte pas : elle est signalée comme un silence. Un **seuil** se dérogue dans `waivers: [{ metric, reason, approved_by }]`, et là les deux sont exigés, parce que ce qui est en jeu est une approbation. Une règle dérogée ne disparaît pas : elle change de liste et part dans le dossier de revue.");

h(2, "Règles de rédaction (`L01`–`L08`)");
p("Elles portent sur le texte des énoncés, dans les cinq documents, selon le type d'élément : `BR` exigence métier, `FR` exigence fonctionnelle, `NFR` exigence non fonctionnelle, `RG` règle métier, `AC` critère d'acceptation, `OBJ` objectif métier, `GOAL` objectif produit, `AD` moteur architectural.");
out.push(table(['Code', 'Porte sur', 'Énoncé du constat'], TEXT_RULES.map(r => [`\`${r.id}\``, r.applies.map(a => `\`${a}\``).join(', '), gabarit(String(r.message('…')))])));

for (const e of ETAPES) {
  h(2, `Étape ${e.n} — ${e.titre}`);
  p(`Dossier \`${e.dossier}\` · skill \`${e.skill}\` · document \`${e.doc}\`${e.doc === 'test' ? " — trois noms pour une étape : le dossier dit `qa/`, le document dit `test`, le skill dit `test-builder`, et il n'y a pas de quatrième nom à chercher" : ''}`);

  const phases = PHASES[e.doc] ?? [];
  if (phases.length) {
    h(3, "Portes de phase");
    const note = e.doc === 'brd' ? " `close` n'est pas une phase de plus : c'est un terme, pour une opportunité jetée ou découpée."
      : e.doc === 'plan' ? " Refine, Schedule et Review se répètent à chaque cycle : le parcours réel se lit dans `phase_log`, pas dans le rang de la phase courante."
        : '';
    p(`Phases, dans l'ordre : ${phases.map(x => `**${PHASE_NOM[x]}**`).join(' → ')}.${note}`);
    p("Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.");
    for (const ph of phases) {
      const conds = (PORTES[e.doc]?.[ph] ?? []).filter(c => !(COMMUNES[e.doc] ?? []).includes(c));
      if (!conds.length) continue;
      const suivante = phases[phases.indexOf(ph) + 1];
      h(4, `Sortie de ${PHASE_NOM[ph]}${suivante ? ` — vers ${PHASE_NOM[suivante]}` : ''}`);
      out.push(conds.map(c => `- ${c}`).join('\n'), '');
    }
    const plus = COMMUNES[e.doc] ?? [];
    if (plus.length) p(`**À toutes les portes de cette étape, en plus :**\n${plus.map(c => `- ${c}`).join('\n')}`);
  }

  const mien = propres(e.doc);
  if (mien.length) {
    h(3, `Règles de structure de l'étape ${e.n} (${mien.length})`);
    p("Hors celles qui portent sur les quatre documents, listées plus bas. La dernière colonne dit quand une règle vaut aussi ailleurs — son énoncé y est souvent différent.");
    out.push(table(['Code', 'Objet', 'Ce que dit le constat', 'Portée'], mien.map(c => ligneRegle(c, e.doc))));
  }

  const cov = COVERAGE_DEFAULTS[e.doc];
  if (cov) {
    h(3, "Métriques de couverture et seuils par défaut");
    p("Mesurées sur l'état, affichées dans le document généré et dans le handoff. Un seuil se règle par projet dans `thresholds` ; non atteint, il se corrige ou s'assume par une dérogation nommée (`S54`, `S106`). Un seuil à **0** ne compare rien : c'est un renoncement, et il passe par la même dérogation (`S105`). Une métrique **indicative** se lit et ne se juge pas — seul le catalogue peut la déclarer telle, avec sa raison.");
    out.push(table(['Métrique', 'Mesure', 'Seuil par défaut'], Object.entries(cov).map(([id, s]) => [`\`${id}\``, metriques.get(id) ?? '—', s === INDICATIF ? '_indicatif_' : `${s} %`])));
  }

  if (e.doc === 'impl') {
    h(3, `Porte de PR (${PORTE_PR.length} conditions)`);
    p("Calculée par `pr-gate.mjs` sur la tâche en cours. Chaque condition se lit dans les rapports et dans l'état ; aucune ne se déclare à la main. Une tâche ne se fusionne pas sur une porte fermée sans une dérogation nommée.");
    out.push(table(['Code', 'Condition'], PORTE_PR.map(([c, l]) => [`\`${c}\``, l])));
    p("L'étape 5 n'a **pas** de phases : un lot de tâches n'a pas de phase commune, et chaque tâche porte son statut (`comprendre`, `rouge`, `vert`, `verification`, `en_revue`, `fusionnee`, `bloquee`). Le catalogue de règles ne la vérifie pas : un état d'implémentation se vérifie avec `pr-gate.mjs` et `trace-check.mjs`, et `S00` refuse de lui appliquer un catalogue qui n'est pas le sien — un rapport faux coûte plus cher qu'un refus.");
  }
  if (e.doc === 'test') {
    h(3, `Porte de release (${PORTE_RELEASE.length} conditions)`);
    p("Calculée par `release-matrix.mjs` depuis le plan figé et les rapports collectés. **Trois verdicts** : ouverte, fermée, et _incomplète_ — une condition « ? » n'est pas satisfaite, elle n'a pas été mesurée. L'approbation de la release reste une déclaration humaine, et aucune n'est déduite de la présence du rapport.");
    out.push(table(['Code', 'Condition'], PORTE_RELEASE.map(([c, l]) => [`\`${c}\``, l])));
    p("Une exigence non prouvée se corrige, ou s'assume par une dérogation dans `waivers` — qui ne compte que si elle dit **pourquoi** et **qui l'a approuvée**. Le catalogue de règles ne vérifie pas cette étape (`S00`) : un état de tests se vérifie avec `release-matrix.mjs`.");
  }
}

h(2, `Règles de structure communes aux quatre documents (${communes.length})`);
p("Elles s'appliquent au BRD, au PRD, à la conception et au plan. Les étapes 5 et 6 ne reçoivent pas ce catalogue.");
out.push(table(['Code', 'Objet', 'Ce que dit le constat'], communes.map(c => ligneRegle(c, 'brd').slice(0, 3))));

h(2, `Garde-fous de l'export (${GARDE_FOUS.length})`);
p("Appliqués par `plan-operations.mjs` au contenu qui sort du dépôt vers un outil tiers (GitHub, Jira). Ils masquent ou signalent **avant** l'export : ce qui part ne revient pas. `G5` n'a pas de détecteur — il est tenu par construction, puisque seuls les éléments validés sont exportés.");
out.push(table(['Code', 'Garde-fou', 'Ce que dit le constat'], GARDE_FOUS.map(([c, intitule, msg]) => [`\`${c}\``, intitule, msg || '_tenu par construction_'])));

h(2, "Index des règles de structure");
p("Chaque règle, les étapes où elle s'applique, et la fonction du catalogue qui l'émet. Les étapes sont déduites du graphe d'appel, pas d'une table tenue à la main.");
out.push(table(['Code', 'Étapes', 'Objet', 'Émise par'], codes.map(c => [`\`${c}\``,
  etapesDeRegle(c).map(d => NOM_ETAPE[d]).join(', ') || '—', STRUCT_RULES[c] ?? '—',
  emetteursDe(c).sort().map(f => `\`${f}\``).join(', ')])));

const doc = `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
if (process.argv.includes('--verifier')) {
  let actuel = '';
  try { actuel = readFileSync(SORTIE, 'utf8'); } catch { /* absent */ }
  if (actuel === doc) { console.log(`${SORTIE} est à jour.`); process.exit(0); }
  console.error(`${SORTIE} n'est plus à jour : relance \`node doc-regles.mjs\`.`);
  process.exit(1);
}
writeFileSync(SORTIE, doc);
console.log(`${SORTIE} écrit : ${codes.length} règles de structure, ${TEXT_RULES.length} de rédaction, ${PORTE_PR.length} conditions de PR, ${PORTE_RELEASE.length} de release, ${GARDE_FOUS.length} garde-fous.`);
