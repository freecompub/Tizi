#!/usr/bin/env node
// Lance une suite de tests de la configuration, lit son rapport et enregistre le résultat pour la tâche en cours.
// C'est cet enregistrement (rouge ou vert) que le hook tdd-guard consulte.
// Usage : node run-tests.mjs --suite unit|acceptance|contract|mutation|security [--expect red|green]
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { fail } from './lib/common.mjs';
import { loadConfig, readCurrent, writeCurrent, appendRun } from './lib/impl.mjs';
import { readReport } from './lib/testing.mjs';

const args = process.argv.slice(2);
const suite = args.includes('--suite') ? args[args.indexOf('--suite') + 1] : '';
const expect = args.includes('--expect') ? args[args.indexOf('--expect') + 1] : '';
const characterization = args.includes('--caracterisation');
const cur = readCurrent();
if (!cur) fail('Aucune tâche en cours : lance start-task.mjs.');
const cfg = loadConfig();
const def = cfg.suites?.[suite];
if (!def?.command) fail(`Suite « ${suite} » non configurée dans impl/config.yaml.`);

// Le dossier du rapport doit exister, et un rapport d'une exécution précédente ne doit jamais être relu par erreur.
if (def.report) { mkdirSync(dirname(def.report), { recursive: true }); rmSync(def.report, { force: true }); }
const started = Date.now();
const res = spawnSync(def.command, { shell: true, stdio: 'inherit' });
let report = null, error = '';
try { report = readReport(def.report); } catch (e) { error = e.message; }
const run = { task: cur.task, suite, at: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 100) / 10, exit: res.status };
if (suite === 'mutation') Object.assign(run, { score: report?.score ?? null, survived: report?.Survived ?? null });
else {
  // Un rapport absent ou illisible, ou une sortie en erreur sans échec lisible, compte comme un échec : on ne déduit jamais un vert.
  const failed = report ? report.failed : 1;
  Object.assign(run, { total: report?.total ?? 0, failed: res.status !== 0 && failed === 0 ? 1 : failed, ids: [...new Set((report?.cases ?? []).flatMap(c => c.ids))], ...(error ? { error } : {}) });
}
if (characterization) run.characterization = true;
appendRun(run);
delete cur.refactor;
writeCurrent(cur);

if (suite === 'mutation') console.log(`Mutation : score ${run.score ?? '—'} %${run.survived ? `, ${run.survived} mutant(s) survivant(s)` : ''}.`);
else console.log(`${suite} : ${run.total} test(s), ${run.failed} en échec → ${run.failed ? 'ROUGE' : 'VERT'}.${error ? ` (${error})` : ''}`);
if (characterization && run.failed) console.warn('Test de caractérisation en échec : il doit décrire l\'existant tel qu\'il est. Corriger le test, pas le code.');
if (expect === 'red' && !run.failed && suite !== 'mutation') console.warn('Attendu rouge : le test passe déjà. Il ne prouve rien tant qu\'on ne l\'a pas vu échouer.');
if (expect === 'green' && run.failed) process.exitCode = 1;
