#!/usr/bin/env node
// Porte de l'étape 5 : vérifie qu'une tâche est prête pour la revue, et génère la description de PR avec la checklist de revue.
// En local, s'appuie sur les exécutions enregistrées ; avec --run (CI), relance elle-même toutes les suites configurées.
// Usage : node pr-gate.mjs <impl/<slug>/state.yaml> --task TK-xxx [--run]
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, today, humanReviewFooter } from './lib/common.mjs';
import { loadConfig, readRuns, saveState, taskContext } from './lib/impl.mjs';
import { readReport } from './lib/testing.mjs';
import { traceCheck } from './trace-check.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--task');
const taskId = args.includes('--task') ? args[args.indexOf('--task') + 1] : '';
const rerun = args.includes('--run');
if (!statePath || !taskId) fail('Usage : node pr-gate.mjs <state.yaml> --task TK-xxx [--run]', 2);
const s = loadState(statePath);
const cfg = loadConfig(s.config ?? 'impl/config.yaml');
const t = arr(s.tasks).find(x => x.id === taskId);
if (!t) fail(`${taskId} n'a pas été prise en charge (start-task.mjs).`);
const ctx = taskContext(s.source_plan.path, taskId);

// Résultats par suite : relancés (CI) ou dernières exécutions enregistrées (local).
const suites = ['unit', 'acceptance', ...(ctx.operations.length ? ['contract'] : [])].filter(k => cfg.suites?.[k]?.command);
const results = {};
if (rerun) {
  for (const k of [...suites, 'security', 'mutation'].filter(k => cfg.suites?.[k]?.command)) {
    if (cfg.suites[k].report) { mkdirSync(dirname(cfg.suites[k].report), { recursive: true }); rmSync(cfg.suites[k].report, { force: true }); }
    const r = spawnSync(cfg.suites[k].command, { shell: true, stdio: 'inherit' });
    let rep = null; try { rep = readReport(cfg.suites[k].report); } catch { rep = null; }
    results[k] = k === 'mutation' ? { score: rep?.score ?? null } : { failed: rep ? rep.failed : 1, total: rep?.total ?? 0, exit: r.status };
    if (k !== 'mutation' && r.status !== 0 && !results[k].failed) results[k].failed = 1;
  }
} else {
  const runs = readRuns(taskId);
  for (const k of [...suites, 'security', 'mutation']) { const last = runs.filter(r => r.suite === k).pop(); if (last) results[k] = last; }
}

const checks = [];
const check = (id, label, ok, detail = '') => checks.push({ id, label, ok, detail });
check('C1', 'Compréhension validée par un humain', !!t.understanding?.approved_by, t.understanding?.approved_by ? `${t.understanding.approved_by}, ${txt(t.understanding.date)}` : 'non validée');
const openZ = arr(s.shadow_zones).filter(z => z.task === taskId && z.status === 'ouverte');
check('C2', 'Aucune question ouverte sur la tâche', !openZ.length, openZ.map(z => z.id).join(', '));
for (const k of suites) check('C3', `Suite ${k} au vert`, !!results[k] && !results[k].failed, results[k] ? `${results[k].total} test(s), ${results[k].failed} en échec` : 'jamais exécutée');
if (!rerun) {
  const runs = readRuns(taskId).filter(r => suites.includes(r.suite));
  const firstGreen = runs.findIndex(r => !r.failed);
  check('C4', 'TDD : au moins un test vu en échec avant le premier vert', runs.some((r, i) => r.failed && (firstGreen === -1 || i < firstGreen)), `${runs.filter(r => r.failed).length} exécution(s) rouge(s) enregistrée(s)`);
}
const tr = traceCheck(ctx.expected, cfg);
check('C5', 'Chaque exemple et critère de la tâche est référencé par un test', !tr.missing.length, tr.missing.length ? `manquent : ${tr.missing.join(', ')}` : `${ctx.expected.length} identifiant(s)`);
if (cfg.suites?.mutation?.command) {
  const sc = results.mutation?.score, th = cfg.suites.mutation.threshold ?? 70;
  check('C6', `Score de mutation ≥ ${th} %`, sc !== null && sc !== undefined && sc >= th, sc === null || sc === undefined ? 'non mesuré' : `${sc} %`);
}
if (cfg.suites?.security?.command) check('C7', 'Analyse de sécurité sans constat bloquant', !!results.security && !results.security.failed, results.security ? `${results.security.failed} constat(s)` : 'non exécutée');
if (cfg.review?.required) {
  // C8 : revue de code multi-perspectives faite sur ce même diff, sans constat bloquant confirmé.
  const { currentDiff, reviewDir } = await import('./lib/review.mjs');
  const rf = join(reviewDir(statePath, taskId), 'review-result.json');
  const res = existsSync(rf) ? JSON.parse(readFileSync(rf, 'utf8')) : null;
  const fresh = res && currentDiff(JSON.parse(readFileSync(join(reviewDir(statePath, taskId), 'review-state.json'), 'utf8')).base).digest === res.diff_sha256;
  check('C8', 'Revue de code par agents sur le diff actuel, sans bloquant confirmé', !!res && fresh && res.verdict === 'prête pour la relecture humaine', !res ? 'non faite' : !fresh ? 'périmée : le code a changé depuis' : res.verdict);
}
const ok = checks.every(c => c.ok);

// Description de PR et checklist de revue
const st = ctx.story ?? {};
const md = [`# ${taskId} — ${txt(ctx.task.title)}`, '', `Story : ${txt(st.id)} — ${txt(st.title)}${st.why ? ` (pourquoi : ${st.why})` : ''}`, '', `Fiche de contexte : \`${ctx.contextFile}\``, ''];
md.push('## Résumé des changements', '', '_À rédiger par l\'auteur : ce qui change, et pourquoi c\'est le minimum pour la tâche._', '');
md.push('## Porte de l\'étape 5', '', table(['', 'Vérification', 'Détail'], checks.map(c => [c.ok ? '✓' : '✗', c.label, c.detail])));
md.push('## Tests et traçabilité', '', table(['Identifiant', 'Tests'], ctx.expected.map(id => [id, (tr.found.get(id) ?? []).join(', ') || '**aucun**'])));
if (ctx.adrs.length) md.push('## Décisions d\'architecture à respecter', '', table(['ADR', 'Décision', 'Comment le vérifier'], ctx.adrs.map(a => [a.id, a.outcome, a.confirmation])));
if (ctx.threats.length) md.push('## Mesures de sécurité réalisées', '', list(ctx.threats));
md.push('## Checklist du relecteur', '', list([
  'Le changement fait ce que dit la fiche de contexte, et seulement cela (aucun comportement, règle ou contrat non prévu).',
  'Les tests vérifient le comportement attendu, pas l\'implémentation ; les noms et étiquettes renvoient aux bons identifiants.',
  'Les mutants survivants signalés ne cachent pas un cas métier non testé.',
  'Les décisions d\'architecture listées sont respectées.',
  'Les données sensibles, les secrets et les entrées non fiables sont traités correctement.',
  'Le code est lisible par quelqu\'un qui n\'a pas écrit la tâche ; la dette ajoutée est signalée.',
]).replace(/^- /gm, '- [ ] '));
const out = join(dirname(statePath), 'pr', `${taskId}.md`);
writeOut(out, md.join('\n') + humanReviewFooter('descriptif de PR'));

if (!rerun) {
  t.gate = { date: today(), result: ok ? 'ouverte' : 'fermée', report: out };
  if (ok && ['rouge', 'vert', 'verification', 'comprendre'].includes(t.status)) t.status = 'verification';
  saveState(statePath, s);
}
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.label}${c.detail ? ` — ${c.detail}` : ''}`);
console.log(ok ? `Porte ouverte : description de PR prête (${out}). La revue humaine reste obligatoire.` : 'Porte fermée : corriger les points ✗ avant d\'ouvrir la PR.');
if (!ok) process.exitCode = 1;
