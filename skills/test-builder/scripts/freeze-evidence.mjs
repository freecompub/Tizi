#!/usr/bin/env node
// Archive les preuves d'une version candidate : matrice, rapports collectés et mesures, avec un manifeste d'empreintes SHA-256.
// Usage : node freeze-evidence.mjs <qa/<slug>/state.yaml>
import { existsSync, copyFileSync, mkdirSync, chmodSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { arr, loadState, writeOut, fail, fileSha256, today } from './lib/common.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node freeze-evidence.mjs <state.yaml>', 2);
const s = loadState(statePath);
const root = dirname(statePath);
if (!s.candidate) fail('La version candidate (candidate) n\'est pas renseignée.');
if (!existsSync(join(root, 'matrix.yaml'))) fail('Matrice absente : lance release-matrix.mjs.');
const target = join(root, 'evidence', String(s.candidate).replace(/[^A-Za-z0-9._-]/g, '_'));
if (existsSync(target)) fail(`L'archive ${target} existe déjà : une version candidate n'est archivée qu'une fois.`);
mkdirSync(target, { recursive: true });
const files = [join(root, 'matrix.md'), join(root, 'matrix.yaml'), statePath,
  ...Object.values(s.settings?.reports ?? {}).filter(p => p && existsSync(p)),
  ...arr(s.nfr_results).map(n => n.evidence).filter(p => p && existsSync(p))];
const manifest = [];
for (const f of [...new Set(files)]) {
  const name = basename(f) === 'state.yaml' ? 'test-state.yaml' : basename(f);
  copyFileSync(f, join(target, name));
  chmodSync(join(target, name), 0o444);
  manifest.push(`${fileSha256(join(target, name))}  ${name}`);
}
writeOut(join(target, 'MANIFEST.sha256'), `${manifest.join('\n')}\n`);
console.log(`Preuves archivées le ${today()} : ${target} (${manifest.length} fichier(s), manifeste SHA-256).`);
