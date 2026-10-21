// Contexte d'implémentation : configuration, tâche en cours, journal des exécutions.
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import yaml from './vendor/js-yaml.mjs';
import { arr, loadState, fail } from './common.mjs';

export const CURRENT = '.impl/current.json';
export const RUNS = '.impl/runs.jsonl';

export function loadConfig(path = 'impl/config.yaml') {
  if (!existsSync(path)) fail(`Configuration absente : ${path}. Crée-la depuis templates/config.yaml et fais-la compléter.`);
  return yaml.load(readFileSync(path, 'utf8')) ?? {};
}
export const readCurrent = () => (existsSync(CURRENT) ? JSON.parse(readFileSync(CURRENT, 'utf8')) : null);
export function writeCurrent(obj) { mkdirSync(dirname(CURRENT), { recursive: true }); writeFileSync(CURRENT, `${JSON.stringify(obj, null, 2)}\n`); }
export function appendRun(run) { mkdirSync(dirname(RUNS), { recursive: true }); appendFileSync(RUNS, `${JSON.stringify(run)}\n`); }
export const readRuns = task => (existsSync(RUNS) ? readFileSync(RUNS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []).filter(r => !task || r.task === task);

export function saveState(path, s) {
  writeFileSync(path, `# État de l'implémentation — mis à jour par l'agent et par les scripts d'impl-builder.\n${yaml.dump(s, { lineWidth: 120 })}`);
}

// Contexte d'une tâche, tiré de la version figée du plan (state.yaml + refs.yaml) désignée par le handoff.
export function taskContext(handoffPath, taskId) {
  const vdir = resolve(dirname(handoffPath));                          // plan/<slug>/handoff/v1.0
  const planRoot = dirname(dirname(vdir));                             // plan/<slug>
  const frozen = join(planRoot, 'versions', basename(vdir));           // plan/<slug>/versions/v1.0
  if (!existsSync(join(frozen, 'state.yaml'))) fail(`Version figée du plan introuvable : ${frozen}`);
  const plan = loadState(join(frozen, 'state.yaml'));
  const refs = existsSync(join(frozen, 'refs.yaml')) ? loadState(join(frozen, 'refs.yaml')) : {};
  const task = arr(plan.tasks).find(t => t.id === taskId);
  if (!task) fail(`Tâche ${taskId} absente du plan figé.`);
  const story = arr(plan.stories).find(x => x.id === task.story);
  const examples = arr(plan.examples).filter(e => e.story === story?.id && e.status !== 'abandonné').map(e => e.id);
  const frs = arr(refs.prd?.releases).flatMap(r => arr(r.functional_requirements)).filter(f => arr(story?.frs).includes(f.id));
  const acs = frs.flatMap(f => arr(f.acceptance).map(a => a.id));
  const adrs = arr(refs.sad?.decisions).filter(a => arr(a.elements).some(e => arr(task.elements).includes(e)));
  return {
    task, story, frozen, contextFile: join(frozen, 'tasks', `${taskId}.md`),
    expected: [...examples, ...acs], elements: arr(task.elements), operations: arr(task.operations),
    threats: arr(task.threats), verifications: arr(task.verifications), adrs,
  };
}
