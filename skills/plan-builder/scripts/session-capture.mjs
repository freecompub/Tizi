#!/usr/bin/env node
// Hook de fin de tour, de compactage et de fin de session : conserve la transcription et en produit un extrait déterministe.
// Fonctionne avec Claude Code et GitHub Copilot (CLI, et sessions Copilot de VS Code) ; voir lib/agent-io.mjs.
// À brancher sur Stop, PreCompact et SessionEnd. Copilot ne donne le chemin de la transcription qu'à Stop et PreCompact :
// à SessionEnd, le script le retrouve dans ~/.copilot/session-state/<session>/events.jsonl.
// Entrée : JSON sur stdin. Ne bloque jamais (code 0).
// Sorties, dans <cwd>/.tizi/sessions/ :
//   <date>-<session>.jsonl        copie de la transcription, secrets probables masqués (archive consultable)
//   <date>-<session>.extrait.md   extrait déterministe : vos messages mot pour mot, questions, fichiers, identifiants
//   index.yaml                    sessions et initiatives touchées
// Chaque passage remplace les fichiers de la même session, par écriture atomique : rien n'est perdu au compactage, et deux
// déclenchements simultanés (hook déclaré pour deux outils) ne laissent jamais un fichier à moitié écrit.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { readTranscript, initiativesIn, buildExtract, maskSecrets, loadIndex, saveIndex, SESSIONS_DIR, usageOf } from './lib/sessions.mjs';
import { normalizeHookInput, copilotTranscript } from './lib/agent-io.mjs';

const atomicWrite = (path, content) => { const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, content); renameSync(tmp, path); };

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const h = normalizeHookInput(input);
const cwd = h.cwd;
const src = h.transcriptPath && existsSync(h.transcriptPath) ? h.transcriptPath : copilotTranscript(h.sessionId);
if (!src || !existsSync(src)) process.exit(0);
try {
  const turns = readTranscript(src);
  const initiatives = initiativesIn(turns);
  if (!initiatives.length && !existsSync(join(cwd, SESSIONS_DIR))) process.exit(0); // session sans rapport avec le SDLC
  const sid = String(h.sessionId || 'session').slice(0, 8);
  const first = turns.find(t => t.at)?.at ?? new Date().toISOString();
  const date = first.slice(0, 10);
  const base = join(cwd, SESSIONS_DIR, `${date}-${sid}`);
  mkdirSync(join(cwd, SESSIONS_DIR), { recursive: true });
  atomicWrite(`${base}.jsonl`, maskSecrets(readFileSync(src, 'utf8')));
  atomicWrite(`${base}.extrait.md`, buildExtract(turns, { date, session: sid, initiatives, event: h.event || 'Stop' }));
  const index = loadIndex(cwd);
  const entry = index.sessions.find(s => s.session === sid) ?? (index.sessions.push({ session: sid }), index.sessions.at(-1));
  Object.assign(entry, {
    started: first, ended: [...turns].reverse().find(t => t.at)?.at ?? first, initiatives,
    user_messages: turns.filter(t => t.role === 'user').length,
    transcript: `${SESSIONS_DIR}/${date}-${sid}.jsonl`, extract: `${SESSIONS_DIR}/${date}-${sid}.extrait.md`,
    condensed: existsSync(`${base}.condense.md`) ? `${SESSIONS_DIR}/${date}-${sid}.condense.md` : '',
    last_event: h.event || '',
    tool: src.endsWith('events.jsonl') ? 'copilot' : 'claude',
    // Tâche en cours au moment de la capture (impl-builder) : relie le coût de calcul aux tâches.
    tasks: [...new Set([...(entry.tasks ?? []), ...(() => { try { return [JSON.parse(readFileSync(join(cwd, '.impl', 'current.json'), 'utf8')).task]; } catch { return []; } })()].filter(Boolean))],
    tokens: usageOf(src) ?? 'inconnu',
  });
  saveIndex(index, cwd);
} catch (e) {
  process.stderr.write(`[session-capture] capture incomplète : ${e.message}\n`);
}
process.exit(0);
