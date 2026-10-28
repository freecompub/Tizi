#!/usr/bin/env node
// Génère brd/<slug>/brd.md à partir de brd/<slug>/state.yaml.
// state.yaml est la source de vérité : brd.md est écrasé à chaque génération.
// Usage : node render-brd.mjs <chemin/vers/state.yaml> [--include-proposed]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { humanReviewFooter, shLabel } from './lib/common.mjs';
import { checkBrd, coverage, evidenceOf, brSources } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
const includeProposed = args.includes('--include-proposed');
if (!statePath) {
  console.error('Usage : node render-brd.mjs <state.yaml> [--include-proposed]');
  process.exit(2);
}

let s;
try {
  s = yaml.load(readFileSync(statePath, 'utf8')) ?? {};
} catch (e) {
  console.error(`Lecture de ${statePath} impossible : ${e.message}`);
  process.exit(1);
}

// ── utilitaires ─────────────────────────────────────────────
const arr = v => (Array.isArray(v) ? v : []);
const txt = v => (v === undefined || v === null || v === '' ? '—' : String(v));
const cell = v => txt(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const kept = item => item && (item.status === 'validé' || (includeProposed && item.status === 'proposé'));
const mark = item => (item.status === 'proposé' ? ' *(proposé)*' : '');
const table = (headers, rows) =>
  rows.length === 0
    ? '_Aucun élément._\n'
    : [`| ${headers.join(' | ')} |`, `|${headers.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n') + '\n';
const list = items => (items.length ? items.map(i => `- ${i}`).join('\n') + '\n' : '_Aucun élément._\n');
const mm = t => String(t ?? '').replace(/"/g, "'").replace(/\r?\n/g, ' ');
const byId = coll => new Map(arr(coll).map(x => [x.id, x]));

const sh = byId(s.stakeholders);
const bcs = byId(s.candidate_needs);
const objs = arr(s.objectives).filter(kept);
const brs = arr(s.business_requirements).filter(kept);
const rgs = arr(s.business_rules).filter(kept);
const dds = arr(s.decisions).filter(kept);
const shName = id => shLabel(s, id);   // même rendu que partout ailleurs : « Samir (SH-01) »

const priorities = [['must', 'Must'], ['should', 'Should'], ['could', 'Could'], ['wont', "Won't"]];
const prLabel = p => (priorities.find(([k]) => k === p)?.[1] ?? 'Non priorisée');

const out = [];
const h = (level, t) => out.push(`${'#'.repeat(level)} ${t}\n`);
const p = t => out.push(`${t}\n`);

// ── en-tête ─────────────────────────────────────────────────
const ini = s.initiative ?? {};
h(1, `BRD — ${txt(ini.name)}`);
p(`**Version** : ${txt(s.governance?.version)} — **Statut** : ${txt(s.governance?.status)}\n`);
// Le fichier du dossier et la copie figée dans `versions/` étaient IDENTIQUES à l'octet près,
// en-tête comprise : rien ne disait lequel était figé et lequel allait dériver à la prochaine
// modification de l'état. Qui ouvrait l'un croyait lire ce qui était parti en revue.
// `freeze-version.mjs` réécrit cette ligne dans la copie immuable qu'il dépose.
p(`> **Copie de travail** — régénérée depuis \`state.yaml\` le ${new Date().toISOString().slice(0, 10)}, et réécrite à chaque génération. Ne la modifie pas directement : toute correction passe par l'état. Les versions figées, s'il y en a, sont dans \`versions/\`.\n`);
if (includeProposed) p('> **Brouillon de travail** : inclut les éléments au statut *proposé*, non encore validés.');

const sec = s.brd_sections ?? {};
const secLabels = { context: 'Contexte et problème', objectives: 'Objectifs et indicateurs', stakeholders: 'Parties prenantes', processes: 'Processus', requirements: 'Exigences métier', business_rules: 'Règles métier', constraints: 'Contraintes', assumptions_risks: 'Hypothèses et risques', decisions: 'Décisions', scope: 'Périmètre', glossary: 'Glossaire' };
h(2, 'Statut du document');
p(table(['Section', 'Statut'], Object.entries(secLabels).map(([k, l]) => [l, sec[k] ?? 'à rédiger'])));
const pendingObj = arr(s.objectives).filter(o => o.status === 'proposé').length;
const pendingBr = arr(s.business_requirements).filter(b => b.status === 'proposé').length;
const pendingRg = arr(s.business_rules).filter(b => b.status === 'proposé').length;
if (!includeProposed && (pendingObj || pendingBr || pendingRg)) p(`_En attente de validation, non inclus : ${pendingObj} objectif(s), ${pendingBr} exigence(s), ${pendingRg} règle(s) métier._\n`);

// ── Opportunité ─────────────────────────────────────────────
const opp = s.opportunity ?? {}, cv = opp.canvas ?? {};
h(2, 'Opportunité');
if (opp.request?.verbatim) p(`**Demande initiale** (${({ figee: 'figée', fluide: 'fluide' })[opp.request.classification] ?? txt(opp.request.classification)}) : « ${opp.request.verbatim} »${opp.request.presumed_solution ? ` — solution présumée : ${opp.request.presumed_solution}` : ''}\n`);
p(table(['Case du canevas', 'Contenu'], [
  ['Problèmes', arr(cv.problems).join(' ; ')], ['Utilisateurs et clients', arr(cv.users).join(' ; ')], ['Solutions aujourd\'hui', arr(cv.solutions_today).join(' ; ')],
  ['Valeur pour l\'utilisateur', cv.user_value], ['Mesures côté utilisateur', arr(cv.user_metrics).join(' ; ')], ['Adoption', cv.adoption],
  ['Problème de l\'organisation', cv.business_problem], ['Mesures côté organisation', arr(cv.business_metrics).join(' ; ')], ['Budget', cv.budget],
]));
p(`**Décision** : ${txt(opp.decision)}${opp.decided_by ? ` — rendue par ${shName(opp.decided_by)}${opp.date ? ` le ${opp.date}` : ''}` : ''}${opp.reason ? ` — ${opp.reason}` : ''}\n`);

// ── 1. Contexte et problème ─────────────────────────────────
h(2, '1. Contexte et problème');
p(`**Déclencheur** : ${txt(ini.trigger)}\n`);
p(`**Problème** : ${txt(s.problem?.statement)}\n`);
// `symptoms`, `impact`, `scope.in`, `scope.out` et `org_impacts` étaient listés tels quels. Le gabarit
// ne documentait pas leur forme, l'agent y a mis `{ text, source }` — comme partout ailleurs dans le
// modèle — et le document livré portait **dix `[object Object]`** : sept symptômes et trois impacts,
// tous renseignés et sourcés dans l'état, illisibles dans le BRD figé et parti à cinq relecteurs.
// `phrase` lit la forme documentée et tolère une chaîne nue, pour les dossiers écrits avant.
const phrase = x => (x === null || typeof x !== 'object'
  ? txt(x)
  : `${x.type ? `**${txt(x.type)}** — ` : ''}${txt(x.text ?? x.event)}${x.reason ? ` — ${x.reason}` : ''}${x.source ? ` (${x.source})` : ''}`);
if (arr(s.problem?.symptoms).length) { p('**Symptômes**\n'); p(list(arr(s.problem.symptoms).map(phrase))); }
if (arr(s.problem?.impact).length) { p('**Impact**\n'); p(list(arr(s.problem.impact).map(phrase))); }

// ── 2. Objectifs et indicateurs ─────────────────────────────
h(2, '2. Objectifs et indicateurs');
p(table(['ID', 'Objectif', 'Indicateur', 'Actuel', 'Cible', 'Échéance', 'Responsable'],
  objs.map(o => [o.id + mark(o), o.statement, o.indicator, o.baseline, o.target, o.deadline, shName(o.owner)])));
const im = arr(s.impact_map).filter(e => objs.some(o => o.id === e.objective));
if (im.length) {
  h(3, 'Impact map');
  const lines = ['```mermaid', 'flowchart LR'];
  const seen = new Set();
  const node = (id, label, shape = ['[', ']']) => {
    if (!seen.has(id)) { lines.push(`  ${id}${shape[0]}"${mm(label)}"${shape[1]}`); seen.add(id); }
    return id;
  };
  im.forEach((e, i) => {
    const o = objs.find(x => x.id === e.objective);
    const on = node(e.objective.replace(/-/g, '_'), `${e.objective} : ${o.statement}`, ['([', '])']);
    const an = node(`A${i}`, sh.get(e.actor)?.role || sh.get(e.actor)?.name || e.actor);
    const imn = node(`I${i}`, e.impact, ['{{', '}}']);
    lines.push(`  ${on} --> ${an} --> ${imn}`);
    arr(e.requirements).filter(r => brs.some(b => b.id === r)).forEach(r => {
      lines.push(`  ${imn} --> ${node(r.replace(/-/g, '_'), r)}`);
    });
  });
  lines.push('```');
  p(lines.join('\n') + '\n');
}

// ── 3. Parties prenantes ────────────────────────────────────
h(2, '3. Parties prenantes');
p(table(['ID', 'Nom', 'Rôle', 'Impact', 'Pouvoir', 'Influence', 'Implication', 'Statut'],
  arr(s.stakeholders).map(x => [x.id, x.name, x.role + (x.represents ? ` (représente : ${x.represents})` : ''), x.impact, x.power, x.influence, x.quadrant, x.status])));
const dr = arr(s.decision_rights);
if (dr.length) {
  h(3, 'Droits de décision');
  p(table(['Domaine', 'Décideur', 'Recours', 'Confirmé par'], dr.map(d => [d.domain, shName(d.decider), d.escalation ? shName(d.escalation) : '—', d.confirmed_by ? shName(d.confirmed_by) : '_non confirmé_'])));
}

// ── 4. Processus ────────────────────────────────────────────
h(2, '4. Processus actuel et processus cible');
h(3, 'Processus actuel');
// `current_process` était une liste nue quand `target_process` est un objet portant `.events`. L'agent
// a appliqué la symétrie — `current_process.events` —, le rendu lisait la liste, et la section
// « Processus actuel » annonçait « Aucun élément » dans un BRD validé dont l'état tenait cinq étapes
// sourcées. Un trou se voit ; du contenu invisible, non. Le gabarit est aligné, le rendu lit les deux.
const evenements = x => (Array.isArray(x) ? x : arr(x?.events));
p(list(evenements(s.current_process).map(e => `${txt(e.event)}${e.actor ? ` — ${shName(e.actor)}` : ''}${e.source ? ` (${e.source})` : ''}`)));
h(3, 'Processus cible');
const tev = arr(s.target_process?.events);
p(table(['Événement', 'Acteur', 'Changement'], tev.map(e => [e.event, e.actor ? shName(e.actor) : '—', e.change])));
if (tev.length) {
  const lines = ['```mermaid', 'flowchart LR'];
  tev.filter(e => e.change !== 'supprimé').forEach((e, i, a) => {
    lines.push(`  E${i}["${mm(e.event)}"]`);
    if (i > 0) lines.push(`  E${i - 1} --> E${i}`);
  });
  lines.push('```');
  p(lines.join('\n') + '\n');
}
if (arr(s.target_process?.org_impacts).length) { h(3, 'Impacts organisationnels'); p(list(arr(s.target_process.org_impacts).map(phrase))); }

// ── 5. Exigences métier ─────────────────────────────────────
h(2, '5. Exigences métier');
p(table(['Priorité', 'Nombre'], [...priorities, ['', 'Non priorisée']].map(([k, l]) => [l, brs.filter(b => (b.priority || '') === k).length]).filter(r => r[1] > 0)));
for (const b of brs) {
  h(3, `${b.id} — ${prLabel(b.priority)}${mark(b)}`);
  p(`${txt(b.statement)}\n`);
  p(`**Objectifs** : ${arr(b.objectives).join(', ') || '—'}${arr(b.business_rules).length ? ` — **Règles** : ${arr(b.business_rules).join(', ')}` : ''}\n`);
  { const ev = evidenceOf(s, brSources(s, b), [b.id, ...arr(b.from_needs)]); p(`**Preuve** : ${ev.class} (${ev.sources} source${ev.sources > 1 ? 's' : ''})${ev.unresolved ? ' — question ouverte' : ''}\n`); }
  p('**Critères d’acceptation**\n');
  p(list(arr(b.acceptance)));
  if (b.rationale) p(`**Justification de la priorité** : ${b.rationale}\n`);
}

// ── 6. Règles métier ────────────────────────────────────────
h(2, '6. Règles métier');
p('_Directives que le métier contrôle et que les exigences doivent respecter. Elles ne sont pas des exigences et peuvent évoluer indépendamment._\n');
const enfLabel = { stricte: 'stricte', derogation_autorisee: 'dérogation par acteur habilité', derogation_justifiee: 'dérogation avec justification', indicative: 'indicative' };
p(table(['ID', 'Règle', 'Type', 'Application', 'Responsable', 'Sources', 'Exigences'],
  rgs.map(r => [r.id + mark(r), r.statement, r.kind === 'definition' ? 'définition' : txt(r.kind), r.kind === 'comportement' ? (enfLabel[r.enforcement] ?? txt(r.enforcement)) : '—', shName(r.owner),
    arr(r.sources).map(x => (x.ref ? `${x.ref}${x.location ? ` (${x.location})` : ''}` : x)).join(', '), brs.filter(b => arr(b.business_rules).includes(r.id)).map(b => b.id).join(', ') || '—'])));

// ── 7. Contraintes ──────────────────────────────────────────
h(2, '7. Contraintes');
p(table(['Type', 'Contrainte', 'Implication', 'Source'], arr(s.constraints).map(c => [c.type, c.text, c.implication, c.source])));
const trs = arr(s.transition_requirements).filter(kept);
if (trs.length) {
  h(3, 'Exigences de transition');
  p('_Exigences temporaires pour passer de l\'existant à la cible ; elles disparaissent une fois la transition faite._\n');
  p(table(['ID', 'Type', 'Exigence', 'Concernés', 'Achevée quand'], trs.map(t => [t.id + mark(t), String(t.kind ?? '').replace(/_/g, ' '), t.text, arr(t.stakeholders).map(shName).join(', '), t.done_when])));
}
if (arr(s.dependencies).length) { h(3, 'Dépendances'); p(table(['Dépendance', 'Responsable'], arr(s.dependencies).map(d => [d.text, d.owner]))); }

// ── 7. Hypothèses et risques ────────────────────────────────
h(2, '8. Hypothèses et risques');
h(3, 'Hypothèses');
p(table(['ID', 'Hypothèse', 'Fondement', 'Statut'], arr(s.hypotheses).filter(x => x.status !== 'infirmée').map(x => [x.id, x.text, x.basis, x.status])));
const assumed = arr(s.shadow_zones).filter(z => z.status === 'assumée');
if (assumed.length) { h(3, 'Zones d’ombre assumées'); p(table(['ID', 'Question', 'Raison'], assumed.map(z => [z.id, z.question, z.resolution]))); }
h(3, 'Risques');
p(table(['ID', 'Risque', 'Probabilité', 'Impact', 'Réponse', 'Origine'], arr(s.risks).filter(kept).map(r => [r.id + mark(r), r.text, r.likelihood, r.impact, r.response, r.origin])));

// ── 9. Décisions ────────────────────────────────────────────
h(2, '9. Décisions');
if (!dds.length) p('_Aucune décision enregistrée._\n');
for (const d of dds) {
  h(3, `${d.id} — ${txt(d.question)}${mark(d)}`);
  p(table(['Option', 'Impacts'], arr(d.options).map(o => [o.text, o.impacts])));
  p(`**Décision** : ${txt(d.decision)}\n`);
  p(`**Justification** : ${txt(d.rationale)}\n`);
  p(`**Décidé par** : ${d.decided_by ? shName(d.decided_by) : '—'}${d.date ? ` le ${d.date}` : ''}${d.zone ? ` — origine : ${d.zone}` : ''}\n`);
}

// ── 10. Périmètre ───────────────────────────────────────────
h(2, '10. Périmètre');
h(3, 'Inclus'); p(list(arr(s.scope?.in).map(phrase)));
h(3, 'Exclu'); p(list(arr(s.scope?.out).map(phrase)));
const hp = arr(s.candidate_needs).filter(n => n.status === 'hors_périmètre');
if (hp.length) { h(3, 'Besoins exprimés hors périmètre'); p(table(['ID', 'Besoin', 'Raison'], hp.map(n => [n.id, n.text, n.reason]))); }
if (s.scope?.deadline) p(`**Échéance** : ${s.scope.deadline}\n`);

// ── 9. Glossaire ────────────────────────────────────────────
h(2, '11. Glossaire');
p(table(['Terme', 'Définition'], arr(s.glossary).map(g => [g.term, g.definition])));

// ── 10. Traçabilité ─────────────────────────────────────────
h(2, '12. Annexe — Traçabilité');
const rows = [];
for (const b of brs) {
  const needs = arr(b.from_needs);
  const rules = arr(b.business_rules).join(', ') || '—';
  if (!needs.length) rows.push([arr(b.objectives).join(', '), b.id, rules, '—', '—']);
  for (const n of needs) {
    const srcs = arr(bcs.get(n)?.sources).map(x => `${x.ref}${x.location ? ` (${x.location})` : ''}`).join(', ');
    rows.push([arr(b.objectives).join(', '), b.id, rules, n, srcs || '—']);
  }
}
p(table(['Objectif', 'Exigence', 'Règles', 'Besoin candidat', 'Sources'], rows));

// ── 13. Vérification ────────────────────────────────────────
const sc = s.synthesis_check;
if (sc?.date) {
  h(2, 'Porte de synthèse');
  const DIM = { fidelite: 'Fidélité aux sources', couverture: 'Couverture des parties prenantes', robustesse: 'Robustesse (plusieurs sources)', actionnabilite: 'Actionnabilité', alignement: 'Alignement' };
  p(`Évaluée le ${sc.date}.\n`);
  p(table(['Dimension', 'Jugement', 'Note'], Object.entries(DIM).map(([k, l]) => [l, sc[k]?.status ? `${sc[k].status}${sc[k].assumed ? ' (assumé)' : ''}` : '—', sc[k]?.note])));
}
const evAll = brs.map(b => evidenceOf(s, brSources(s, b), [b.id, ...arr(b.from_needs)]));
p(`_Preuve des exigences présentées : ${evAll.filter(e => e.class === 'observé').length} observée(s), ${evAll.filter(e => e.class === 'rapporté').length} rapportée(s), ${evAll.filter(e => e.class === 'supposé').length} supposée(s) ; ${evAll.filter(e => e.sources === 1).length} à source unique._\n`);
h(2, 'Couverture');
p(table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], coverage(s, {}).map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason}` : `**non atteint** (manquent : ${c.missing.join(', ')})`])));
h(2, '13. Annexe — Points de vérification');
const shown = new Set([...objs, ...brs, ...rgs, ...dds].map(x => x.id));
const findings = checkBrd(s).filter(f => shown.has(f.id));
const waivers = [...objs, ...brs, ...rgs].flatMap(x => arr(x.lint_waivers).map(w => [x.id, w.rule, w.reason]));
p('_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._\n');
p(findings.length ? table(['Élément', 'Règle', 'Avertissement'], findings.map(f => [f.id, f.rule, f.message])) : '_Aucun avertissement sur les éléments présentés._\n');
if (waivers.length) { h(3, 'Dérogations acceptées'); p(table(['Élément', 'Règle', 'Raison'], waivers)); }

const target = join(dirname(statePath), 'brd.md');
writeFileSync(target, (out.join('\n') + humanReviewFooter('BRD')).replace(/\n{3,}/g, '\n\n'));
console.log(`BRD généré : ${target} (${objs.length} objectif(s), ${brs.length} exigence(s), ${rgs.length} règle(s), ${findings.length} avertissement(s) de vérification)`);
