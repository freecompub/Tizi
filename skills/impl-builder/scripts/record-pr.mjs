#!/usr/bin/env node
// Enregistre ce que les humains décident sur la PR d'une tâche, avec l'heure : c'est ce qui permet de mesurer
// l'attente de relecture et les allers-retours. Seulement sur déclaration de l'utilisateur.
// Usage : node record-pr.mjs <impl/<slug>/state.yaml> --task TK-xxx (--approuvee --par "<nom>" | --corrections --par "<nom>" [--note "…"] | --fusionnee) [--url <lien>]
import { arr, loadState, fail, today } from './lib/common.mjs';
import { saveState, logEvent } from './lib/impl.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--task', '--par', '--note', '--url'].includes(args[args.indexOf(a) - 1]));
const taskId = opt('--task');
const what = args.includes('--approuvee') ? 'pr_approuvée' : args.includes('--corrections') ? 'corrections_demandées' : args.includes('--fusionnee') ? 'fusionnée' : '';
if (!statePath || !taskId || !what) fail('Usage : node record-pr.mjs <state.yaml> --task TK-xxx (--approuvee --par "<nom>" | --corrections --par "<nom>" | --fusionnee)', 2);
if (what !== 'fusionnée' && !opt('--par')) fail('Qui a relu ? --par "<nom>" (déclaré par l\'utilisateur).', 2);
const s = loadState(statePath);
const t = arr(s.tasks).find(x => x.id === taskId);
if (!t) fail(`${taskId} n'a pas été prise en charge.`);
t.pr = { ...(t.pr ?? {}), ...(opt('--url') ? { url: opt('--url') } : {}) };
if (what === 'pr_approuvée') { Object.assign(t.pr, { approved_by: opt('--par'), date: today() }); t.status = 'en_revue'; }
if (what === 'corrections_demandées') { t.status = 'rouge'; }
if (what === 'fusionnée') { if (!t.pr.approved_by) fail('Fusion sans approbation humaine enregistrée : refusé.'); t.status = 'fusionnee'; }
saveState(statePath, s);
logEvent(statePath, taskId, what, { ...(opt('--par') ? { by: opt('--par') } : {}), ...(opt('--note') ? { note: opt('--note') } : {}) });
console.log(`${taskId} : ${what.replace('_', ' ')}${opt('--par') ? ` par ${opt('--par')}` : ''}.`);
