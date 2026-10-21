#!/usr/bin/env node
// Hook PreToolUse : autorise ou refuse une écriture de fichier selon la discipline de la tâche en cours.
// Fonctionne avec Claude Code, GitHub Copilot (CLI et agent cloud) et l'agent Copilot de VS Code (lib/agent-io.mjs).
// Entrée : JSON sur stdin. Sortie : code 0 pour autoriser, 2 pour refuser (raison sur stderr et en JSON sur stdout).
// Règles, pour chaque fichier touché par l'appel :
//   1. chemins toujours autorisés (impl/, .impl/, docs/, reports/) ;
//   2. sans tâche en cours : pas d'écriture de code, de test ni de contrat ;
//   3. compréhension non validée : pas d'écriture de code, de test ni de contrat ;
//   4. tests : autorisés ;
//   5. contrats : seulement si la tâche cite une opération ;
//   6. code de production : seulement dans le périmètre de la tâche, et seulement si la dernière exécution est rouge
//      (ou pendant une refactorisation ouverte sur du vert).
// VS Code ignore les filtres d'outils (matcher) des hooks : le filtrage se fait donc ici.
import { readFileSync, existsSync } from 'node:fs';
import { relative, isAbsolute, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { matchesAny, toPosix } from './lib/testing.mjs';
import { normalizeHookInput, isWriteTool, writtenPaths, deny } from './lib/agent-io.mjs';

let raw = {};
try { raw = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const h = normalizeHookInput(raw);
if (!isWriteTool(h.toolName)) process.exit(0);
const files = writtenPaths(h.toolInput).map(p => toPosix(isAbsolute(p) ? relative(h.cwd, p) : p));
if (!files.length) process.exit(0);

const cfgPath = join(h.cwd, 'impl/config.yaml');
if (!existsSync(cfgPath)) process.exit(0); // dépôt sans impl-builder : on ne gêne rien
const cfg = yaml.load(readFileSync(cfgPath, 'utf8')) ?? {};
const P = cfg.paths ?? {};
const curPath = join(h.cwd, '.impl/current.json');
const cur = existsSync(curPath) ? JSON.parse(readFileSync(curPath, 'utf8')) : null;
const state = cur && existsSync(join(h.cwd, cur.state)) ? yaml.load(readFileSync(join(h.cwd, cur.state), 'utf8')) : null;
const task = cur ? (state?.tasks ?? []).find(t => t.id === cur.task) : null;
const runsPath = join(h.cwd, '.impl/runs.jsonl');
const lastRun = () => {
  const runs = existsSync(runsPath) ? readFileSync(runsPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(r => r.task === cur.task && ['unit', 'acceptance', 'contract'].includes(r.suite)) : [];
  return runs.pop();
};

function verdict(path) {
  const no = msg => `[tdd-guard] Écriture refusée sur ${path} : ${msg}`;
  if (matchesAny(path, P.always_allowed ?? ['impl/**', '.impl/**'])) return '';
  const isTest = matchesAny(path, P.tests ?? []), isContract = matchesAny(path, P.contracts ?? []), isProd = matchesAny(path, P.production ?? []);
  if (!isTest && !isContract && !isProd) return '';
  if (!cur) return no('aucune tâche en cours. Lance scripts/start-task.mjs pour prendre une tâche du plan.');
  if (!task?.understanding?.approved_by) return no(`la compréhension de ${cur.task} n'est pas validée. Reformule la tâche, pose tes questions, et fais valider avant d'écrire du code ou des tests.`);
  if (['bloquee', 'en_revue', 'fusionnee'].includes(task.status)) return no(`${cur.task} est ${task.status} : aucune écriture.`);
  if (isTest) return '';
  if (isContract) return cur.contracts_allowed ? '' : no(`${cur.task} ne cite aucune opération de contrat. Modifier un contrat exige une décision de conception : arrête-toi et pose la question.`);
  if (!matchesAny(path, cur.allowed_paths ?? [])) return no(`hors du périmètre de ${cur.task} (${(cur.allowed_paths ?? []).join(', ') || 'aucun chemin'}). Si ce fichier doit changer, c'est une question pour le plan ou la conception.`);
  if (cur.refactor) return '';
  const last = lastRun();
  if (!last) return no('aucun test exécuté pour cette tâche. Écris d\'abord un test qui échoue, puis lance scripts/run-tests.mjs --suite unit --expect red.');
  if (!last.failed) return no('la dernière exécution est verte. En TDD, le code de production ne s\'écrit que pour faire passer un test en échec : écris le prochain test (puis run-tests.mjs), ou ouvre une refactorisation avec tdd-phase.mjs refactor.');
  return '';
}

for (const f of files) { const v = verdict(f); if (v) deny(v); }
process.exit(0);
