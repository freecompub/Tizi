// Outils communs de la suite de tests : copie isolée du cas d'exemple, exécution des scripts, références figées.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SKILLS = join(ROOT, 'skills');
export const FIX = join(ROOT, 'tests', 'fixtures');
export const script = (skill, name) => join(SKILLS, skill, 'scripts', name);

// Rend une copie entièrement modifiable : cpSync preserve les modes, et freeze-version.mjs met les
// versions figees en lecture seule (0o444). Git ne porte pas ce mode : la suite passerait sur un clone
// neuf et echouerait dans l'arbre de travail ou le gel a eu lieu. On le neutralise sur la copie.
function makeWritable(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { chmodSync(p, 0o755); makeWritable(p); }
    else if (e.isFile()) chmodSync(p, (statSync(p).mode & 0o777) | 0o200);
  }
}

// Un test qui laisse son bac à sable derrière lui salit la machine de qui lance la suite. La suite
// comptait 29 appels à `mkdtempSync` pour 8 suppressions : une centaine de mégaoctets par passe, jamais
// reprise. En CI le conteneur est jeté et ça ne se voit pas ; en local ça s'accumule jusqu'au quota
// disque — c'est arrivé, après une trentaine de passes, avec 2 665 dossiers abandonnés dans /tmp.
// Même défaut que `.tizi/ci-audit.md` : lancer la vérification ne doit salir ni le dépôt, ni la machine.
const temporaires = [];
export function tempDir(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix.endsWith('-') ? prefix : `${prefix}-`));
  temporaires.push(d);
  return d;
}
// Conservés sur demande, quand il faut inspecter ce qu'un test a produit : TIZI_GARDER_TMP=1.
process.on('exit', () => {
  if (process.env.TIZI_GARDER_TMP === '1') {
    if (temporaires.length) console.log(`\nBacs à sable conservés : ${temporaires.join(' ')}`);
    return;
  }
  for (const d of temporaires) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* à la sortie, il n'y a plus rien à tenter */ }
  }
});

// Chaque test travaille sur sa propre copie de l'exemple : aucun test ne modifie l'archive.
export function sandbox() {
  const dir = tempDir('tizi-test');
  cpSync(join(ROOT, 'exemple'), dir, { recursive: true });
  makeWritable(dir);
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
  if (process.env.UPDATE_GOLDEN === '1') { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, `${JSON.stringify(actual, null, 2)}\n`); return; }
  // Une référence absente était régénérée en silence : le filet se recousait autour du trou, et un
  // fichier supprimé ou renommé ne faisait plus échouer personne. Elle doit être créée volontairement.
  assert.ok(existsSync(p), `référence figée absente : tests/golden/${name}.json — UPDATE_GOLDEN=1 node --test tests/ pour la créer volontairement`);
  assert.deepEqual(actual, JSON.parse(readFileSync(p, 'utf8')), `écart avec la référence figée tests/golden/${name}.json (UPDATE_GOLDEN=1 si le changement est voulu)`);
}
// Codes de règle émis par lint.mjs, triés : la « signature » de la vérification d'un état.
export const lintSignature = out => [...new Set([...out.matchAll(/\[(S\d+|L\d+)\]\s*([^\n]*)/g)].map(m => `${m[1]} ${m[2].replace(/\s+/g, ' ').trim()}`))].sort();
