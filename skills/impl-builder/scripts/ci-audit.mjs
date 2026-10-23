#!/usr/bin/env node
// Audit de la configuration de CI du dépôt : la CI vérifie-t-elle ce qu'elle doit vérifier ?
//   - la porte de PR (pr-gate.mjs --run) est rejouée sur les pull requests ;
//   - les preuves de release (ci-run-suites.mjs, manifeste) sont produites et publiées comme artefact ;
//   - les permissions des workflows sont déclarées et minimales ; pas de pull_request_target ;
//   - les actions tierces sont épinglées (sinon, avertissement) ;
//   - la branche principale exige ces vérifications avant fusion (gh, lecture seule ; « non vérifiable » sans droit).
// Écrit .tizi/ci-audit.md. Code 1 si un point bloquant manque.
// Usage : node ci-audit.mjs [racine] [--branche main] [--protection-json <f>] (sans réseau : réponse enregistrée)
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, today, table } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const root = args.find(a => !a.startsWith('--') && !['--branche', '--protection-json'].includes(args[args.indexOf(a) - 1])) ;
if (!root) { console.error('Usage : node ci-audit.mjs <dépôt>. Le dépôt est explicite : ce script écrit .tizi/ci-audit.md. Pour le dépôt courant : node ci-audit.mjs .'); process.exit(2); }
const branch = opt('--branche') || 'main';
const dir = join(root, '.github', 'workflows');
const wfs = existsSync(dir) ? readdirSync(dir).filter(f => /\.ya?ml$/.test(f)).map(f => { const text = readFileSync(join(dir, f), 'utf8'); let doc = null; try { doc = yaml.load(text); } catch { doc = null; } return { file: f, text, doc }; }) : [];
const findings = []; // [niveau, constat, détail]
const add = (lvl, what, detail = '') => findings.push([lvl, what, detail]);
const onOf = d => { const on = d?.on ?? d?.true; return typeof on === 'string' ? [on] : Array.isArray(on) ? on : Object.keys(on ?? {}); };
const jobNames = [];

if (!wfs.length) add('bloquant', 'aucun workflow de CI', `${dir} absent ou vide`);
for (const w of wfs) {
  if (!w.doc) { add('bloquant', `${w.file} : YAML illisible`); continue; }
  const triggers = onOf(w.doc);
  if (triggers.includes('pull_request_target')) add('bloquant', `${w.file} : déclencheur pull_request_target`, 'exécute du code de la PR avec les droits du dépôt ; utiliser pull_request');
  const perms = [w.doc.permissions, ...Object.values(w.doc.jobs ?? {}).map(j => j?.permissions)].filter(p => p !== undefined);
  if (!perms.length) add('à corriger', `${w.file} : permissions non déclarées`, 'le jeton peut alors avoir des droits d\'écriture par défaut ; déclarer `permissions:` au niveau du workflow');
  for (const p of perms) {
    if (p === 'write-all') add('bloquant', `${w.file} : permissions write-all`);
    else if (p && typeof p === 'object') for (const [k, v] of Object.entries(p)) if (v === 'write' && !['issues', 'pull-requests', 'checks', 'statuses'].includes(k)) add('à corriger', `${w.file} : droit d'écriture « ${k} »`, 'à justifier : la vérification n\'a besoin que de lire');
  }
  for (const m of w.text.matchAll(/uses:\s*([^\s#]+)@([^\s#]+)/g)) if (!/^[0-9a-f]{40}$/.test(m[2])) add('avertissement', `${w.file} : ${m[1]}@${m[2]} non épinglée sur un commit`, 'une étiquette peut être déplacée ; épingler sur un SHA complet');
  for (const [id, j] of Object.entries(w.doc.jobs ?? {})) jobNames.push(j?.name ?? id);
}
const prGate = wfs.find(w => /pr-gate\.mjs[^\n]*--run/.test(w.text) && onOf(w.doc).includes('pull_request'));
if (!prGate) add('bloquant', 'porte de PR non rejouée en CI', 'aucun workflow sur pull_request ne lance `pr-gate.mjs … --run` : ce qui échappe au garde-fou n\'est arrêté nulle part (install.mjs --ci le génère)');
const proofs = wfs.find(w => /ci-run-suites\.mjs/.test(w.text) && /upload-artifact/.test(w.text));
if (!proofs) add('bloquant', 'preuves de release non produites en CI', 'aucun workflow ne lance `ci-run-suites.mjs` et ne publie l\'artefact de preuves : la porte de release ne pourra pas vérifier la provenance (R9)');
else if (!onOf(proofs.doc).some(t => ['push', 'workflow_dispatch', 'release'].includes(t))) add('bloquant', `${proofs.file} : preuves produites seulement sur pull request`, 'une pull request teste un commit de fusion : il faut aussi un passage sur push, tag ou lancement manuel');

// Protection de la branche principale (lecture seule).
let protection = null, protectionNote = '';
if (opt('--protection-json')) protection = JSON.parse(readFileSync(opt('--protection-json'), 'utf8'));
else {
  const repo = spawnSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { cwd: root, encoding: 'utf8' });
  const r = repo.status === 0 ? spawnSync('gh', ['api', `repos/${repo.stdout.trim()}/branches/${branch}/protection`], { cwd: root, encoding: 'utf8' }) : repo;
  if (r.status === 0) protection = JSON.parse(r.stdout); else protectionNote = (r.stderr || r.error?.message || 'gh indisponible').trim().split('\n')[0];
}
if (protection) {
  const required = [...(protection.required_status_checks?.contexts ?? []), ...(protection.required_status_checks?.checks ?? []).map(c => c.context)];
  const gateJobs = prGate ? Object.entries(prGate.doc.jobs ?? {}).map(([id, j]) => j?.name ?? id) : [];
  if (!required.length) add('bloquant', `branche ${branch} : aucune vérification exigée avant fusion`);
  else if (gateJobs.length && !gateJobs.some(n => required.includes(n))) add('bloquant', `branche ${branch} : la porte de PR n'est pas une vérification exigée`, `exigées : ${required.join(', ')} ; porte : ${gateJobs.join(', ')}`);
  if (!protection.required_pull_request_reviews) add('à corriger', `branche ${branch} : aucune relecture humaine exigée avant fusion`);
} else add('non vérifiable', `protection de la branche ${branch}`, `${protectionNote || 'pas de réponse'} — vérifier à la main, ou lancer avec un jeton qui peut lire l'administration du dépôt`);

const order = { bloquant: 0, 'à corriger': 1, avertissement: 2, 'non vérifiable': 3 };
findings.sort((a, b) => order[a[0]] - order[b[0]]);
const blocking = findings.filter(f => f[0] === 'bloquant').length;
const md = [`# Audit de la CI — ${today()}`, '', `${wfs.length} workflow(s) lu(s) dans \`.github/workflows/\`. ${blocking ? `**${blocking} point(s) bloquant(s).**` : 'Aucun point bloquant.'}`, '',
  findings.length ? table(['Niveau', 'Constat', 'Détail'], findings) : '_Rien à signaler._', '',
  '## Ce que la CI doit faire pour Tizi', '', '- rejouer la **porte de PR** sur chaque pull request, et l\'exiger avant fusion ;', '- produire les **preuves de release** sur le commit lui-même (push, tag ou lancement manuel), avec leur manifeste, publiés comme artefact ;', '- n\'avoir que les **droits** nécessaires, et des actions **épinglées**.', '',
  '`install.mjs --ci` génère les workflows correspondants ; la protection de la branche se règle dans GitHub.', ''];
writeOut(join(root, '.tizi', 'ci-audit.md'), md.join('\n'));
for (const f of findings) console.log(`${f[0] === 'bloquant' ? '✗' : f[0] === 'non vérifiable' ? '?' : '⚠'} [${f[0]}] ${f[1]}${f[2] ? ` — ${f[2]}` : ''}`);
console.log(`Audit de la CI : ${blocking} bloquant(s) — ${join(root, '.tizi', 'ci-audit.md')}`);
if (blocking) process.exitCode = 1;
