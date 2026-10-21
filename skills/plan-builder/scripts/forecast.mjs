#!/usr/bin/env node
// Prévision « quand aura-t-on fini ? », sans rien estimer : à partir du débit réel (tâches fusionnées par semaine),
// on rejoue les semaines à venir 10 000 fois en tirant au hasard parmi les débits observés, jusqu'à épuiser le travail
// restant. Le tirage est reproductible (graine fixe). Sous trois semaines d'historique, la prévision est refusée.
// Usage : node forecast.mjs <plan/<slug>/state.yaml> [--impl impl/<slug>/state.yaml] [--release REL-x] [--semaines 8]
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { arr, loadState, fail, today } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--impl', '--release', '--semaines'].includes(args[args.indexOf(a) - 1]));
if (!statePath) fail('Usage : node forecast.mjs <plan/<slug>/state.yaml> [--impl …] [--release REL-x] [--semaines 8]', 2);
const plan = loadState(statePath);
const slug = dirname(statePath).split('/').pop();
const implPath = opt('--impl') || `impl/${slug}/state.yaml`;
const impl = existsSync(implPath) ? loadState(implPath) : { tasks: [] };
const weeks = Number(opt('--semaines') || 8);

// Débit hebdomadaire observé : tâches fusionnées par semaine, sur les dernières semaines (les semaines vides comptent).
const merged = arr(impl.tasks).map(t => arr(t.timeline).find(e => e.event === 'fusionnée')?.at).filter(Boolean).map(d => new Date(d));
const startOfWeek = d => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.getTime(); };
const nowW = startOfWeek(new Date());
const firstW = merged.length ? Math.min(...merged.map(startOfWeek)) : nowW;
const span = Math.min(weeks, Math.floor((nowW - firstW) / 6048e5) + 1);
const samples = Array.from({ length: span }, (_, i) => merged.filter(d => startOfWeek(d) === nowW - (span - 1 - i) * 6048e5).length);
if (span < 3 || samples.reduce((a, b) => a + b, 0) === 0) fail(`Historique insuffisant : ${span} semaine(s) observée(s), ${merged.length} tâche(s) fusionnée(s). Il en faut au moins trois semaines pour prévoir ; d'ici là, la prévision serait une estimation déguisée.`);

// Travail restant : tâches non terminées du périmètre.
const inScope = t => !opt('--release') || arr(plan.stories).find(x => x.id === t.story)?.release === opt('--release');
const done = new Set(arr(impl.tasks).filter(t => t.status === 'fusionnee').map(t => t.id));
const remaining = arr(plan.tasks).filter(t => inScope(t) && !['terminé', 'abandonné'].includes(t.status) && !done.has(t.id)).length;
if (!remaining) { console.log('Aucune tâche restante dans le périmètre.'); process.exit(0); }

// Monte-Carlo, graine fixe : la même entrée donne toujours la même prévision.
let seed = 42; const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const RUNS = 10000, results = [];
for (let i = 0; i < RUNS; i++) { let left = remaining, w = 0; while (left > 0 && w < 520) { left -= samples[Math.floor(rand() * samples.length)]; w += 1; } results.push(w); }
results.sort((a, b) => a - b);
const pct = p => results[Math.min(RUNS - 1, Math.floor(RUNS * p))];
const dateIn = w => { const d = new Date(nowW + w * 6048e5); d.setUTCDate(d.getUTCDate() + 4); return d.toISOString().slice(0, 10); };
console.log(`Prévision au ${today()} — ${remaining} tâche(s) restante(s)${opt('--release') ? ` pour ${opt('--release')}` : ''}, débit observé sur ${span} semaine(s) : ${samples.join(', ')} tâche(s) par semaine.`);
for (const [p, label] of [[0.5, '50 %'], [0.85, '85 %'], [0.95, '95 %']]) console.log(`  ${label} de chances d'avoir fini en ${pct(p)} semaine(s), vers le ${dateIn(pct(p))}`);
console.log('La prévision suppose que le débit à venir ressemble au débit passé et que les tâches restantes ont des tailles comparables. Annoncer plutôt la date à 85 %.');
