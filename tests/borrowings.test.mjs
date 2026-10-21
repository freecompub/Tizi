// Emprunts à BMAD-METHOD : fiches et compréhension gelées, règles des ADR, collisions, lentilles de revue,
// déclenchement des skills, rétrospective sourcée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sandbox, node, script, ROOT } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import { overlaps } from '../evals/description-overlap.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const codes = s => checkState(s).map(f => f.rule);

test('S71 : un ADR accepté porte la divergence qu\'il empêche et sa règle', () => {
  const adr = extra => ({ document: 'sad', decisions: [{ id: 'ADR-1', status: 'accepté', drivers: ['AD-1'], options: [{ name: 'a' }, { name: 'b' }], outcome: 'a', decided_by: 'X', consequences: { bad: ['x'] }, confirmation: 'test', ...extra }] });
  assert.ok(codes(adr({})).includes('S71'));
  assert.ok(!codes(adr({ prevents: 'deux validations divergentes', rule: 'toute validation passe par CP-01' })).includes('S71'));
});

test('S72 : collision entre tâches sans dépendance sur le même élément', () => {
  const plan = deps => ({ document: 'plan', settings: { cadence: 'sprint' }, tasks: [
    { id: 'TK-1', kind: 'dev', elements: ['CP-01'], iteration: 'IT-1', status: 'validé' },
    { id: 'TK-2', kind: 'dev', elements: ['CP-01'], iteration: 'IT-1', status: 'validé', depends_on: deps }] });
  assert.ok(codes(plan([])).includes('S72'));
  assert.ok(!codes(plan(['TK-1'])).includes('S72'), 'une dépendance lève la collision');
});

test('fiche de contexte : mesurée au rendu, gelée par son empreinte dans le handoff', () => {
  const dir = sandbox();
  const r = node(script('plan-builder', 'render-plan.mjs'), ['plan/demo/state.yaml'], { cwd: dir });
  assert.match(r.out, /Fiches de contexte : .*TK-002 ≈ \d+/);
  const h = yaml.load(readFileSync(join(dir, 'plan/demo/handoff/v1.0/handoff.yaml'), 'utf8'));
  assert.ok(h.tasks.every(t => /^[0-9a-f]{64}$/.test(t.context_sha256) && t.context_tokens > 0));
});

test('compréhension gelée : une modification après validation bloque l\'écriture', () => {
  const repo = join(sandbox(), 'repo');
  const sp = join(repo, 'impl/demo/state.yaml');
  const s = yaml.load(readFileSync(sp, 'utf8'));
  const t = s.tasks.find(x => x.id === 'TK-002');
  t.understanding = { ...t.understanding, restatement: 'Refuser la transmission d\'un dossier incomplet en nommant la pièce.', questions: [], approved_by: '' };
  writeFileSync(sp, yaml.dump(s));
  assert.equal(node(script('impl-builder', 'approve-understanding.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002', '--by', 'Samir'], { cwd: repo }).code, 0);
  const write = () => node(script('impl-builder', 'tdd-guard.mjs'), [], { cwd: repo, input: JSON.stringify({ cwd: repo, tool_name: 'Write', tool_input: { file_path: 'test/unit/x.test.js' } }) });
  assert.equal(write().code, 0, 'compréhension validée : écrire un test est permis');
  const s2 = yaml.load(readFileSync(sp, 'utf8'));
  s2.tasks.find(x => x.id === 'TK-002').understanding.restatement += ' Et aussi envoyer un courriel.';
  writeFileSync(sp, yaml.dump(s2));
  const r = write();
  assert.equal(r.code, 2); assert.match(r.err, /modifiée après sa validation/);
  const g = node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo });
  assert.match(g.out, /✗ Compréhension validée par un humain, et inchangée depuis — modifiée après validation/);
});

test('déclenchement des skills : descriptions assez distinctes', () => {
  const worst = overlaps(0.3)[0];
  assert.ok(worst.jaccard < 0.3, `${worst.a} et ${worst.b} se chevauchent à ${worst.jaccard}`);
});

test('déclenchement des skills : le banc mesure un routeur simulé', () => {
  const r = node(join(ROOT, 'evals/run-triggers.mjs'), ['--agent', 'claude', '--runs', '1', '--agent-cmd', `node ${join(ROOT, 'evals/mock-trigger.mjs')} {prompt}`], { cwd: ROOT });
  assert.equal(r.code, 0, r.err);
  const report = readFileSync(r.out.match(/Rapport : (.*report\.md)/)[1], 'utf8');
  assert.match(report, /## Entraînement \(\d+ requêtes, \d+ correctes\)/);
  assert.match(report, /## Test/);
  assert.doesNotMatch(report.split("## Échecs de l'entraînement")[1], /\[test\]/, 'les échecs du test ne sont pas détaillés');
});

test('rétrospective : preuves sourcées pour une itération', () => {
  const repo = join(sandbox(), 'repo');
  const r = node(script('plan-builder', 'retro-evidence.mjs'), ['plan/demo/state.yaml', '--iteration', 'IT-1'], { cwd: repo });
  assert.equal(r.code, 0, r.err);
  const md = readFileSync(join(repo, 'plan/demo/review/IT-1/preuves.md'), 'utf8');
  assert.match(md, /## Sources lues/); assert.match(md, /TK-002/); assert.match(md, /`impl\/demo\/state\.yaml`/);
});
