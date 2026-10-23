#!/usr/bin/env node
// À lancer DANS la CI. Exécute les suites de tests déclarées dans impl/config.yaml (toutes, même si l'une échoue,
// pour collecter chaque rapport), puis écrit le manifeste de provenance : commit testé, passage de CI, workflow,
// type de déclenchement, et empreinte SHA-256 de chaque rapport. /tizi-test (ci-fetch.mjs) vérifie ensuite que ces
// preuves portent exactement sur le commit de la version candidate.
// Une suite marquée « ci: false » dans impl/config.yaml n'est pas lancée ici (par exemple les tests iOS sur un
// exécuteur Linux) ; elle doit alors l'être par un autre workflow qui produit son propre manifeste.
// Les rapports, où qu'ils soient (web/reports/, reports/…), sont copiés dans un dossier unique (tizi-preuves/ par défaut)
// en gardant leur chemin d'origine, avec le manifeste : c'est ce dossier que la CI publie comme artefact.
// Usage : node ci-run-suites.mjs [--config impl/config.yaml] [--dossier tizi-preuves] [--sans-lancer]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, fileSha256, fail } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const cfgPath = opt('--config', 'impl/config.yaml');
const outDir = opt('--dossier', 'tizi-preuves');
const manifestPath = join(outDir, 'tizi-ci-manifest.json');
// Exécuter des commandes de shell venues d'un fichier du dépôt ne peut pas être un comportement par
// défaut : l'intention est déclarée. --lancer exécute les suites (ce que fait la CI), --sans-lancer
// se contente de regrouper les rapports déjà présents et d'écrire le manifeste.
if (!args.includes('--lancer') && !args.includes('--sans-lancer')) {
  fail('Usage : node ci-run-suites.mjs --lancer | --sans-lancer [--config impl/config.yaml] [--dossier tizi-preuves]\n'
    + '  --lancer       exécute les commandes des suites de impl/config.yaml (c\'est ce que lance la CI) ;\n'
    + '  --sans-lancer  n\'exécute rien : regroupe les rapports déjà présents et écrit le manifeste.', 2);
}
if (!existsSync(cfgPath)) fail(`Configuration absente : ${cfgPath}.`);
const cfg = yaml.load(readFileSync(cfgPath, 'utf8')) ?? {};
const git = (...a) => { const r = spawnSync('git', a, { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
const env = process.env;

const results = [];
for (const [name, s] of Object.entries(cfg.suites ?? {})) {
  if (!s?.command || s.ci === false) continue;
  if (!args.includes('--sans-lancer')) {
    if (s.report) { mkdirSync(dirname(s.report), { recursive: true }); rmSync(s.report, { force: true }); }
    console.log(`▶ ${name} : ${s.command}`);
    const r = spawnSync(s.command, { shell: true, stdio: 'inherit' });
    results.push({ suite: name, exit: r.status });
  } else results.push({ suite: name, exit: null });
}
const reports = Object.entries(cfg.suites ?? {}).filter(([, s]) => s?.report && s.ci !== false && existsSync(s.report))
  .map(([name, s]) => ({ suite: name, path: s.report, sha256: fileSha256(s.report), bytes: statSync(s.report).size }));
const manifest = {
  tool: 'tizi', version: 1,
  commit: env.GITHUB_SHA || git('rev-parse', 'HEAD'),
  event: env.GITHUB_EVENT_NAME || 'local',
  ref: env.GITHUB_REF || git('rev-parse', '--abbrev-ref', 'HEAD'),
  repository: env.GITHUB_REPOSITORY || '',
  workflow: env.GITHUB_WORKFLOW || '',
  run_id: env.GITHUB_RUN_ID || '',
  run_attempt: env.GITHUB_RUN_ATTEMPT || '',
  created_at: new Date().toISOString(),
  suites: results, reports,
  missing: Object.entries(cfg.suites ?? {}).filter(([, s]) => s?.report && s.ci !== false && !existsSync(s.report)).map(([n]) => n),
};
for (const r of reports) { mkdirSync(dirname(join(outDir, r.path)), { recursive: true }); copyFileSync(r.path, join(outDir, r.path)); }
writeOut(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Manifeste de provenance : ${manifestPath} — commit ${manifest.commit.slice(0, 10)}, ${reports.length} rapport(s)${manifest.missing.length ? `, manquant(s) : ${manifest.missing.join(', ')}` : ''}.`);
if (results.some(r => r.exit !== null && r.exit !== 0)) { console.error(`Suite(s) en échec : ${results.filter(r => r.exit).map(r => r.suite).join(', ')}.`); process.exitCode = 1; }
