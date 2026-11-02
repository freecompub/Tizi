#!/usr/bin/env node
// Hook de fin de tour, de compactage et de fin de session : conserve la transcription et en produit un extrait déterministe.
// Fonctionne avec Claude Code et GitHub Copilot (CLI, et sessions Copilot de VS Code) ; voir lib/agent-io.mjs.
// À brancher sur Stop, PreCompact et SessionEnd. Copilot ne donne le chemin de la transcription qu'à Stop et PreCompact :
// à SessionEnd, le script le retrouve dans ~/.copilot/session-state/<session>/events.jsonl.
// Entrée : JSON sur stdin. Ne bloque jamais (code 0).
// Sorties, dans <racine du projet>/.tizi/sessions/ — le dépôt Git, à défaut le plus proche ancêtre qui porte `.tizi/` :
//   <date>-<session>.jsonl        copie de la transcription, secrets probables masqués (archive consultable)
//   <date>-<session>.extrait.md   extrait déterministe : vos messages mot pour mot, questions, fichiers, identifiants
//   <date>-<id>.index.yaml        entrée d'index de cette session (un fichier par session : pas de conflit Git)
// Chaque passage remplace les fichiers de la même session, par écriture atomique : rien n'est perdu au compactage, et deux
// déclenchements simultanés (hook déclaré pour deux outils) ne laissent jamais un fichier à moitié écrit.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { readTranscript, initiativesIn, buildExtract, maskSecrets, loadIndex, saveSessionEntry, namesIn, projectRoot, surLeDisque, SESSIONS_DIR, usageOf } from './lib/sessions.mjs';
import { normalizeHookInput, copilotTranscript } from './lib/agent-io.mjs';

const atomicWrite = (path, content) => { const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, content); renameSync(tmp, path); };

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const h = normalizeHookInput(input);
// `h.cwd` est le répertoire COURANT de la session, et il bouge : un `cd` de l'agent dans un dossier
// d'initiative y créait un second magasin de sessions. Le magasin est à la racine du projet, une seule fois.
const cwd = projectRoot(h.cwd);
const src = h.transcriptPath && existsSync(h.transcriptPath) ? h.transcriptPath : copilotTranscript(h.sessionId);
if (!src || !existsSync(src)) process.exit(0);
try {
  const turns = readTranscript(src);
  // Deux questions, deux listes. Les mentions disent si la session a affaire au SDLC — sans quoi on ne
  // salit pas un dépôt quelconque d'un `.tizi/`. Le disque dit ce qu'elle a vraiment touché : le motif
  // `<document>/<slug>/` se trouve aussi dans un nom de branche Git et dans un slug juste évoqué, et
  // l'index en annonçait quatre pour un seul dossier réel.
  const mentionnees = initiativesIn(turns);
  if (!mentionnees.length && !existsSync(join(cwd, SESSIONS_DIR))) process.exit(0); // session sans rapport avec le SDLC
  const initiatives = surLeDisque(mentionnees, cwd);
  const sid = String(h.sessionId || 'session').slice(0, 8);
  const first = turns.find(t => t.at)?.at ?? new Date().toISOString();
  const date = first.slice(0, 10);
  const base = join(cwd, SESSIONS_DIR, `${date}-${sid}`);
  mkdirSync(join(cwd, SESSIONS_DIR), { recursive: true });
  atomicWrite(`${base}.jsonl`, maskSecrets(readFileSync(src, 'utf8')));
  atomicWrite(`${base}.extrait.md`, buildExtract(turns, { date, session: sid, initiatives, event: h.event || 'Stop', personnes: namesIn(initiatives, cwd) }));
  // On ne relit que notre propre entrée : aucun autre écrivain ne touche ce fichier.
  const entry = loadIndex(cwd).sessions.find(s => s.session === sid) ?? { session: sid };
  // Le champ `condensed` ne s'écrit plus — un cache que seul le moins informé écrivait, et qui ne
  // pouvait que mentir : `condenseOf` trouve le fichier par la convention de nom. On le retire des
  // index déjà écrits au passage, au lieu de le laisser traîner avec sa valeur fausse.
  delete entry.condensed;
  Object.assign(entry, {
    started: first, ended: [...turns].reverse().find(t => t.at)?.at ?? first, initiatives,
    user_messages: turns.filter(t => t.role === 'user').length,
    transcript: `${SESSIONS_DIR}/${date}-${sid}.jsonl`, extract: `${SESSIONS_DIR}/${date}-${sid}.extrait.md`,
    last_event: h.event || '',
    tool: src.endsWith('events.jsonl') ? 'copilot' : 'claude',
    // Tâche en cours au moment de la capture (impl-builder) : relie le coût de calcul aux tâches.
    tasks: [...new Set([...(entry.tasks ?? []), ...(() => { try { return [JSON.parse(readFileSync(join(cwd, '.impl', 'current.json'), 'utf8')).task]; } catch { return []; } })()].filter(Boolean))],
    tokens: usageOf(src) ?? 'inconnu',
  });
  saveSessionEntry(entry, cwd);
} catch (e) {
  process.stderr.write(`[session-capture] capture incomplète : ${e.message}\n`);
}
process.exit(0);
