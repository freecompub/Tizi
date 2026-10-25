// Adaptation des hooks entre outils : Claude Code, GitHub Copilot (CLI, agent cloud) et VS Code (agent Copilot).
// Les trois appellent un hook en lui passant un JSON sur l'entrée standard, mais les noms de champs, d'événements
// et d'outils diffèrent. Ce module ramène tout à une forme unique, et produit un refus compris par les trois.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

// Champs : snake_case (Claude Code, VS Code, Copilot configuré en PascalCase) ou camelCase (Copilot configuré en camelCase).
export function normalizeHookInput(raw) {
  const i = raw ?? {};
  return {
    event: i.hook_event_name ?? i.hookEventName ?? '',
    sessionId: String(i.session_id ?? i.sessionId ?? ''),
    transcriptPath: i.transcript_path ?? i.transcriptPath ?? '',
    cwd: i.cwd || process.cwd(),
    toolName: String(i.tool_name ?? i.toolName ?? ''),
    toolInput: parseMaybeJson(i.tool_input ?? i.toolArgs ?? i.tool_args ?? {}),
    raw: i,
  };
}
const parseMaybeJson = v => { if (typeof v !== 'string') return v ?? {}; try { return JSON.parse(v); } catch { return { raw: v }; } };

// Outils d'écriture de fichiers, selon l'outil :
//   Claude Code : Edit, Write, MultiEdit, NotebookEdit
//   Copilot (noms d'exécution) : edit, create, str_replace_editor, apply_patch — traduits en Edit / Write en mode PascalCase
//   VS Code : create_file, replace_string_in_file, multi_replace_string_in_file, insert_edit_into_file, apply_patch, edit_notebook_file, editFiles
const WRITE_TOOLS = new Set(['edit', 'write', 'multiedit', 'notebookedit', 'create', 'createfile', 'create_file', 'str_replace_editor',
  'str_replace_based_edit_tool', 'apply_patch', 'applypatch', 'replace_string_in_file', 'multi_replace_string_in_file', 'insert_edit_into_file',
  'edit_notebook_file', 'editfiles', 'edit_file', 'write_file']);
export const isWriteTool = name => WRITE_TOOLS.has(String(name).toLowerCase()) || /(^|_)(edit|write|create|replace|insert|patch)(_|$)/i.test(String(name));

// Tous les chemins qu'un appel d'outil d'écriture va toucher. Un correctif apply_patch peut en contenir plusieurs.
export function writtenPaths(toolInput) {
  const t = toolInput ?? {};
  const paths = new Set();
  for (const k of ['file_path', 'filePath', 'path', 'notebook_path', 'notebookPath', 'target_file', 'targetFile']) if (typeof t[k] === 'string') paths.add(t[k]);
  for (const k of ['files', 'filePaths', 'replacements', 'edits']) for (const x of Array.isArray(t[k]) ? t[k] : []) {
    if (typeof x === 'string') paths.add(x);
    else if (x && typeof x === 'object') for (const kk of ['file_path', 'filePath', 'path']) if (typeof x[kk] === 'string') paths.add(x[kk]);
  }
  const patch = typeof t.input === 'string' ? t.input : typeof t.patch === 'string' ? t.patch : typeof t.raw === 'string' ? t.raw : '';
  for (const m of patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)) paths.add(m[1].trim());
  for (const m of patch.matchAll(/^\*\*\* Move to: (.+)$/gm)) paths.add(m[1].trim());
  for (const m of patch.matchAll(/^\+\+\+ b\/(.+)$/gm)) paths.add(m[1].trim());
  return [...paths];
}

// Outils de shell : un agent y lance les scripts du SDLC, et il peut aussi y écrire des fichiers.
export const isShellTool = name => /^(bash|powershell|run_in_terminal|shell|run_command|runcommands)$/i.test(String(name ?? ''));

// Les écritures faites au shell. Un agent qui écrit avec `cat > f <<'EOF'` ou `tee` ne passe par aucun
// outil d'écriture : sur le premier dossier réel, huit fichiers ont été créés et l'extrait de session
// affichait « Fichiers modifiés : _Aucun._ ». On n'interprète pas le shell — seulement la redirection
// et `tee`, qui désignent leur cible sans ambiguïté. Le reste n'est pas devinable, et l'extrait dit
// alors combien de commandes il n'a pas pu lire plutôt que de conclure qu'il n'y a rien eu.
const SHELL_WRITE_RE = /(?:^|[|;&(]|\s)(?:>>?\s*|tee\s+(?:-a\s+)?)(['"]?)((?!\/dev\/)[\w./~@+-]+)\1/g;
export function shellWrittenPaths(command) {
  const paths = new Set();
  for (const m of String(command ?? '').matchAll(SHELL_WRITE_RE)) paths.add(m[2]);
  return [...paths];
}

// Refus compris par les trois outils :
//   - Claude Code et VS Code : code de sortie 2, message sur la sortie d'erreur, renvoyé à l'agent ;
//   - Copilot : toute sortie non nulle d'un hook preToolUse refuse l'appel ; la raison est aussi donnée en JSON sur la sortie standard.
export function deny(message) {
  const reason = message;
  process.stdout.write(`${JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: reason, hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } })}\n`);
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

// Transcription d'une session Copilot CLI quand le hook ne fournit pas de chemin (SessionEnd n'en donne pas).
export function copilotTranscript(sessionId) {
  if (!sessionId) return '';
  const bases = [process.env.COPILOT_HOME, process.env.XDG_STATE_HOME && join(process.env.XDG_STATE_HOME, '.copilot'), join(homedir(), '.copilot')].filter(Boolean);
  for (const b of bases) { const p = join(b, 'session-state', sessionId, 'events.jsonl'); if (existsSync(p)) return p; }
  return '';
}
