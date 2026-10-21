// Outils communs aux skills impl-builder (étape 5) et test-builder (étape 6) :
// correspondance de chemins (globs), lecture des rapports de tests, extraction des identifiants de traçabilité.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// ── Globs ────────────────────────────────────────────────────────────────────
// Prend en charge **, * et ? ; suffisant pour des listes de dossiers de projet.
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*'; i += glob[i + 2] === '/' ? 2 : 1; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
export const matchesAny = (path, globs = []) => globs.some(g => globToRegExp(g).test(path));
export const toPosix = p => p.split(sep).join('/');

// ── Identifiants de traçabilité ──────────────────────────────────────────────
export const TRACE_RE = /\b(AC|EX|NR|TH|PJ|FR|PB)-\d+\b/g;
export const idsIn = text => [...new Set(String(text ?? '').match(TRACE_RE) ?? [])];

// ── Rapports ─────────────────────────────────────────────────────────────────
// Résultat normalisé : { total, failed, skipped, cases: [{ name, status: passed|failed|skipped, ids: [] }] }
export function parseJUnit(xml) {
  const cases = [];
  const re = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const attrs = m[1], body = m[3] ?? '';
    const attr = k => (attrs.match(new RegExp(`\\b${k}="([^"]*)"`)) ?? [])[1] ?? '';
    const name = `${attr('classname')} ${attr('name')}`.trim();
    const status = /<(failure|error)\b/.test(body) ? 'failed' : /<skipped\b/.test(body) ? 'skipped' : 'passed';
    cases.push({ name, status, ids: idsIn(name) });
  }
  return summarize(cases);
}

export function parseCucumber(json) {
  const features = typeof json === 'string' ? JSON.parse(json) : json;
  const cases = [];
  for (const f of features ?? []) {
    const ftags = (f.tags ?? []).map(t => t.name);
    for (const sc of f.elements ?? []) {
      if (sc.type === 'background') continue;
      const tags = [...ftags, ...(sc.tags ?? []).map(t => t.name)];
      const statuses = (sc.steps ?? []).map(s => s.result?.status);
      const status = statuses.some(s => s === 'failed' || s === 'undefined' || s === 'ambiguous') ? 'failed'
        : statuses.length && statuses.every(s => s === 'passed') ? 'passed' : statuses.some(s => s === 'pending') ? 'failed' : 'skipped';
      cases.push({ name: sc.name, status, ids: idsIn(`${tags.join(' ')} ${sc.name}`) });
    }
  }
  return summarize(cases);
}

// Rapport au format du schéma « mutation-testing-report » (Stryker, et outils compatibles).
export function parseMutation(json) {
  const r = typeof json === 'string' ? JSON.parse(json) : json;
  const count = { Killed: 0, Timeout: 0, Survived: 0, NoCoverage: 0, other: 0 };
  for (const f of Object.values(r.files ?? {})) for (const mu of f.mutants ?? []) count[mu.status in count ? mu.status : 'other']++;
  const detected = count.Killed + count.Timeout, undetected = count.Survived + count.NoCoverage;
  return { ...count, score: detected + undetected ? Math.round((detected / (detected + undetected)) * 1000) / 10 : null };
}

function summarize(cases) {
  return { total: cases.length, failed: cases.filter(c => c.status === 'failed').length, skipped: cases.filter(c => c.status === 'skipped').length, cases };
}

export function readReport(path) {
  if (!path || !existsSync(path)) return null;
  const text = readFileSync(path, 'utf8');
  if (/\.xml$/i.test(path)) return parseJUnit(text);
  const json = JSON.parse(text);
  if (Array.isArray(json)) return parseCucumber(json);
  if (json.files && json.schemaVersion !== undefined) return parseMutation(json);
  if (json.files) return parseMutation(json);
  throw new Error(`format de rapport non reconnu : ${path}`);
}

// Fichiers d'un dossier, filtrés par globs (chemins relatifs à la racine, au format POSIX).
export function listFiles(root, globs, ignore = ['node_modules', '.git', 'reports']) {
  const out = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      if (ignore.includes(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else { const rel = toPosix(relative(root, p)); if (matchesAny(rel, globs)) out.push(rel); }
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}
