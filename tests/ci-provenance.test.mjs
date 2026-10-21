// Provenance des preuves : manifeste produit en CI, passage vérifié sur le commit candidat, condition R9, audit de la CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, run, script, ROOT } from './helpers.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

function ciRepo() {
  const repo = join(sandbox(), 'repo');
  const g = (...a) => run('git', a, { cwd: repo });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('add', '-A'); g('commit', '-qm', 'candidat');
  // La CI doit produire TOUS les rapports utilisés par la matrice : on déclare aussi les suites de bout en bout et de sécurité.
  const cp = join(repo, 'impl/config.yaml'); const cfg = yaml.load(readFileSync(cp, 'utf8'));
  cfg.suites.e2e = { command: 'true', report: 'reports/e2e.xml' }; cfg.suites.security = { command: 'true', report: 'reports/security.xml' };
  writeFileSync(cp, yaml.dump(cfg)); g('add', '-A'); g('commit', '-qm', 'suites');
  const head = g('rev-parse', 'HEAD').out.trim();
  // Ce que ferait la CI : rapports regroupés et manifeste (ici sans relancer les suites).
  assert.equal(node(script('test-builder', 'ci-run-suites.mjs'), ['--sans-lancer'], { cwd: repo, env: { GITHUB_SHA: head, GITHUB_EVENT_NAME: 'push', GITHUB_RUN_ID: '42', GITHUB_WORKFLOW: 'Tizi — preuves' } }).code, 0);
  const sp = join(repo, 'qa/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.candidate_commit = head; s.settings.ci = { required: true };
  writeFileSync(sp, yaml.dump(s));
  const runs = event => JSON.stringify([{ databaseId: 42, headSha: head, status: 'completed', conclusion: 'success', event, workflowName: 'Tizi — preuves', url: 'https://github.com/x/y/actions/runs/42', createdAt: '2026-10-21T10:00:00Z' }]);
  writeFileSync(join(repo, 'runs.json'), runs('push'));
  writeFileSync(join(repo, 'runs-pr.json'), runs('pull_request'));
  writeFileSync(join(repo, 'jobs.json'), JSON.stringify({ jobs: [{ name: 'Tizi — preuves', conclusion: 'success' }] }));
  return { repo, head };
}
const fetch = (repo, runs, ...extra) => node(script('test-builder', 'ci-fetch.mjs'), ['qa/demo/state.yaml', '--runs-json', runs, '--jobs-json', 'jobs.json', '--artefact', 'tizi-preuves', ...extra], { cwd: repo });
const gate = repo => node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo }).out;

test('provenance vérifiée : passage réussi sur le commit candidat, rapports conformes au manifeste (R9)', () => {
  const { repo } = ciRepo();
  const manifest = JSON.parse(readFileSync(join(repo, 'tizi-preuves/tizi-ci-manifest.json'), 'utf8'));
  assert.ok(manifest.reports.length >= 2 && manifest.reports.every(r => /^[0-9a-f]{64}$/.test(r.sha256)));
  assert.match(gate(repo), /✗ R9 .*provenance non vérifiée/);
  const f = fetch(repo, 'runs.json', '--appliquer');
  const local = yaml.load(readFileSync(join(repo, 'qa/demo/state.yaml'), 'utf8'));
  assert.equal(f.code, 0, f.out + f.err); assert.match(f.out, /Preuves probantes : passage 42 \(push\)/);
  assert.match(gate(repo), /✓ R9 Preuves issues de la CI sur le commit candidat — passage 42/);
});

test('preuve locale refusée : un rapport utilisé que la CI n\'a pas produit ferme R9', () => {
  const repo = join(sandbox(), 'repo');
  const g = (...a) => run('git', a, { cwd: repo });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('add', '-A'); g('commit', '-qm', 'c');
  const head = g('rev-parse', 'HEAD').out.trim();
  node(script('test-builder', 'ci-run-suites.mjs'), ['--sans-lancer'], { cwd: repo, env: { GITHUB_SHA: head, GITHUB_EVENT_NAME: 'push' } });
  const sp = join(repo, 'qa/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.candidate_commit = head; s.settings.ci = { required: true }; writeFileSync(sp, yaml.dump(s));
  writeFileSync(join(repo, 'runs.json'), JSON.stringify([{ databaseId: 7, headSha: head, status: 'completed', conclusion: 'success', event: 'push', workflowName: 'Tizi — preuves', createdAt: '2026-10-21' }]));
  writeFileSync(join(repo, 'jobs.json'), JSON.stringify({ jobs: [] }));
  fetch(repo, 'runs.json', '--appliquer');
  assert.match(gate(repo), /✗ R9 .*rapport « e2e » \(reports\/e2e\.xml\) absent du passage de CI vérifié/);
});

test('provenance refusée : passage de pull request, rapport modifié', () => {
  const { repo } = ciRepo();
  const pr = fetch(repo, 'runs-pr.json');
  assert.notEqual(pr.code, 0); assert.match(pr.out, /commit de fusion/);
  fetch(repo, 'runs.json', '--appliquer');
  const s = yaml.load(readFileSync(join(repo, 'qa/demo/state.yaml'), 'utf8'));
  appendFileSync(join(repo, s.settings.reports.unit), '<!-- retouché -->');
  assert.match(gate(repo), /✗ R9 .*rapport « unit ».*absent du passage de CI vérifié/);
});

test('provenance désactivée : seulement avec une raison écrite', () => {
  const repo = join(sandbox(), 'repo');
  assert.match(gate(repo), /✓ R9 .*provenance non exigée : cas d'exemple/);
  const sp = join(repo, 'qa/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.settings.ci = { required: false }; writeFileSync(sp, yaml.dump(s));
  assert.match(gate(repo), /✗ R9 .*sans raison écrite/);
});

test('audit de la CI : workflows générés sans point bloquant ; dépôt sans CI bloqué', () => {
  const proj = mkdtempSync(join(tmpdir(), 'tizi-audit-'));
  node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', 'both', '--ci']);
  writeFileSync(join(proj, 'prot.json'), JSON.stringify({ required_status_checks: { contexts: ['Tizi — porte de PR'] }, required_pull_request_reviews: {} }));
  const a = node(join(proj, '.claude/skills/test-builder/scripts/ci-audit.mjs'), ['.', '--protection-json', 'prot.json'], { cwd: proj });
  assert.equal(a.code, 0, a.out); assert.match(a.out, /0 bloquant/);
  const wf = yaml.load(readFileSync(join(proj, '.github/workflows/tizi-pr-gate.yml'), 'utf8'));
  assert.deepEqual(wf.permissions, { contents: 'read' });
  assert.doesNotMatch(readFileSync(join(proj, '.github/workflows/tizi-pr-gate.yml'), 'utf8'), /run:[^\n]*\$\{\{ github\.event\.pull_request\.title/, 'le titre ne doit jamais être injecté dans une commande');
  writeFileSync(join(proj, 'prot.json'), JSON.stringify({ required_status_checks: { contexts: ['autre'] } }));
  assert.match(node(join(proj, '.claude/skills/test-builder/scripts/ci-audit.mjs'), ['.', '--protection-json', 'prot.json'], { cwd: proj }).out, /la porte de PR n'est pas une vérification exigée/);
  const empty = mkdtempSync(join(tmpdir(), 'tizi-noci-'));
  assert.equal(node(join(proj, '.claude/skills/test-builder/scripts/ci-audit.mjs'), [empty, '--protection-json', join(proj, 'prot.json')]).code, 1);
});
