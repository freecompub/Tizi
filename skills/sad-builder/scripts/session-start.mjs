#!/usr/bin/env node
// Hook de début de session (Claude Code et GitHub Copilot) : rappelle ce qui attend l'équipe dans ce dépôt, sans rien
// modifier — sprint reviews dues, signalements à trier, blocages anciens, dernière session sans condensé.
// Ne bloque jamais (code 0).
// Claude Code ajoute la sortie standard d'un hook SessionStart au contexte de l'agent.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { normalizeHookInput } from './lib/agent-io.mjs';
import yaml from './lib/vendor/js-yaml.mjs';
import { dueReviews } from './due-reviews.mjs';
import { loadBlocks, hoursBetween } from './block.mjs';
import { loadIndex } from './lib/sessions.mjs';

let raw = {};
try { raw = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { raw = {}; }
const root = normalizeHookInput(raw).cwd;
try {
  const lines = [];
  for (const d of dueReviews(root)) lines.push(`- Sprint review due : ${d.initiative} ${d.iteration}${d.days_since_end != null ? `, finie depuis ${d.days_since_end} jour(s)` : ''}. À lancer avec /tizi-sprint-review (Claude Code) ou l'agent tizi-sprint-review (Copilot).`);
  const ddir = join(root, '.tizi', 'defauts');
  if (existsSync(ddir)) for (const f of readdirSync(ddir).filter(x => x.endsWith('.yaml'))) {
    const n = (yaml.load(readFileSync(join(ddir, f), 'utf8'))?.defauts ?? []).filter(d => d.status === 'à_trier').length;
    if (n) lines.push(`- ${n} signalement(s) à trier pour ${f.replace(/\.yaml$/, '')} : /tizi-bug (Claude Code) ou l'agent tizi-bug (Copilot). Ils bloquent la release tant qu'ils ne sont pas triés.`);
  }
  // Une session interrompue sans pause annoncée n'a pas de condensé : sans lui, la reprise repart de
  // la transcription brute. Le rappel n'existait que dans status.mjs et /tizi, donc il dépendait de
  // l'agent. C'est le moment même d'une reprise : il est dit ici, sans rien exiger.
  const dernieres = new Map();
  for (const x of loadIndex(root).sessions) for (const ini of x.initiatives ?? []) {
    const vue = dernieres.get(ini);
    if (!vue || String(x.ended) > String(vue.ended)) dernieres.set(ini, x);
  }
  for (const [ini, x] of dernieres) {
    if (x.condensed && existsSync(join(root, x.condensed))) continue;
    lines.push(`- Dernière session de ${ini} sans condensé (${String(x.ended).slice(0, 16).replace('T', ' ')}) : le rédiger depuis ${x.extract || 'son extrait'} avant de reprendre.`);
  }

  const dir = join(root, '.tizi', 'blocages');
  if (existsSync(dir)) for (const f of readdirSync(dir).filter(x => x.endsWith('.yaml'))) for (const b of loadBlocks(root, f.replace(/\.yaml$/, ''))) {
    const h = hoursBetween(b.started, new Date().toISOString());
    if (!b.ended && h > 48) lines.push(`- Blocage ouvert depuis ${Math.round(h / 24)} jour(s) : ${b.id} sur ${b.on} (${b.cause}) — ${b.note}`);
  }
  if (lines.length) process.stdout.write(`Tizi — à l'attention de l'équipe dans ce dépôt :\n${lines.join('\n')}\nMentionne-le à l'utilisateur au début de ta réponse, sans le traiter toi-même s'il ne le demande pas.\n`);
} catch { /* un rappel ne doit jamais empêcher une session de démarrer */ }
process.exit(0);
