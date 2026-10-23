// Continuité entre sessions : lecture des transcriptions Claude Code, extraits déterministes, index des sessions.
// Commun à tous les skills du SDLC. Les transcriptions sont des fichiers JSONL (une ligne par événement).
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './vendor/js-yaml.mjs';
import { isWriteTool, writtenPaths } from './agent-io.mjs';

export const SESSIONS_DIR = '.tizi/sessions';
// Index historique, en un seul fichier : encore lu, plus jamais écrit. Il était réécrit à chaque tour
// par chaque développeur, et versionné : deux personnes travaillant le même jour obtenaient un conflit
// Git sur un fichier que personne ne modifie à la main. L'index est désormais éclaté en un fichier par
// session (<date>-<id>.index.yaml) : chacun n'écrit que le sien, et il n'y a plus rien à fusionner.
export const INDEX = `${SESSIONS_DIR}/index.yaml`;
export const sessionIndexPath = (date, session) => `${SESSIONS_DIR}/${date}-${session}.index.yaml`;

// Dossiers d'initiative reconnus : <document>/<slug>/
const INITIATIVE_RE = /\b(brd|prd|sad|plan|impl|qa)\/([a-z0-9][a-z0-9-]*)\//g;
const QUESTION_RE = /[^.!?\n]*\?(?=\s|$)/g;

// Masquage des secrets probables avant toute copie (les transcriptions peuvent contenir des jetons collés par erreur).
const SECRET_RE = /(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g;
export const maskSecrets = text => String(text).replace(SECRET_RE, '[secret masqué]');

const textOf = content => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.filter(c => c?.type === 'text').map(c => c.text).join('\n');
};

// Lit une transcription et retourne les tours utiles : messages de l'utilisateur, réponses de l'assistant, outils utilisés.
// Deux formats reconnus, ligne par ligne :
//   Claude Code : { type: "user" | "assistant", message: { content } } ;
//   GitHub Copilot (CLI, et sessions Copilot de VS Code) : { type: "user.message" | "assistant.message" | "tool.execution_start", data: {...} }.
// Les messages de sous-agents (isSidechain, agentId, parentToolCallId) et les résultats d'outils sont ignorés.
export function readTranscript(path) {
  const turns = [];
  const lastAssistant = () => { for (let k = turns.length - 1; k >= 0; k--) if (turns[k].role === 'assistant') return turns[k]; return null; };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    if (e.isSidechain || e.isMeta || e.agentId || e.data?.agentId || e.data?.parentToolCallId) continue;
    const at = e.timestamp ?? '';
    // ── Copilot ──
    if (e.type === 'user.message') {
      const text = String(e.data?.content ?? '').trim();
      if (text) turns.push({ role: 'user', at, text });
      continue;
    }
    if (e.type === 'assistant.message') {
      const text = String(e.data?.content ?? '').trim();
      const tools = (e.data?.toolRequests ?? []).map(t => ({ name: t.name ?? t.toolName, input: parseArgs(t.arguments ?? t.args) }));
      if (text || tools.length) turns.push({ role: 'assistant', at, text, tools });
      continue;
    }
    if (e.type === 'tool.execution_start') {
      const tool = { name: e.data?.toolName ?? e.data?.name ?? '', input: parseArgs(e.data?.arguments ?? e.data?.args) };
      const a = lastAssistant();
      if (a) a.tools = [...(a.tools ?? []), tool]; else turns.push({ role: 'assistant', at, text: '', tools: [tool] });
      continue;
    }
    // ── Claude Code ──
    const msg = e.message ?? {};
    if (e.type === 'user') {
      const content = msg.content;
      if (Array.isArray(content) && content.every(c => c?.type === 'tool_result')) continue; // résultat d'outil, pas une parole
      const text = textOf(content).trim();
      if (text && !text.startsWith('<command-') && !text.startsWith('<local-command')) turns.push({ role: 'user', at, text });
    } else if (e.type === 'assistant') {
      const content = Array.isArray(msg.content) ? msg.content : [];
      const text = textOf(content).trim();
      const tools = content.filter(c => c?.type === 'tool_use').map(c => ({ name: c.name, input: c.input ?? {} }));
      if (text || tools.length) turns.push({ role: 'assistant', at, text, tools });
    }
  }
  return turns;
}
const parseArgs = v => { if (typeof v !== 'string') return v ?? {}; try { return JSON.parse(v); } catch { return { raw: v }; } };

export function initiativesIn(turns) {
  const found = new Set();
  for (const t of turns) {
    const hay = [t.text, ...(t.tools ?? []).map(x => JSON.stringify(x.input))].join(' ');
    for (const m of hay.matchAll(INITIATIVE_RE)) found.add(`${m[1]}/${m[2]}`);
  }
  return [...found].sort();
}

// Extrait déterministe d'une session : ce qui ne dépend d'aucune interprétation.
export function buildExtract(turns, meta) {
  const users = turns.filter(t => t.role === 'user');
  const assistants = turns.filter(t => t.role === 'assistant');
  const written = new Map();
  for (const a of assistants) for (const tl of a.tools ?? []) {
    if (!isWriteTool(tl.name)) continue;
    for (const p of writtenPaths(tl.input)) written.set(p, (written.get(p) ?? 0) + 1);
  }
  const scripts = [...new Set(assistants.flatMap(a => (a.tools ?? []).filter(t => /^(bash|powershell|run_in_terminal|shell)$/i.test(t.name)).map(t => String(t.input?.command ?? t.input?.raw ?? '')))
    .filter(c => /scripts\/[a-z-]+\.mjs/.test(c)).map(c => c.match(/scripts\/([a-z-]+\.mjs)/)[1]))];
  const ids = [...new Set(turns.flatMap(t => [t.text, ...(t.tools ?? []).map(x => JSON.stringify(x.input))].join(' ').match(/\b[A-Z]{1,4}-S?\d{1,3}\b/g) ?? []))].sort();
  const lastAssistant = [...assistants].reverse().find(a => a.text);
  const openQuestions = lastAssistant ? [...lastAssistant.text.matchAll(QUESTION_RE)].map(m => m[0].trim()).filter(q => q.length > 10) : [];
  const md = [
    `# Extrait de session — ${meta.date}`, '',
    `> Généré automatiquement depuis la transcription (${meta.session}), sans interprétation. Le condensé narratif, s'il existe, est dans le fichier \`.condense.md\` voisin.`, '',
    `**Initiatives touchées** : ${meta.initiatives.join(', ') || '—'} · **Événement** : ${meta.event} · **Tours** : ${users.length} message(s) de l'utilisateur, ${assistants.length} réponse(s)`, '',
    '## Messages de l\'utilisateur, mot pour mot', '',
    ...users.flatMap((u, i) => [`### ${i + 1}. ${u.at ? u.at.replace('T', ' ').slice(0, 16) : ''}`, '', maskSecrets(u.text).split('\n').map(l => `> ${l}`).join('\n'), '']),
    '## Questions posées par l\'assistant', '',
    ...assistants.flatMap(a => [...(a.text ?? '').matchAll(QUESTION_RE)].map(m => m[0].trim()).filter(q => q.length > 10).map(q => `- ${maskSecrets(q)}`)), '',
    '## Dernière réponse de l\'assistant', '',
    lastAssistant ? maskSecrets(lastAssistant.text).slice(0, 3000) : '_Aucune._', '',
    '## Questions en suspens à la fin de la session', '',
    ...(openQuestions.length ? openQuestions.map(q => `- ${maskSecrets(q)}`) : ['_Aucune question dans la dernière réponse._']), '',
    '## Fichiers modifiés', '',
    ...(written.size ? [...written].map(([p, n]) => `- \`${p}\` (${n} modification(s))`) : ['_Aucun._']), '',
    '## Scripts lancés', '', scripts.length ? scripts.map(s => `- ${s}`).join('\n') : '_Aucun._', '',
    '## Identifiants mentionnés', '', ids.join(', ') || '—', '',
  ];
  return md.join('\n');
}

// Index complet : l'ancien fichier unique s'il existe encore, plus un fichier par session.
// En cas de doublon, le fichier par session fait foi (il est le seul encore écrit).
export function loadIndex(root = '.') {
  const sessions = new Map();
  const legacy = join(root, INDEX);
  if (existsSync(legacy)) {
    for (const e of (yaml.load(readFileSync(legacy, 'utf8')) ?? {}).sessions ?? []) {
      if (e?.session) sessions.set(e.session, e);
    }
  }
  const dir = join(root, SESSIONS_DIR);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter(f => f.endsWith('.index.yaml')).sort()) {
      try {
        const e = yaml.load(readFileSync(join(dir, f), 'utf8'));
        if (e?.session) sessions.set(e.session, e);
      } catch { /* un index de session illisible n'empêche pas de lire les autres */ }
    }
  }
  return { sessions: [...sessions.values()].sort((a, b) => String(a.ended).localeCompare(String(b.ended))) };
}

// Écrit la seule entrée de cette session, dans son propre fichier : aucun écrivain concurrent.
export function saveSessionEntry(entry, root = '.') {
  const p = join(root, sessionIndexPath(String(entry.started ?? '').slice(0, 10) || 'sans-date', entry.session));
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  writeFileSync(tmp, `# Index d'une session — écrit par session-capture.mjs. Un fichier par session : rien à fusionner.\n${yaml.dump(entry, { lineWidth: 120 })}`);
  renameSync(tmp, p);
}
export const sessionsFor = (initiative, root = '.') => loadIndex(root).sessions.filter(s => (s.initiatives ?? []).includes(initiative));

// Consommation de tokens d'une transcription. Claude Code : message.usage (input_tokens, output_tokens, cache_*).
// Copilot : un objet de consommation sous data.usage ou usage, s'il existe ; sinon la consommation est « inconnue »,
// jamais estimée.
export function usageOf(path) {
  const u = { input: 0, output: 0, cache_read: 0, cache_write: 0, found: false };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { continue; }
    // Les sous-agents comptent aussi : leur consommation fait partie du coût de la tâche.
    const x = e.message?.usage ?? e.data?.usage ?? e.usage;
    if (!x || typeof x !== 'object') continue;
    u.found = true;
    for (const [k, v] of Object.entries(x)) {
      if (typeof v !== 'number') continue;
      const key = k.toLowerCase();
      if (/cache.*read|read.*cache|cached/.test(key)) u.cache_read += v;
      else if (/cache.*(creat|write)/.test(key)) u.cache_write += v;
      else if (/input|prompt/.test(key)) u.input += v;
      else if (/output|completion/.test(key)) u.output += v;
    }
  }
  return u.found ? { input: u.input, output: u.output, cache_read: u.cache_read, cache_write: u.cache_write, total: u.input + u.output + u.cache_read + u.cache_write } : null;
}
