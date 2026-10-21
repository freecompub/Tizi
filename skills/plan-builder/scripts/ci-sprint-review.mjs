#!/usr/bin/env node
// Tâche planifiée en CI : pour chaque sprint review due, prépare les documents (mesures, fiches, preuves, sprint review)
// et ouvre une issue avec la sprint review, sauf si une issue ouverte du même titre existe déjà. Ne décide rien et ne
// modifie aucun état versionné : les documents préparés vivent dans le bac à sable de la CI et dans l'issue.
// Usage (dans un workflow GitHub Actions, avec GH_TOKEN) : node ci-sprint-review.mjs [racine] [--dry-run]
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dueReviews } from './due-reviews.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const root = args.find(a => !a.startsWith('--')) ?? '.';
const dry = args.includes('--dry-run');
const due = dueReviews(root);
if (!due.length) { console.log('Aucune sprint review due.'); process.exit(0); }
for (const d of due) {
  const title = `Sprint review due : ${d.initiative} ${d.iteration}`;
  spawnSync(process.execPath, [join(HERE, 'close-sprint.mjs'), d.state, '--iteration', d.iteration], { cwd: root, encoding: 'utf8' });
  const doc = join(root, dirname(d.state), 'review', d.iteration, 'sprint-review.md');
  const body = `${d.days_since_end != null ? `L'itération ${d.iteration} est finie depuis ${d.days_since_end} jour(s) et sa sprint review n'est pas faite.` : ''}\n\nÀ mener avec \`/tizi-sprint-review ${d.initiative} ${d.iteration}\` (Claude Code) ou l'agent \`tizi-sprint-review\` (Copilot). Les décisions se prennent en équipe ; ce document ne fait que les préparer.\n\n---\n\n${existsSync(doc) ? readFileSync(doc, 'utf8').slice(0, 60000) : '_Document non préparé._'}`;
  if (dry) { console.log(`(simulation) issue « ${title} » — ${body.length} caractères`); continue; }
  const existing = spawnSync('gh', ['issue', 'list', '--state', 'open', '--search', `"${title}" in:title`, '--json', 'title'], { encoding: 'utf8' });
  if (existing.status !== 0) { console.error(`gh indisponible ou sans droit : ${existing.stderr?.trim()}`); process.exitCode = 1; continue; }
  if (JSON.parse(existing.stdout || '[]').some(i => i.title === title)) { console.log(`Issue déjà ouverte : ${title}`); continue; }
  const created = spawnSync('gh', ['issue', 'create', '--title', title, '--body', body], { encoding: 'utf8' });
  console.log(created.status === 0 ? `Issue ouverte : ${created.stdout.trim()}` : `Échec de création : ${created.stderr?.trim()}`);
}
