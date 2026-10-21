#!/usr/bin/env node
// Archive les preuves d'une version candidate, une seule fois, en lecture seule, avec un manifeste d'empreintes :
// matrice, état de la vérification, rapports collectés, mesures de NFR, relevé de provenance et manifeste de la CI
// (la chaîne commit → passage de CI → rapports → matrice reste ainsi vérifiable plus tard), audit de la CI s'il existe.
// L'artefact d'un passage de CI expire (90 jours par défaut sur GitHub) : l'archive n'est durable qu'une fois commitée.
// Usage : node freeze-evidence.mjs <qa/<slug>/state.yaml>          archiver
//         node freeze-evidence.mjs <qa/<slug>/state.yaml> --check  vérifier que l'archive est intacte et commitée (code 1 sinon)
import { existsSync, copyFileSync, mkdirSync, chmodSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, basename } from 'node:path';
import { arr, loadState, writeOut, fail, fileSha256, today } from './lib/common.mjs';
import { candidateCommit } from './lib/ci.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
if (!statePath) fail('Usage : node freeze-evidence.mjs <state.yaml> [--check]', 2);
const s = loadState(statePath);
const root = dirname(statePath);
if (!s.candidate) fail('La version candidate (candidate) n\'est pas renseignée.');
const target = join(root, 'evidence', String(s.candidate).replace(/[^A-Za-z0-9._-]/g, '_'));
const git = (...a) => spawnSync('git', a, { encoding: 'utf8' });

if (args.includes('--check')) {
  if (!existsSync(join(target, 'MANIFEST.sha256'))) fail(`Aucune archive pour ${s.candidate} (${target}).`);
  const problems = [];
  for (const line of readFileSync(join(target, 'MANIFEST.sha256'), 'utf8').split('\n').filter(Boolean)) {
    const [sum, name] = line.split(/\s+/);
    if (name === 'COMMIT') continue;
    const p = join(target, name);
    if (!existsSync(p)) problems.push(`${name} manquant`); else if (fileSha256(p) !== sum) problems.push(`${name} modifié depuis l'archivage`);
  }
  const tracked = git('ls-files', '--error-unmatch', join(target, 'MANIFEST.sha256'));
  if (tracked.status !== 0) problems.push('archive non commitée : elle disparaîtra avec le poste de travail, et l\'artefact de CI expire');
  else if (git('status', '--porcelain', target).stdout.trim()) problems.push('archive modifiée ou incomplète par rapport au dernier commit');
  console.log(problems.length ? `Archive de ${s.candidate} : ${problems.join(' ; ')}.` : `Archive de ${s.candidate} intacte et commitée (${target}).`);
  process.exit(problems.length ? 1 : 0);
}

if (!existsSync(join(root, 'matrix.yaml'))) fail('Matrice absente : lance release-matrix.mjs.');
if (existsSync(target)) fail(`L'archive ${target} existe déjà : une version candidate n'est archivée qu'une fois.`);
mkdirSync(target, { recursive: true });
const ciDir = join(root, 'ci');
const ciManifests = [];
const walk = d => { if (existsSync(d)) for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : n === 'tizi-ci-manifest.json' && ciManifests.push(p); } };
if (existsSync(join(ciDir, 'manifest.json'))) ciManifests.push(join(ciDir, 'manifest.json')); else walk(ciDir);
const files = [[join(root, 'matrix.md')], [join(root, 'matrix.yaml')], [statePath, 'test-state.yaml'],
  ...Object.values(s.settings?.reports ?? {}).filter(p => p && existsSync(p)).map(p => [p]),
  ...arr(s.nfr_results).map(n => n.evidence).filter(p => p && existsSync(p)).map(p => [p]),
  ...(existsSync(join(ciDir, 'provenance.yaml')) ? [[join(ciDir, 'provenance.yaml'), 'ci-provenance.yaml']] : []),
  ...ciManifests.map(p => [p, 'ci-manifest.json']),
  ...(existsSync('.tizi/ci-audit.md') ? [['.tizi/ci-audit.md', 'ci-audit.md']] : [])];
const manifest = [];
const seen = new Set();
for (const [src, as] of files) {
  let name = as ?? basename(src);
  if (seen.has(name)) name = `${dirname(src).split('/').pop()}-${name}`;
  seen.add(name);
  copyFileSync(src, join(target, name));
  chmodSync(join(target, name), 0o444);
  manifest.push(`${fileSha256(join(target, name))}  ${name}`);
}
const commit = candidateCommit(s);
writeOut(join(target, 'MANIFEST.sha256'), `${manifest.join('\n')}\n${commit || 'inconnu'}  COMMIT\n`);
console.log(`Preuves archivées le ${today()} : ${target} (${manifest.length} fichier(s), commit ${commit ? commit.slice(0, 10) : 'inconnu'}, manifeste SHA-256).`);
console.log(`À conserver durablement : l'artefact de CI expire. Commiter l'archive :\n  git add ${target} && git commit -m "Preuves de ${s.candidate}"\npuis vérifier : node <chemin-du-skill>/scripts/freeze-evidence.mjs ${statePath} --check`);
