#!/usr/bin/env node
// Matrice de couverture des exigences et porte de release (étape 6).
// Lit le plan figé (stories, exemples, refs du PRD et de la conception) et les rapports de tests collectés,
// puis relie chaque exigence de la release à ses tests. Écrit matrix.md et matrix.yaml.
// Usage : node release-matrix.mjs <qa/<slug>/state.yaml>
import { existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, loadState, writeOut, fail, today, verifyHandoff, humanReviewFooter } from './lib/common.mjs';
import { readReport } from './lib/testing.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node release-matrix.mjs <state.yaml>', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const set = s.settings ?? {};

// Plan figé désigné par le handoff, vérifié.
const h = s.source_plan?.path;
if (!h || !existsSync(h)) fail('source_plan.path vide ou introuvable.');
const v = verifyHandoff(h);
if (!v.ok) fail(`Handoff du plan non intègre :\n${v.problems.map(p => `  - ${p}`).join('\n')}`);
if (s.source_plan.sha256 && s.source_plan.sha256 !== v.sha256) fail('Le handoff du plan a changé depuis son ingestion.');
const vdir = resolve(dirname(h)), frozen = join(dirname(dirname(vdir)), 'versions', basename(vdir));
const plan = loadState(join(frozen, 'state.yaml'));
const refs = existsSync(join(frozen, 'refs.yaml')) ? loadState(join(frozen, 'refs.yaml')) : {};

// Exigences à prouver pour la release.
const stories = arr(plan.stories).filter(x => x.status !== 'abandonné' && (!s.release || (x.release ?? plan.settings?.release) === s.release));
const frIdx = new Map(arr(refs.prd?.releases).flatMap(r => arr(r.functional_requirements)).map(f => [f.id, f]));
const req = [];
const add = (id, kind, label, source) => { if (!req.some(r => r.id === id)) req.push({ id, kind, label, source }); };
for (const x of stories) {
  for (const e of arr(plan.examples).filter(e => e.story === x.id && e.status !== 'abandonné')) add(e.id, 'exemple', e.title, x.id);
  for (const f of arr(x.frs)) for (const a of arr(frIdx.get(f)?.acceptance)) add(a.id, 'critère', a.scenario, f);
}
for (const n of arr(refs.sad?.verifications).filter(n => n.stage === 'tests')) add(n.id, 'NFR', `${n.nfr} — ${n.method} : ${txt(n.description)}`, n.nfr);
for (const m of arr(refs.sad?.security_measures)) add(m.threat, 'sécurité', arr(m.mitigations).join(' ; '), m.target);
for (const j of arr(set.critical_journeys)) add(j, 'parcours', arr(refs.prd?.journeys).find(p => p.id === j)?.goal ?? '', 'PRD');

// Rapports collectés.
const suites = {}, cases = [];
let mutation = null;
for (const [name, path] of Object.entries(set.reports ?? {})) {
  if (!path) continue;
  if (!existsSync(path)) { suites[name] = { missing: true, path }; continue; }
  let r; try { r = readReport(path); } catch (e) { suites[name] = { error: e.message, path }; continue; }
  if (r.score !== undefined && r.cases === undefined) { mutation = r; suites[name] = { mutation: r.score, path }; continue; }
  suites[name] = { total: r.total, failed: r.failed, path };
  for (const c of r.cases) cases.push({ ...c, suite: name });
}
const waivers = new Map(arr(s.waivers).map(w => [w.id, w]));
const nfrRes = new Map(arr(s.nfr_results).map(n => [n.id, n]));
const rows = req.map(r => {
  const tests = cases.filter(c => c.ids.includes(r.id));
  const passing = tests.filter(c => c.status === 'passed'), failing = tests.filter(c => c.status === 'failed');
  const measure = r.kind === 'NFR' ? nfrRes.get(r.id) : null;
  let status = failing.length ? 'échec' : passing.length ? 'prouvé' : 'non prouvé';
  if (r.kind === 'NFR' && measure) status = measure.pass ? (failing.length ? 'échec' : 'prouvé') : 'échec';
  if (status !== 'prouvé' && waivers.has(r.id)) status = 'dérogation';
  return { ...r, status, tests: tests.map(c => `${c.suite} : ${c.name} (${c.status === 'passed' ? 'ok' : c.status})`), measure: measure ? `${txt(measure.measured)} / cible ${txt(measure.target)}` : '' };
});

// Porte.
const nonWaived = rows.filter(r => r.status !== 'dérogation');
const proved = rows.filter(r => r.status === 'prouvé').length;
const pct = nonWaived.length ? Math.round((proved / nonWaived.length) * 1000) / 10 : 100;
const xs = arr(s.exploratory);
const gate = [
  ['R1', 'Toutes les suites collectées passent', Object.values(suites).every(x => !x.failed && !x.missing && !x.error),
    Object.entries(suites).map(([k, x]) => `${k} : ${x.missing ? 'rapport absent' : x.error ? 'illisible' : x.mutation !== undefined ? `mutation ${x.mutation} %` : `${x.total} test(s), ${x.failed} en échec`}`).join(' ; ') || 'aucun rapport'],
  ['R2', `Exigences prouvées (seuil ${set.thresholds?.requirements ?? 100} %)`, nonWaived.every(r => r.status === 'prouvé') && pct >= (set.thresholds?.requirements ?? 100),
    `${proved}/${nonWaived.length} prouvées, ${rows.length - nonWaived.length} dérogation(s)`],
  ['R3', 'Mesures des NFR conformes', rows.filter(r => r.kind === 'NFR').every(r => ['prouvé', 'dérogation'].includes(r.status)), `${rows.filter(r => r.kind === 'NFR' && r.status === 'prouvé').length}/${rows.filter(r => r.kind === 'NFR').length}`],
  ['R4', 'Parcours critiques couverts de bout en bout', rows.filter(r => r.kind === 'parcours').every(r => ['prouvé', 'dérogation'].includes(r.status)), `${rows.filter(r => r.kind === 'parcours' && r.status === 'prouvé').length}/${rows.filter(r => r.kind === 'parcours').length}`],
  ['R5', 'Sessions exploratoires faites, sans constat bloquant ouvert', xs.every(x => x.status !== 'prevue') && !xs.some(x => arr(x.findings).some(f => f.severity === 'bloquant' && !f.resolved)),
    `${xs.filter(x => x.status === 'faite').length}/${xs.filter(x => x.status !== 'abandonnee').length} faite(s), ${xs.flatMap(x => arr(x.findings)).filter(f => f.severity === 'bloquant' && !f.resolved).length} bloquant(s) ouvert(s)`],
  ...(mutation ? [['R6', `Score de mutation ≥ ${set.thresholds?.mutation ?? 60} %`, mutation.score >= (set.thresholds?.mutation ?? 60), `${mutation.score} %`]] : []),
  ...(suites.security ? [['R7', 'Analyses de sécurité sans constat', !suites.security.failed && !suites.security.missing, suites.security.missing ? 'rapport absent' : `${suites.security.failed ?? 0} constat(s)`]] : []),
];
const open = gate.every(g => g[2]);

// Écriture.
const md = [`# Matrice de couverture — ${txt(s.initiative?.name)}, ${txt(s.release)}, version candidate ${txt(s.candidate)}`, '', `Calculée le ${today()} depuis le plan v${txt(plan.governance?.version)} et les rapports collectés. Une exigence n'est prouvée que par un test qui la référence et qui passe.`, ''];
md.push('## Porte de release', '', table(['', 'Condition', 'Détail'], gate.map(([c, l, ok, d]) => [`${ok ? '✓' : '✗'} ${c}`, l, d])), '', `**Porte ${open ? 'ouverte' : 'fermée'}.** L'approbation de la release reste une déclaration humaine.`, '');
md.push('## Exigences', '', table(['Exigence', 'Type', 'Libellé', 'Statut', 'Preuves'], rows.map(r => [r.id, r.kind, r.label, r.status === 'prouvé' ? 'prouvé' : `**${r.status}**`, [...r.tests, r.measure].filter(Boolean).join(' ; ') || '—'])));
if (xs.length) md.push('## Sessions exploratoires', '', table(['Session', 'Charte', 'Statut', 'Constats'], xs.map(x => [x.id, `Explorer ${txt(x.charter?.explore)} avec ${txt(x.charter?.with)} pour découvrir ${txt(x.charter?.discover)}`, x.status, arr(x.findings).map(f => `${f.severity} : ${f.text}${f.story ? ` (${f.story})` : ''}`).join(' ; ') || '—'])));
if (waivers.size) md.push('## Dérogations', '', table(['Exigence', 'Raison', 'Approuvée par'], [...waivers.values()].map(w => [w.id, w.reason, w.approved_by])));
writeOut(join(root, 'matrix.md'), md.join('\n') + humanReviewFooter('rapport de vérification'));
writeOut(join(root, 'matrix.yaml'), `# Matrice calculée — release-matrix.mjs\n${yaml.dump({ release: s.release, candidate: s.candidate, computed: today(), plan_version: plan.governance?.version ?? '', gate: gate.map(([code, label, ok, detail]) => ({ code, label, ok, detail })), open, requirements: rows, suites }, { lineWidth: 120 })}`);
for (const [c, l, ok, d] of gate) console.log(`${ok ? '✓' : '✗'} ${c} ${l} — ${d}`);
console.log(`Porte ${open ? 'OUVERTE' : 'FERMÉE'} — ${join(root, 'matrix.md')}`);
if (!open) process.exitCode = 1;
