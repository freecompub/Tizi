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
import { provenanceCheck } from './lib/ci.mjs';
import { loadDefects } from './defect.mjs';

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
for (const b of arr(refs.prd?.preserved_behaviors)) add(b.id, 'non-régression', b.behavior, 'existant');
for (const j of arr(set.critical_journeys)) add(j, 'parcours', arr(refs.prd?.journeys).find(p => p.id === j)?.goal ?? '', 'PRD');

// Réalisation, calculée : FR → stories → tâches → état d'implémentation (fusionnée) ou du plan (terminé).
// Rien n'est déclaré à la main : une seule source par fait, pour que réalisé et prouvé ne puissent pas diverger.
const implPath = set.impl_state || [`impl/${s.initiative?.slug ?? ''}/state.yaml`].find(p => p && existsSync(p)) || '';
const impl = implPath && existsSync(implPath) ? loadState(implPath) : null;
const ptasks = arr(plan.tasks).filter(t => t.status !== 'abandonné');
const taskState = t => {
  const it = arr(impl?.tasks).find(x => x.id === t.id);
  if (it?.status === 'fusionnee' || t.status === 'terminé') return 'fait';
  if (it && ['rouge', 'vert', 'verification', 'en_revue', 'comprendre'].includes(it.status)) return 'en cours';
  if (it?.status === 'bloquee') return 'bloqué';
  return 'à faire';
};
const rollup = ts => !ts.length ? 'sans tâche' : ts.every(t => taskState(t) === 'fait') ? 'réalisé' : ts.some(t => ['fait', 'en cours'].includes(taskState(t))) ? 'partiel' : ts.some(t => taskState(t) === 'bloqué') ? 'bloqué' : 'non commencé';
const tasksOfStory = id => ptasks.filter(t => t.story === id);
const relFrs = arr(refs.prd?.releases).filter(r => !s.release || r.id === s.release).flatMap(r => arr(r.functional_requirements));
const storiesOfFr = id => stories.filter(x => arr(x.frs).includes(id));
const frReal = id => { const st = storiesOfFr(id); return st.length ? rollup(st.flatMap(x => tasksOfStory(x.id))) : 'non planifié'; };
const realOf = r => {
  if (r.kind === 'exemple') { const e = arr(plan.examples).find(x => x.id === r.id); return rollup(tasksOfStory(e?.story)); }
  if (r.kind === 'critère') return frReal(r.source);
  if (r.kind === 'NFR') return rollup(ptasks.filter(t => arr(t.verifications).includes(r.id)));
  if (r.kind === 'sécurité') return rollup(ptasks.filter(t => arr(t.threats).includes(r.id)));
  if (r.kind === 'non-régression') return rollup(ptasks.filter(t => arr(t.preserves).includes(r.id)));
  return '—';
};

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
// Défauts (defect.mjs) : un défaut est résolu quand un test étiqueté @DEF-xxx passe dans les rapports collectés.
const defects = loadDefects('.', s.initiative?.slug ?? '');
const resolved = d => cases.some(c => c.ids.includes(d.id) && c.status === 'passed') && !cases.some(c => c.ids.includes(d.id) && c.status === 'failed');
const openDefects = defects.filter(d => d.classification === 'defaut' && d.status !== 'rejeté' && !resolved(d));
const untriaged = defects.filter(d => d.status === 'à_trier');
const frOfRule = id => arr(refs.prd?.releases).flatMap(r => arr(r.functional_requirements)).filter(f => arr(f.business_rules).includes(id)).map(f => f.id);
const contradicted = new Map(); // exigence → défauts ouverts qui la contredisent
for (const d of openDefects) for (const id of [d.requirement, ...(String(d.requirement).startsWith('RG-') ? frOfRule(d.requirement) : [])].filter(Boolean)) contradicted.set(id, [...(contradicted.get(id) ?? []), d.id]);

const rows = req.map(r => {
  const tests = cases.filter(c => c.ids.includes(r.id));
  const passing = tests.filter(c => c.status === 'passed'), failing = tests.filter(c => c.status === 'failed');
  const measure = r.kind === 'NFR' ? nfrRes.get(r.id) : null;
  let status = failing.length ? 'échec' : passing.length ? 'prouvé' : 'non prouvé';
  if (r.kind === 'NFR' && measure) status = measure.pass ? (failing.length ? 'échec' : 'prouvé') : 'échec';
  if (status !== 'prouvé' && waivers.has(r.id)) status = 'dérogation';
  const contra = contradicted.get(r.id) ?? (r.kind === 'critère' ? contradicted.get(r.source) : null);
  const wasProved = status === 'prouvé';
  if (contra) status = 'contredit';
  return { ...r, status, defects: contra ?? [], insufficientTest: !!contra && wasProved, realization: realOf(r), tests: tests.map(c => `${c.suite} : ${c.name} (${c.status === 'passed' ? 'ok' : c.status})`), measure: measure ? `${txt(measure.measured)} / cible ${txt(measure.target)}` : '' };
});

// Vue par FR : réalisation et preuve, regroupées par activité de la story map.
const actOfTask = mt => arr(refs.prd?.story_map).find(a => arr(a.tasks).some(t => t.id === mt));
const frRows = relFrs.map(f => {
  const own = rows.filter(r => (r.kind === 'critère' && r.source === f.id) || (r.kind === 'exemple' && storiesOfFr(f.id).some(x => x.id === r.source)));
  const proof = contradicted.has(f.id) || own.some(r => r.status === 'contredit') ? 'contredit' : !own.length ? 'aucune exigence à prouver' : own.every(r => r.status === 'dérogation') ? 'dérogation' : own.every(r => ['prouvé', 'dérogation'].includes(r.status)) ? (own.some(r => r.status === 'dérogation') ? 'prouvé, avec dérogation' : 'prouvé') : own.some(r => r.status === 'prouvé') ? 'partiellement prouvé' : 'non prouvé';
  const act = actOfTask(storiesOfFr(f.id)[0]?.map_task);
  return { id: f.id, statement: f.statement, activity: act ? `${act.id} ${act.name}` : '—', stories: storiesOfFr(f.id).map(x => x.id), realization: frReal(f.id), proof, waived: waivers.has(f.id) };
});
// Vue par épopée et story : l'épopée est l'activité de la story map ; une story en voie rapide est rattachée à
// l'épopée de l'exigence qu'elle corrige (attach_to).
const actOfStory = x => actOfTask(x.map_task) ?? arr(refs.prd?.story_map).find(a => a.id === x.attach_to);
const storyRows = stories.map(x => {
  const own = rows.filter(r => (r.kind === 'exemple' && r.source === x.id) || (r.kind === 'critère' && arr(x.frs).includes(r.source)) || (r.kind === 'non-régression' && ptasks.some(t => t.story === x.id && arr(t.preserves).includes(r.id))));
  const fixes = defects.filter(d => d.fix_story === x.id);
  const proof = own.some(r => r.status === 'contredit') ? 'contredit' : !own.length && !fixes.length ? 'aucune exigence' : own.every(r => ['prouvé', 'dérogation'].includes(r.status)) && fixes.every(resolved) ? 'prouvé' : own.some(r => r.status === 'prouvé') || fixes.some(resolved) ? 'partiel' : 'non prouvé';
  const act = actOfStory(x);
  return { id: x.id, title: x.title ?? '', lane: x.lane ?? 'standard', epic: act ? `${act.id} ${act.name}` : 'sans épopée', realization: rollup(tasksOfStory(x.id)), proof, requirements: own.map(r => `${r.id} ${r.status}`), fixes: fixes.map(d => `${d.id} ${resolved(d) ? 'résolu' : 'ouvert'}`) };
});
// Écarts : ce que ni la réalisation seule ni la preuve seule ne montrent.
const realizedUnproved = frRows.filter(f => ['réalisé', 'partiel'].includes(f.realization) && !['prouvé', 'prouvé, avec dérogation', 'dérogation'].includes(f.proof) && !f.waived);
const reqUnproved = rows.filter(r => r.realization === 'réalisé' && !['prouvé', 'dérogation'].includes(r.status) && !['critère', 'exemple'].includes(r.kind));
const notDone = frRows.filter(f => ['non commencé', 'non planifié', 'sans tâche', 'bloqué'].includes(f.realization));
const known = new Set([...rows.map(r => r.id), ...relFrs.map(f => f.id)]);
const unplannedProof = [...new Set(cases.filter(c => c.status === 'passed').flatMap(c => c.ids).filter(id => /^(AC|EX|FR)-/.test(id) && !known.has(id)))];

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
  ['R10', 'Aucun défaut bloquant ou majeur ouvert, aucun signalement à trier', !untriaged.length && !openDefects.some(d => ['bloquant', 'majeur'].includes(d.severity)),
    untriaged.length || openDefects.length ? [untriaged.length ? `à trier : ${untriaged.map(d => d.id).join(', ')}` : '', openDefects.length ? `ouverts : ${openDefects.map(d => `${d.id} (${d.severity})`).join(', ')}` : ''].filter(Boolean).join(' ; ') : `${defects.filter(d => d.classification === 'defaut').length} défaut(s), tous résolus par un test de régression`],
  ['R8', 'Rien de réalisé sans être prouvé', !realizedUnproved.length && !reqUnproved.length,
    realizedUnproved.length || reqUnproved.length ? `réalisé mais non prouvé : ${[...realizedUnproved.map(f => f.id), ...reqUnproved.map(r => r.id)].join(', ')}` : `${frRows.filter(f => f.realization === 'réalisé').length} FR réalisée(s), toutes prouvées`],
  (() => { const pc = provenanceCheck(s, root); return ['R9', 'Preuves issues de la CI sur le commit candidat', pc.ok, pc.detail]; })(),
  ...(mutation ? [['R6', `Score de mutation ≥ ${set.thresholds?.mutation ?? 60} %`, mutation.score >= (set.thresholds?.mutation ?? 60), `${mutation.score} %`]] : []),
  ...(suites.security ? [['R7', 'Analyses de sécurité sans constat', !suites.security.failed && !suites.security.missing, suites.security.missing ? 'rapport absent' : `${suites.security.failed ?? 0} constat(s)`]] : []),
];
const open = gate.every(g => g[2]);

// Écriture.
const md = [`# Matrice de couverture — ${txt(s.initiative?.name)}, ${txt(s.release)}, version candidate ${txt(s.candidate)}`, '', `Calculée le ${today()} depuis le plan v${txt(plan.governance?.version)} et les rapports collectés. Une exigence n'est prouvée que par un test qui la référence et qui passe.`, ''];
md.push('## Porte de release', '', table(['', 'Condition', 'Détail'], gate.map(([c, l, ok, d]) => [`${ok ? '✓' : '✗'} ${c}`, l, d])), '', `**Porte ${open ? 'ouverte' : 'fermée'}.** L'approbation de la release reste une déclaration humaine.`, '');
md.push('## Réalisé et prouvé, par activité', '', 'Réalisé ne veut pas dire prouvé : une tâche fusionnée montre qu\'un code existe, pas que le comportement convenu fonctionne. La réalisation est calculée depuis le plan et l\'implémentation, la preuve depuis les rapports de tests.', '');
const acts = [...new Set(frRows.map(f => f.activity))];
for (const a of acts) {
  md.push(`### ${a}`, '', table(['FR', 'Exigence', 'Stories', 'Réalisation', 'Preuve'], frRows.filter(f => f.activity === a).map(f => [f.id, f.statement, f.stories.join(', ') || '—', f.realization, f.waived ? 'dérogation' : ['prouvé', 'prouvé, avec dérogation', 'dérogation'].includes(f.proof) ? f.proof : `**${f.proof}**`])), '');
}
md.push('## Écarts', '');
md.push('**Réalisé mais non prouvé** — ferme la porte (R8) : écrire le test qui prouve, retirer de la release, ou déroger par décision nommée.', '', ...(realizedUnproved.length || reqUnproved.length ? [...realizedUnproved.map(f => `- ${f.id} (${f.realization}, ${f.proof}) — ${txt(f.statement)}`), ...reqUnproved.map(r => `- ${r.id} (${r.kind}, réalisé, ${r.status})`)] : ['_Aucun._']), '');
md.push('**Non réalisé** — ne ferme pas la porte, mais demande une décision explicite : reporter à une autre release, ou retenir la livraison.', '', ...(notDone.length ? notDone.map(f => `- ${f.id} (${f.realization}) — ${txt(f.statement)}`) : ['_Aucun._']), '');
md.push('**Prouvé sans être prévu** — un test vert renvoie à une exigence qu\'aucune story de la release ne porte : étiquette erronée, ou travail fait hors plan.', '', ...(unplannedProof.length ? unplannedProof.map(id => `- ${id}`) : ['_Aucun._']), '');
md.push('## Par épopée et story', '', 'L\'épopée est l\'activité de la story map. Une story est prouvée quand chacun de ses exemples et critères l\'est, et que les défauts qu\'elle corrige sont résolus par un test de régression.', '');
for (const ep of [...new Set(storyRows.map(x => x.epic))]) md.push(`### ${ep}`, '', table(['Story', 'Voie', 'Réalisation', 'Preuve', 'Exigences', 'Défauts corrigés'], storyRows.filter(x => x.epic === ep).map(x => [`${x.id} — ${txt(x.title)}`, x.lane, x.realization, x.proof === 'prouvé' ? 'prouvé' : `**${x.proof}**`, x.requirements.join(', ') || '—', x.fixes.join(', ') || '—'])), '');
if (defects.length) {
  md.push('## Défauts', '', 'Un défaut est résolu quand un test de régression étiqueté `@DEF-xxx` passe dans les rapports de la version candidate ; il n\'est jamais déclaré résolu à la main.', '', table(['Défaut', 'Titre', 'Tri', 'Exigence contredite', 'Sévérité', 'Trouvé dans', 'Correction', 'État'], defects.map(d => [d.id, d.title, d.classification || '**à trier**', d.requirement ?? '—', d.severity ?? '—', d.found_in, d.fix_story ?? '—', d.status === 'à_trier' ? '**à trier**' : d.classification !== 'defaut' ? d.status : resolved(d) ? 'résolu' : '**ouvert**'])), '');
  const weak = rows.filter(r => r.insufficientTest);
  if (weak.length) md.push('**Prouvé puis contredit** — un test passait, mais un défaut montre le contraire : le test était insuffisant. Le test de régression doit attraper ce que le premier laissait passer.', '', ...weak.map(r => `- ${r.id} (${r.defects.join(', ')}) — ${r.tests.join(' ; ')}`), '');
}
md.push('## Exigences', '', table(['Exigence', 'Type', 'Libellé', 'Réalisation', 'Preuve', 'Tests'], rows.map(r => [r.id, r.kind, r.label, r.realization, r.status === 'prouvé' ? 'prouvé' : `**${r.status}**`, [...r.tests, r.measure].filter(Boolean).join(' ; ') || '—'])));
if (xs.length) md.push('## Sessions exploratoires', '', table(['Session', 'Charte', 'Statut', 'Constats'], xs.map(x => [x.id, `Explorer ${txt(x.charter?.explore)} avec ${txt(x.charter?.with)} pour découvrir ${txt(x.charter?.discover)}`, x.status, arr(x.findings).map(f => `${f.severity} : ${f.text}${f.story ? ` (${f.story})` : ''}`).join(' ; ') || '—'])));
if (waivers.size) md.push('## Dérogations', '', table(['Exigence', 'Raison', 'Approuvée par'], [...waivers.values()].map(w => [w.id, w.reason, w.approved_by])));
writeOut(join(root, 'matrix.md'), md.join('\n') + humanReviewFooter('rapport de vérification'));
writeOut(join(root, 'matrix.yaml'), `# Matrice calculée — release-matrix.mjs\n${yaml.dump({ release: s.release, candidate: s.candidate, computed: today(), plan_version: plan.governance?.version ?? '', gate: gate.map(([code, label, ok, detail]) => ({ code, label, ok, detail })), open, requirements: rows, functional: frRows, stories: storyRows, defects: defects.map(d => ({ id: d.id, requirement: d.requirement ?? '', severity: d.severity ?? '', classification: d.classification, resolved: d.classification === 'defaut' ? resolved(d) : null })), gaps: { realized_unproved: [...realizedUnproved.map(f => f.id), ...reqUnproved.map(r => r.id)], not_done: notDone.map(f => f.id), unplanned_proof: unplannedProof }, suites }, { lineWidth: 120 })}`);
for (const [c, l, ok, d] of gate) console.log(`${ok ? '✓' : '✗'} ${c} ${l} — ${d}`);
console.log(`Porte ${open ? 'OUVERTE' : 'FERMÉE'} — ${join(root, 'matrix.md')}`);
if (!open) process.exitCode = 1;
