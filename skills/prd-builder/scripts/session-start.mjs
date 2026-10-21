#!/usr/bin/env node
// Hook de début de session (Claude Code et GitHub Copilot) : rappelle ce qui attend l'équipe dans ce dépôt, sans rien
// modifier — sprint reviews dues, blocages ouverts depuis plus de deux jours. Ne bloque jamais (code 0).
// Claude Code ajoute la sortie standard d'un hook SessionStart au contexte de l'agent.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { normalizeHookInput } from './lib/agent-io.mjs';
import { dueReviews } from './due-reviews.mjs';
import { loadBlocks, hoursBetween } from './block.mjs';

let raw = {};
try { raw = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { raw = {}; }
const root = normalizeHookInput(raw).cwd;
try {
  const lines = [];
  for (const d of dueReviews(root)) lines.push(`- Sprint review due : ${d.initiative} ${d.iteration}${d.days_since_end != null ? `, finie depuis ${d.days_since_end} jour(s)` : ''}. À lancer avec /tizi-sprint-review (Claude Code) ou l'agent tizi-sprint-review (Copilot).`);
  const dir = join(root, '.tizi', 'blocages');
  if (existsSync(dir)) for (const f of readdirSync(dir).filter(x => x.endsWith('.yaml'))) for (const b of loadBlocks(root, f.replace(/\.yaml$/, ''))) {
    const h = hoursBetween(b.started, new Date().toISOString());
    if (!b.ended && h > 48) lines.push(`- Blocage ouvert depuis ${Math.round(h / 24)} jour(s) : ${b.id} sur ${b.on} (${b.cause}) — ${b.note}`);
  }
  if (lines.length) process.stdout.write(`Tizi — à l'attention de l'équipe dans ce dépôt :\n${lines.join('\n')}\nMentionne-le à l'utilisateur au début de ta réponse, sans le traiter toi-même s'il ne le demande pas.\n`);
} catch { /* un rappel ne doit jamais empêcher une session de démarrer */ }
process.exit(0);
