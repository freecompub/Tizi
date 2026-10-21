#!/usr/bin/env node
// Provenance des preuves d'une version candidate. Cherche, en lecture seule (gh), le passage de CI sur le commit EXACT
// de la version candidate ; vérifie qu'il a réussi en entier ; télécharge ses rapports et son manifeste ; contrôle que
// le manifeste porte sur ce commit et que chaque rapport a l'empreinte annoncée. Écrit qa/<slug>/ci/provenance.yaml,
// que la porte de release exige (R9).
// Un passage déclenché par une pull request teste un commit de fusion temporaire, pas le commit candidat : il n'est pas
// retenu. Les preuves d'une release viennent d'un passage sur le commit lui-même (push, tag, lancement manuel).
//
// Usage : node ci-fetch.mjs <qa/<slug>/state.yaml> [--appliquer]
//   --appliquer : reporte les chemins des rapports téléchargés dans settings.reports de l'état.
// Sans réseau (tests) : --runs-json <f> --jobs-json <f> --artefact <dossier déjà téléchargé>
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, fileSha256, today } from './lib/common.mjs';
import { candidateCommit } from './lib/ci.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--runs-json', '--jobs-json', '--artefact'].includes(args[args.indexOf(a) - 1]));
if (!statePath) fail('Usage : node ci-fetch.mjs <qa/<slug>/state.yaml> [--appliquer]', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const ci = { workflow: 'Tizi — preuves', artifact: 'tizi-preuves', events: ['push', 'workflow_dispatch', 'release', 'schedule'], allow_skipped: [], ...(s.settings?.ci ?? {}) };
const sha = candidateCommit(s);
if (!sha) fail(`Commit de la version candidate introuvable : renseigner candidate_commit, ou créer le tag « ${s.candidate} ».`);
const gh = (...a) => { const r = spawnSync('gh', a, { encoding: 'utf8' }); if (r.status !== 0) fail(`gh a échoué (${a.slice(0, 3).join(' ')}) : ${(r.stderr || r.error?.message || '').trim()}. Vérifier que gh est installé et authentifié en lecture.`); return r.stdout; };

const problems = [];
// 1. Le passage de CI sur ce commit.
const runs = JSON.parse(opt('--runs-json') ? readFileSync(opt('--runs-json'), 'utf8') : gh('run', 'list', '--commit', sha, '--json', 'databaseId,headSha,status,conclusion,event,workflowName,url,createdAt', '--limit', '50'));
const mine = runs.filter(r => r.workflowName === ci.workflow && r.headSha === sha);
const usable = mine.filter(r => ci.events.includes(r.event)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
if (!mine.length) problems.push(`aucun passage du workflow « ${ci.workflow} » sur le commit ${sha.slice(0, 10)}`);
else if (!usable.length) problems.push(`passage(s) seulement sur ${[...new Set(mine.map(r => r.event))].join(', ')} : un passage de pull request teste un commit de fusion, pas le commit candidat`);
const run = usable[0];
let jobs = [];
if (run) {
  if (run.status !== 'completed') problems.push(`le passage ${run.databaseId} n'est pas terminé (${run.status})`);
  else if (run.conclusion !== 'success') problems.push(`le passage ${run.databaseId} n'a pas réussi (${run.conclusion})`);
  jobs = JSON.parse(opt('--jobs-json') ? readFileSync(opt('--jobs-json'), 'utf8') : gh('run', 'view', String(run.databaseId), '--json', 'jobs')).jobs ?? [];
  for (const j of jobs) if (j.conclusion !== 'success' && !(j.conclusion === 'skipped' && arr(ci.allow_skipped).includes(j.name))) problems.push(`job « ${j.name} » : ${j.conclusion || j.status}`);
}
// 2. Les rapports et leur manifeste.
const dest = opt('--artefact') || join(root, 'ci', sha.slice(0, 12));
if (run && !opt('--artefact')) gh('run', 'download', String(run.databaseId), '-n', ci.artifact, '-D', dest);
const files = []; const walk = d => { if (existsSync(d)) for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : files.push(p); } }; walk(dest);
const manifestFile = files.find(f => basename(f) === 'tizi-ci-manifest.json');
const manifest = manifestFile ? JSON.parse(readFileSync(manifestFile, 'utf8')) : null;
const reports = [];
if (!manifest) problems.push(`manifeste de provenance absent de l'artefact « ${ci.artifact} »`);
else {
  if (manifest.commit !== sha) problems.push(`le manifeste porte sur ${String(manifest.commit).slice(0, 10)}, pas sur le commit candidat ${sha.slice(0, 10)}`);
  if (!ci.events.includes(manifest.event)) problems.push(`manifeste produit par un déclenchement « ${manifest.event} »`);
  for (const r of arr(manifest.reports)) {
    // L'artefact peut avoir retiré le dossier commun (reports/) : on cherche le fichier par son chemin, puis sans premier segment.
    const local = [join(dest, r.path), join(dest, r.path.split('/').slice(1).join('/'))].find(p => existsSync(p));
    const ok = !!local && fileSha256(local) === r.sha256;
    if (!ok) problems.push(`rapport ${r.path} : ${local ? 'empreinte différente de celle du manifeste' : 'absent de l\'artefact'}`);
    reports.push({ suite: r.suite, path: local ?? '', sha256: r.sha256, verified: ok });
  }
  for (const m of arr(manifest.missing)) problems.push(`la CI n'a pas produit le rapport de la suite « ${m} »`);
}
const provenance = { candidate: s.candidate, commit: sha, checked: today(), verified: !problems.length,
  run: run ? { id: run.databaseId, url: run.url, workflow: run.workflowName, event: run.event, conclusion: run.conclusion } : null,
  jobs: jobs.map(j => ({ name: j.name, conclusion: j.conclusion })), reports, problems };
// Le manifeste vérifié est conservé à côté du relevé, quel que soit l'endroit d'où il vient : l'archive le reprend.
if (manifestFile) writeOut(join(root, 'ci', 'manifest.json'), readFileSync(manifestFile, 'utf8'));
writeOut(join(root, 'ci', 'provenance.yaml'), `# Provenance des preuves — ci-fetch.mjs\n${yaml.dump(provenance, { lineWidth: 120 })}`);
if (args.includes('--appliquer') && reports.length) {
  s.settings = s.settings ?? {}; s.settings.reports = { ...(s.settings.reports ?? {}) };
  for (const r of reports.filter(x => x.verified)) s.settings.reports[r.suite] = r.path;
  writeOut(statePath, `# État de la vérification — rapports reportés depuis la CI par ci-fetch.mjs\n${yaml.dump(s, { lineWidth: 120 })}`);
}
console.log(provenance.verified ? `Preuves probantes : passage ${run.databaseId} (${run.event}) réussi sur ${sha.slice(0, 10)}, ${reports.length} rapport(s) vérifié(s).` : `Preuves NON probantes :\n${problems.map(p => `  - ${p}`).join('\n')}`);
if (!provenance.verified) process.exitCode = 1;
