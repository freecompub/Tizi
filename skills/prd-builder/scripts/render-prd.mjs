#!/usr/bin/env node
// Génère prd/<slug>/prd.md à partir de prd/<slug>/state.yaml (source de vérité).
// Usage : node render-prd.mjs <state.yaml> [--include-proposed]
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, PRIORITY_ORDER, today, humanReviewFooter } from './lib/common.mjs';
import { checkPrd, coverage } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
const includeProposed = args.includes('--include-proposed');
if (!statePath) fail('Usage : node render-prd.mjs <state.yaml> [--include-proposed]', 2);
const s = loadState(statePath);

const kept = x => x && (x.status === 'validé' || (includeProposed && x.status === 'proposé'));
const mark = x => (x.status === 'proposé' ? ' *(proposé)*' : '');
const pick = key => arr(s[key]).filter(kept);
const mm = t => String(t ?? '').replace(/"/g, "'").replace(/\r?\n/g, ' ');
const chained = s.mode === 'chaîné';

const goals = pick('goals'), personas = pick('personas'), journeys = pick('journeys'), releases = pick('releases');
const frs = pick('functional_requirements'), acs = pick('acceptance_criteria'), nfrs = pick('nfrs');
const cons = pick('constraints'), dds = pick('design_decisions'), risks = pick('risks');
const brs = arr(s.brd_ref?.requirements);
const perName = id => personas.find(p => p.id === id)?.name || arr(s.personas).find(p => p.id === id)?.name || txt(id);

const out = [];
const h = (n, t) => out.push(`${'#'.repeat(n)} ${t}\n`);
const p = t => out.push(`${t}\n`);

// ── En-tête ─────────────────────────────────────────────────
h(1, `PRD — ${txt(s.initiative?.name)}`);
p(`**Version** : ${txt(s.governance?.version)} — **Statut** : ${txt(s.governance?.status)} — **Mode** : ${txt(s.mode)}${chained ? ` (BRD v${txt(s.source_brd?.version)})` : ''}\n`);
p(`> Document généré à partir de \`state.yaml\` le ${today()}. Ne pas le modifier directement : toute correction passe par l'état de session.`);
if (includeProposed) p('> **Brouillon de travail** : inclut les éléments au statut *proposé*.');
const labels = { context: 'Contexte et vision', goals: 'Objectifs produit', personas_journeys: 'Personas et parcours', releases: 'Releases et MVP', functional: 'Exigences fonctionnelles', non_functional: 'Exigences non fonctionnelles', constraints_decisions: 'Contraintes et décisions', metrics: 'Métriques', risks: 'Hypothèses et risques', glossary: 'Glossaire' };
h(2, 'Statut du document');
p(table(['Section', 'Statut'], Object.entries(labels).map(([k, l]) => [l, s.prd_sections?.[k] ?? 'à rédiger'])));
if (!includeProposed) {
  const pending = ['goals', 'personas', 'journeys', 'releases', 'functional_requirements', 'acceptance_criteria', 'nfrs'].reduce((n, k) => n + arr(s[k]).filter(x => x.status === 'proposé').length, 0);
  if (pending) p(`_${pending} élément(s) en attente de validation, non inclus._\n`);
}

// ── 1. Contexte et vision ───────────────────────────────────
h(2, '1. Contexte et vision');
p(`**Problème** : ${txt(s.problem?.statement)}\n`);
p(`**Vision** : ${txt(s.vision)}\n`);
if (chained) p(`**BRD d'origine** : version ${txt(s.source_brd?.version)} — \`${txt(s.source_brd?.path)}\`\n`);

// ── 2. Objectifs produit ────────────────────────────────────
h(2, '2. Objectifs produit');
p(table(['ID', 'Objectif', 'KPI', 'Actuel → cible', 'Horizon', ...(chained ? ['Objectifs BRD'] : [])],
  goals.map(g => [g.id + mark(g), g.statement, g.kpi, `${txt(g.baseline)} → ${txt(g.target)}`, g.horizon, ...(chained ? [arr(g.brd_objectives).join(', ')] : [])])));

// ── 3. Personas et parcours ─────────────────────────────────
h(2, '3. Personas et parcours');
for (const per of personas) {
  h(3, `${per.id} — ${txt(per.name)}${mark(per)}`);
  p(`**Rôle** : ${txt(per.role)} · **Résultat recherché** : ${txt(per.success)}\n`);
  p(`**Jobs-to-be-done**\n\n${list(arr(per.jobs))}`);
  p(`**Irritants**\n\n${list(arr(per.pains))}`);
  p(`**Fondé sur** : ${arr(per.evidence).join(', ') || '—'}\n`);
}
for (const j of journeys) {
  h(3, `${j.id} — ${txt(j.goal)} (${perName(j.persona)})${mark(j)}`);
  const steps = arr(j.steps);
  p(list(steps.map((st, i) => `${i + 1}. ${st}`)).replace(/^- /gm, ''));
  if (steps.length > 1) {
    p(['```mermaid', 'flowchart LR', ...steps.map((st, i) => `  S${i}["${mm(st)}"]${i ? `\n  S${i - 1} --> S${i}` : ''}`), '```'].join('\n') + '\n');
  }
}

// ── 4. Releases et MVP ──────────────────────────────────────
h(2, '4. Releases et MVP');
for (const r of releases) {
  h(3, `${r.id} — ${txt(r.name)}${mark(r)}`);
  p(table(['Critère', 'Valeur'], [['Hypothèse testée', r.learning_goal], ['Valeur de bout en bout', r.value], ['Signal', r.signal], ['Confinement', r.containment]]));
}
const pbs = arr(s.preserved_behaviors).filter(b => b.status !== 'abandonné');
if (s.existing_product || pbs.length) {
  h(3, 'Comportements existants à préserver');
  p('_Le produit est déjà en service : ces comportements actuels ne doivent pas régresser. Ce sont des exigences de non-régression, prouvées par un test à la release._\n');
  p(table(['ID', 'Comportement', 'Qui en dépend', 'Preuve', 'Test'], pbs.map(b => [b.id, b.behavior, b.why, arr(b.evidence).join(', '), b.test || 'à écrire'])));
}
const cpts = arr(s.concepts).filter(c => c.status !== 'abandonné');
if (cpts.length) {
  h(3, 'Concepts envisagés');
  p('_Idées de solution du point de vue de l\'utilisateur, envisagées avant la story map. Ce ne sont pas des exigences. L\'axe « faisable » n\'est qu\'une hypothèse, vérifiée en conception._\n');
  p(table(['ID', 'Concept', 'Désirable', 'Faisable (hypothèse)', 'Viable', 'Testé par', 'Décision', 'Raison'],
    cpts.map(c => [c.id, `**${txt(c.title)}** — ${txt(c.description)}`, c.lenses?.desirability, c.lenses?.feasibility, c.lenses?.viability, arr(c.tested_by).join(', '), String(c.decision ?? '').replace('_', ' '), c.reason])));
}
const trs = arr(s.brd_ref?.transition_requirements);
if (trs.length) {
  h(3, 'Exigences de transition');
  p(table(['ID', 'Type', 'Exigence', 'Release', 'Achevée quand'], trs.map(t => [t.id, String(t.kind ?? '').replace(/_/g, ' '), t.text, t.release || '**à rattacher**', t.done_when])));
}
h(3, 'Story map');
const relIds = releases.map(r => r.id);
const smRows = [];
for (const a of arr(s.story_map)) for (const t of arr(a.tasks)) smRows.push([`${a.id} ${txt(a.name)}`, `${t.id} ${txt(t.name)}`, t.release, t.journey]);
p(table(['Activité', 'Tâche', 'Release', 'Parcours'], smRows));
h(3, 'Périmètre');
p(`**Inclus**\n\n${list(arr(s.scope?.in))}`);
p(`**Exclu**\n\n${list(arr(s.scope?.out).map(o => (typeof o === 'string' ? o : `${o.text} — ${txt(o.reason)}`)))}`);

// ── 5. Exigences fonctionnelles ─────────────────────────────
h(2, '5. Exigences fonctionnelles');
const relOrder = r => (relIds.indexOf(r) === -1 ? 999 : relIds.indexOf(r));
const sortedFr = [...frs].sort((a, b) => relOrder(a.release) - relOrder(b.release) || PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
for (const f of sortedFr) {
  h(3, `${f.id} — ${prLabel(f.priority)} — ${txt(f.release)}${mark(f)}`);
  p(`${txt(f.statement)}\n`);
  p(`Acteur : ${perName(f.actor)} · Parcours : ${arr(f.journeys).join(', ') || '—'} · Objectifs : ${arr(f.goals).join(', ') || '—'} · Origine : ${[...arr(f.brd_requirements), f.origin].filter(Boolean).join(', ') || '—'}${arr(f.business_rules).length ? ` · Règles : ${arr(f.business_rules).join(', ')}` : ''}\n`);
  const mine = acs.filter(a => a.fr === f.id);
  if (mine.length) {
    p(['```gherkin', mine.map(a => [`Scénario: ${a.id} — ${txt(a.scenario)}`, `  Étant donné ${txt(a.given)}`, `  Quand ${txt(a.when)}`, `  Alors ${txt(a.then)}`].join('\n')).join('\n\n'), '```'].join('\n') + '\n');
  } else p('_Aucun critère d’acceptation._\n');
}

// ── 6. Exigences non fonctionnelles ─────────────────────────
h(2, '6. Exigences non fonctionnelles');
p(table(['ID', 'Catégorie', 'Exigence', 'Métrique', 'Cible', 'Mesure', 'Portée', 'Priorité'],
  nfrs.map(n => [n.id + mark(n), n.category, n.statement, n.metric, n.target, n.measurement, arr(n.applies_to).join(', ') || 'globale', prLabel(n.priority)])));

// ── 7. Contraintes et décisions produit ─────────────────────
h(2, '7. Contraintes et décisions produit');
h(3, 'Contraintes');
p(table(['ID', 'Contrainte', 'Imposée par', 'Catégorie'], cons.map(c => [c.id + mark(c), c.statement, c.imposed_by, c.category])));
h(3, 'Règles métier');
const rgs = arr(s.business_rules).filter(r => r.status !== 'abandonné');
const autoLabel = { automatisée: 'automatisée', manuelle: 'manuelle', 'à_décider': '**à décider**' };
p(table(['ID', 'Règle', 'Type', 'Application', 'Automatisation', 'FR'], rgs.map(r => [r.id, r.statement, r.kind, r.enforcement || '—', autoLabel[r.automation] ?? txt(r.automation),
  frs.filter(f => arr(f.business_rules).includes(r.id)).map(f => f.id).join(', ') || (r.automation === 'automatisée' ? '**non couverte**' : '—')])));
h(3, 'Décisions produit');
p(table(['ID', 'Décision', 'Justification', 'Options écartées', 'Décidé par', 'Date'], dds.map(d => [d.id + mark(d), d.decision, d.rationale,
  [...arr(d.alternatives), ...arr(d.options).map(o => o.text).filter(t => t !== d.decision)].join(' ; '), d.decided_by, d.date])));
if (arr(s.decision_rights).length) { h(3, 'Droits de décision'); p(table(['Domaine', 'Décideur', 'Recours'], arr(s.decision_rights).map(d => [d.domain, d.decider, d.escalation]))); }
if (arr(s.dependencies).length) { h(3, 'Dépendances'); p(table(['Dépendance', 'Responsable'], arr(s.dependencies).map(d => [d.text, d.owner]))); }

// ── 8. Métriques ────────────────────────────────────────────
h(2, '8. Métriques et instrumentation');
p(table(['ID', 'Objectif', 'Métrique', 'Définition', 'Actuel → cible', 'Fenêtre', 'Source', 'Instrumentation'],
  arr(s.metrics).map(m => [m.id, m.goal, m.name, m.definition, `${txt(m.baseline)} → ${txt(m.target)}`, m.window, m.data_source, m.instrumentation])));

// ── 9. Hypothèses et risques ────────────────────────────────
h(2, '9. Hypothèses et risques');
h(3, 'Hypothèses');
p(table(['ID', 'Hypothèse', 'Type', 'Risque', 'Statut', 'Test', 'Critère de réussite', 'Résultat'], arr(s.hypotheses).map(x => [x.id, x.text, x.kind, x.risk, x.status,
  x.test?.method ? `${x.test.method}${x.test.audience ? ` (${x.test.audience})` : ''}` : (x.status === 'assumée' ? `assumée : ${txt(x.reason)}` : '—'), x.test?.success_criterion, x.test?.result ? `${x.test.result}${x.test.source ? ` — ${x.test.source}` : ''}` : '—'])));
const assumed = arr(s.shadow_zones).filter(z => z.status === 'assumée');
if (assumed.length) { h(3, 'Zones d’ombre assumées'); p(table(['ID', 'Question', 'Raison'], assumed.map(z => [z.id, z.question, z.resolution]))); }
h(3, 'Risques');
p(table(['ID', 'Risque', 'Probabilité', 'Impact', 'Réponse'], risks.map(r => [r.id + mark(r), r.text, r.likelihood, r.impact, r.response])));

// ── 10. Glossaire ───────────────────────────────────────────
h(2, '10. Glossaire');
p(table(['Terme', 'Définition'], arr(s.glossary).map(g => [g.term, g.definition])));

// ── 11. Traçabilité et couverture ───────────────────────────
h(2, '11. Annexe — Traçabilité et couverture');
if (chained) {
  h(3, 'Exigences du BRD → PRD');
  p(table(['BR', 'Priorité BRD', 'FR', 'NFR', 'Critères'], brs.map(b => {
    const f = frs.filter(x => arr(x.brd_requirements).includes(b.id)).map(x => x.id);
    const n = nfrs.filter(x => arr(x.brd_requirements).includes(b.id)).map(x => x.id);
    const a = acs.filter(x => f.includes(x.fr)).map(x => x.id);
    return [b.id, prLabel(b.priority), f.join(', ') || (b.priority === 'wont' ? 'n/a' : '**non couverte**'), n.join(', ') || '—', a.join(', ') || '—'];
  })));
}
h(3, 'Objectifs produit → exigences');
p(table(['Objectif', 'FR', 'Métriques'], goals.map(g => [g.id, frs.filter(f => arr(f.goals).includes(g.id)).map(f => f.id).join(', ') || '**aucune**', arr(s.metrics).filter(m => m.goal === g.id).map(m => m.id).join(', ') || '**aucune**'])));
h(3, 'Exigences fonctionnelles → critères');
p(table(['FR', 'Priorité', 'Critères', 'Scénario d’erreur'], frs.map(f => {
  const a = acs.filter(x => x.fr === f.id);
  return [f.id, prLabel(f.priority), a.map(x => x.id).join(', ') || '**aucun**', f.priority === 'must' ? (a.some(x => x.kind === 'erreur') ? 'oui' : '**absent**') : '—'];
})));

h(2, 'Couverture');
p(table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], coverage(s, {}).map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason}` : `**non atteint** (manquent : ${c.missing.join(', ')})`])));
h(2, '12. Annexe — Points de vérification');
const shown = new Set([...goals, ...frs, ...acs, ...nfrs, ...dds, ...arr(s.business_rules)].map(x => x.id));
const findings = checkPrd(s).filter(f => shown.has(f.id));
p('_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._\n');
p(findings.length ? table(['Élément', 'Règle', 'Avertissement'], findings.map(f => [f.id, f.rule, f.message])) : '_Aucun avertissement sur les éléments présentés._\n');
const waivers = [...frs, ...nfrs, ...acs].flatMap(x => arr(x.lint_waivers).map(w => [x.id, w.rule, w.reason]));
if (waivers.length) { h(3, 'Dérogations acceptées'); p(table(['Élément', 'Règle', 'Raison'], waivers)); }

writeOut(join(dirname(statePath), 'prd.md'), out.join('\n') + humanReviewFooter('PRD'));
console.log(`PRD généré : ${join(dirname(statePath), 'prd.md')} (${frs.length} FR, ${acs.length} AC, ${nfrs.length} NFR)`);
