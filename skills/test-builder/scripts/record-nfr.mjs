#!/usr/bin/env node
// Enregistre une mesure de NFR prise HORS de la CI (test de charge sur un environnement dédié, par exemple), avec ce qui
// la rend probante : le commit mesuré, qui l'a prise, quand, SUR QUOI, et l'empreinte de son rapport.
// L'environnement manquait, et `environments` — que `phase-prepare.md` ordonne de renseigner — n'était lu
// par aucun script : un « p95 = 1,4 s » sans dire sur quel environnement ni avec quelles données ne se
// compare à rien et ne se reproduit pas. La porte de release (R9)
// vérifie ensuite que ce commit est celui de la version candidate et que le rapport n'a pas changé.
// Une mesure que la CI peut produire passe plutôt par la CI, comme les autres rapports (suite dans impl/config.yaml,
// tests étiquetés @NR-xx).
// Usage : node record-nfr.mjs <qa/<slug>/state.yaml> --nr NR-01 --mesure "p95 = 1,4 s" --cible "p95 < 2 s" --conforme oui|non
//                             --rapport <chemin> --commit <sha> --par "<nom>"
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, fileSha256 } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const CLES = ['--nr', '--mesure', '--cible', '--conforme', '--rapport', '--commit', '--par', '--environnement'];
const statePath = args.find(a => !a.startsWith('--') && !CLES.includes(args[args.indexOf(a) - 1]));
const need = CLES.filter(k => !opt(k));
if (!statePath || need.length) fail(`Usage : node record-nfr.mjs <state.yaml> --nr NR-xx --mesure "…" --cible "…" --conforme oui|non --rapport <chemin> --commit <sha> --par "<nom>" --environnement ENV-xx (manque : ${need.join(', ')})`, 2);
if (!existsSync(opt('--rapport'))) fail(`Rapport introuvable : ${opt('--rapport')}. Une mesure sans rapport n'est pas une preuve.`);
const full = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${opt('--commit')}^{commit}`], { encoding: 'utf8' }).stdout?.trim() || opt('--commit');
if (!/^[0-9a-f]{7,40}$/.test(full)) fail(`Commit invalide : ${opt('--commit')}.`);
const s = loadState(statePath);
// L'environnement se prend dans le catalogue, par identifiant ou par nom. Catalogue vide : la mesure
// attend que Prepare ait fait son travail, plutôt que d'enregistrer une preuve qui ne dit pas où.
const envs = arr(s.environments);
const env = envs.find(e => e.id === opt('--environnement') || e.name === opt('--environnement'));
if (!envs.length) fail('Aucun environnement au catalogue : renseigne `environments` (phase Prepare, point 5) avant d\'enregistrer une mesure — un seuil mesuré ne se compare qu\'à environnement et jeu de données nommés.');
if (!env) fail(`Environnement « ${opt('--environnement')} » absent du catalogue. Connus : ${envs.map(e => `${e.id ?? '?'} (${e.name ?? ''})`).join(', ')}.`);
s.nfr_results = arr(s.nfr_results).filter(n => n.id !== opt('--nr'));
s.nfr_results.push({
  id: opt('--nr'), measured: opt('--mesure'), target: opt('--cible'), pass: opt('--conforme') === 'oui',
  environment: env.id ?? env.name, evidence: opt('--rapport'), evidence_sha256: fileSha256(opt('--rapport')), measured_commit: full,
  measured_by: opt('--par'), date: new Date().toISOString(), source: 'hors CI',
});
writeOut(statePath, `# État de la vérification — mesure de NFR enregistrée par record-nfr.mjs\n${yaml.dump(s, { lineWidth: 120 })}`);
console.log(`${opt('--nr')} enregistrée : ${opt('--mesure')} (cible ${opt('--cible')}, ${opt('--conforme') === 'oui' ? 'conforme' : 'non conforme'}), mesurée sur ${full.slice(0, 10)} par ${opt('--par')}, sur ${env.id ?? env.name}${env.data ? ` (données : ${env.data})` : ''}.`);
