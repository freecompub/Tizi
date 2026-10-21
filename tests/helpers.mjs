// Outils communs de la suite de tests : copie isolée du cas d'exemple, exécution des scripts, références figées.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS = join(ROOT, 'skills');
export const FIX = join(ROOT, 'tests', 'fixtures');
export const script = (skill, name) => join(SKILLS, skill, 'scripts', name);

// Chaque test travaille sur sa propre copie de l'exemple : aucun test ne modifie l'archive.
export function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-test-'));
  cpSync(join(ROOT, 'exemple'), dir, { recursive: true });
  return dir;
}
export function run(cmd, args, { cwd, input, env } = {}) {
  const r = spawnSync(cmd, args, { cwd, input, env: { ...process.env, ...env }, encoding: 'utf8' });
  return { code: r.status, out: r.stdout ?? '', err: r.stderr ?? '' };
}
export const node = (file, args = [], opts = {}) => run(process.execPath, [file, ...args], opts);

// Références figées : UPDATE_GOLDEN=1 node --test tests/ pour les régénérer après un changement voulu.
export function golden(name, actual) {
  const p = join(ROOT, 'tests', 'golden', `${name}.json`);
  if (process.env.UPDATE_GOLDEN === '1' || !existsSync(p)) { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(actual, null, 2)}\n`); return; }
  assert.deepEqual(actual, JSON.parse(readFileSync(p, 'utf8')), `écart avec la référence figée tests/golden/${name}.json (UPDATE_GOLDEN=1 si le changement est voulu)`);
}
// Codes de règle émis par lint.mjs, triés : la « signature » de la vérification d'un état.
export const lintSignature = out => [...new Set([...out.matchAll(/\[(S\d+|L\d+)\]\s*([^\n]*)/g)].map(m => `${m[1]} ${m[2].replace(/\s+/g, ' ').trim()}`))].sort();
