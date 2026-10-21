#!/usr/bin/env node
// Revues de fin d'itération dues : une itération dont la date de fin est passée (ou marquée terminée) et dont la revue
// d'équipe n'est pas faite. Sert au point d'étape, au hook de début de session et à la tâche planifiée en CI.
// Usage : node due-reviews.mjs [racine] [--json]
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { arr, loadState } from './lib/common.mjs';

export function dueReviews(root = '.', today = new Date().toISOString().slice(0, 10)) {
  const out = [];
  if (!existsSync(join(root, 'plan'))) return out;
  for (const slug of readdirSync(join(root, 'plan'))) {
    const p = join(root, 'plan', slug, 'state.yaml');
    if (!existsSync(p)) continue;
    const s = loadState(p);
    for (const it of arr(s.iterations)) {
      if (it.review?.team?.date) continue;
      const ended = it.status === 'terminé' || (it.end && String(it.end).slice(0, 10) < today);
      if (!ended) continue;
      const days = it.end ? Math.max(0, Math.round((new Date(today) - new Date(String(it.end).slice(0, 10))) / 864e5)) : null;
      out.push({ initiative: slug, iteration: it.id, goal: it.goal ?? '', end: it.end ?? '', days_since_end: days, state: p });
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const root = args.find(a => !a.startsWith('--')) ?? '.';
  const due = dueReviews(root);
  if (args.includes('--json')) { console.log(JSON.stringify(due, null, 2)); process.exit(0); }
  console.log(due.length ? due.map(d => `Revue due : ${d.initiative} ${d.iteration}${d.days_since_end != null ? `, finie depuis ${d.days_since_end} jour(s)` : ''}${d.goal ? ` — ${d.goal}` : ''}. Lancer /tizi-review ${d.initiative} ${d.iteration}.`).join('\n') : 'Aucune revue de fin d\'itération en attente.');
}
