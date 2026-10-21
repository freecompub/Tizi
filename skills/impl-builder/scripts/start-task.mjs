#!/usr/bin/env node
// Prend en charge une tâche du plan : vérifie le handoff, les dépendances et le périmètre, puis prépare le contexte du hook.
// Usage : node start-task.mjs <impl/<slug>/state.yaml> --task TK-xxx
import { existsSync } from 'node:fs';
import { arr, loadState, fail, verifyHandoff } from './lib/common.mjs';
import { loadConfig, readCurrent, writeCurrent, saveState, taskContext } from './lib/impl.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--task');
const taskId = args.includes('--task') ? args[args.indexOf('--task') + 1] : '';
if (!statePath || !taskId) fail('Usage : node start-task.mjs <state.yaml> --task TK-xxx', 2);
const s = loadState(statePath);
const cfg = loadConfig(s.config ?? 'impl/config.yaml');

// Handoff du plan : intègre et identique à celui relevé à l'ingestion.
const h = s.source_plan?.path;
if (!h || !existsSync(h)) fail('source_plan.path est vide ou introuvable.');
const v = verifyHandoff(h);
if (!v.ok) fail(`Handoff du plan non intègre :\n${v.problems.map(p => `  - ${p}`).join('\n')}`);
if (s.source_plan.sha256 && s.source_plan.sha256 !== v.sha256) fail('Le handoff du plan a changé depuis son ingestion : faire le point avec plan-builder avant de continuer.');
const handoff = loadState(h);
const entry = arr(handoff.tasks).find(t => t.id === taskId);
if (!entry) fail(`${taskId} ne fait pas partie des tâches engagées et prêtes du handoff (retenue, ou pas encore planifiée).`);

// Dépendances : fusionnées, ou terminées avant ce handoff.
const done = new Set(arr(s.tasks).filter(t => t.status === 'fusionnee').map(t => t.id));
const inHandoff = new Set(arr(handoff.tasks).map(t => t.id));
const waiting = arr(entry.depends_on).filter(d => inHandoff.has(d) && !done.has(d));
if (waiting.length) fail(`Dépendances non fusionnées : ${waiting.join(', ')}. Prendre d'abord ${waiting[0]}.`);
if (arr(entry.waits_for_outside).length) console.warn(`Avertissement : la tâche attend aussi hors engagement : ${entry.waits_for_outside.join(', ')}.`);

const cur = readCurrent();
if (cur && cur.task !== taskId) {
  const other = arr(s.tasks).find(t => t.id === cur.task);
  if (other && !['fusionnee', 'bloquee', 'en_revue'].includes(other.status)) fail(`${cur.task} est en cours (${other.status}). Termine-la, ou déclare-la bloquée, avant d'en prendre une autre.`);
}

const ctx = taskContext(h, taskId);
const unmapped = ctx.elements.filter(e => !arr(cfg.elements?.[e]).length);
if (ctx.task.kind !== 'spike' && (!ctx.elements.length || unmapped.length)) fail(`Périmètre indéterminé : ${unmapped.length ? `éléments sans dossier dans impl/config.yaml : ${unmapped.join(', ')}` : 'la tâche ne cite aucun élément'}. Le hook ne peut pas borner les écritures.`);

s.tasks = arr(s.tasks);
let t = s.tasks.find(x => x.id === taskId);
if (!t) { t = { id: taskId, status: 'comprendre', context: ctx.contextFile, understanding: { restatement: '', questions: [], assumptions: [], test_plan: [], approved_by: '', date: '' } }; s.tasks.push(t); }
saveState(statePath, s);
writeCurrent({
  task: taskId, state: statePath, story: ctx.story?.id ?? '', kind: ctx.task.kind, phase: t.understanding?.approved_by ? 'vert' : 'comprendre',
  allowed_paths: ctx.elements.flatMap(e => arr(cfg.elements?.[e])), contracts_allowed: ctx.operations.length > 0,
  expected_ids: ctx.expected, operations: ctx.operations, started: new Date().toISOString(),
});
console.log(`${taskId} prise en charge (${ctx.task.kind}, ${ctx.task.size}). Fiche de contexte : ${ctx.contextFile}`);
console.log(`Périmètre : ${ctx.elements.join(', ') || 'spike'} — contrats ${ctx.operations.length ? `modifiables (${ctx.operations.join(', ')})` : 'non modifiables'}. À tester : ${ctx.expected.join(', ') || 'aucun identifiant amont'}.`);
console.log('Étape suivante : reformuler la tâche et ses questions, et faire valider la compréhension. Aucune écriture de code n\'est possible avant.');
