#!/usr/bin/env node
// Enregistre la validation humaine de la compréhension d'une tâche, avec son empreinte.
// À lancer seulement quand l'utilisateur a déclaré valider ; la compréhension est ensuite gelée :
// la modifier invalide la validation (garde-fou et porte de PR), et il faut la refaire valider.
// Usage : node approve-understanding.mjs <impl/<slug>/state.yaml> --task TK-xxx --by "<nom>"
import { arr, loadState, fail, today } from './lib/common.mjs';
import { saveState, understandingDigest } from './lib/impl.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--task', '--by'].includes(args[args.indexOf(a) - 1]));
const taskId = opt('--task'), by = opt('--by');
if (!statePath || !taskId || !by) fail('Usage : node approve-understanding.mjs <state.yaml> --task TK-xxx --by "<nom>"', 2);
const s = loadState(statePath);
const t = arr(s.tasks).find(x => x.id === taskId);
if (!t) fail(`${taskId} n'a pas été prise en charge (start-task.mjs).`);
const u = t.understanding ?? {};
if (!u.restatement) fail('Aucune reformulation : rien à valider.');
const open = arr(u.questions).filter(q => !q.answer);
if (open.length) fail(`${open.length} question(s) sans réponse : la compréhension ne peut pas être validée.`);
Object.assign(u, { approved_by: by, date: today(), approved_digest: understandingDigest(u) });
t.understanding = u;
if (t.status === 'comprendre') t.status = 'rouge';
saveState(statePath, s);
console.log(`Compréhension de ${taskId} validée par ${by} et gelée (empreinte ${u.approved_digest.slice(0, 12)}). Toute modification ultérieure demandera une nouvelle validation.`);
