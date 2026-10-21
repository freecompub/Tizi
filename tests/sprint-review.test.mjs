// Sprint review : déclenchement par la date, document en deux parties, décisions vérifiées, rappels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, script, ROOT } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const yesterday = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
function endedSprint(repo) {
  const sp = join(repo, 'plan/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.iterations = [{ id: 'IT-1', goal: 'Bloquer les dossiers incomplets', start: '2026-10-01', end: yesterday, status: 'en_cours' }];
  writeFileSync(sp, yaml.dump(s));
}

test('déclenchement : une itération dont la date de fin est passée appelle une sprint review', () => {
  const repo = join(sandbox(), 'repo'); endedSprint(repo);
  const due = JSON.parse(node(script('plan-builder', 'due-reviews.mjs'), ['.', '--json'], { cwd: repo }).out);
  assert.equal(due[0].iteration, 'IT-1'); assert.equal(due[0].days_since_end, 2);
  const next = JSON.parse(node(script('plan-builder', 'next-step.mjs'), ['.', '--json'], { cwd: repo }).out).find(x => x.slug === 'demo');
  assert.equal(next.next.entry, 'tizi-sprint-review');
  assert.ok(checkState(yaml.load(readFileSync(join(repo, 'plan/demo/state.yaml'), 'utf8'))).some(f => f.rule === 'S58'));
});

test('sprint review : deux parties, fusions reportées dans le plan, décisions à prendre', () => {
  const repo = join(sandbox(), 'repo'); endedSprint(repo);
  const sp = join(repo, 'impl/demo/state.yaml'); const im = yaml.load(readFileSync(sp, 'utf8'));
  im.tasks = [{ id: 'TK-002', status: 'fusionnee', timeline: [{ at: '2026-10-02T08:00:00Z', event: 'prise' }, { at: '2026-10-03T08:00:00Z', event: 'fusionnée' }] }];
  writeFileSync(sp, yaml.dump(im));
  const r = node(script('plan-builder', 'close-sprint.mjs'), ['plan/demo/state.yaml', '--iteration', 'IT-1'], { cwd: repo });
  assert.equal(r.code, 0, r.err);
  const md = readFileSync(join(repo, 'plan/demo/review/IT-1/sprint-review.md'), 'utf8');
  assert.match(md, /# Partie 1 — Sprint review/); assert.match(md, /# Partie 2 — Rétrospective/);
  assert.match(md, /Reporté dans le plan comme terminé.*TK-002/);
  const plan = yaml.load(readFileSync(join(repo, 'plan/demo/state.yaml'), 'utf8'));
  assert.equal(plan.tasks.find(t => t.id === 'TK-002').status, 'terminé');
});

test('S76 et S77 : décisions manquantes après la sprint review', () => {
  const base = { document: 'plan', settings: { cadence: 'sprint' }, tasks: [{ id: 'TK-1', kind: 'dev', iteration: 'IT-2', status: 'validé' }] };
  const its = (review2) => [{ id: 'IT-1', status: 'terminé', review: { team: { date: '2026-10-01', process: { try: ['relire les PR le matin'] } } } }, { id: 'IT-2', status: 'terminé', review: review2 }];
  const codes = r => checkState({ ...base, iterations: its(r) }).map(f => f.rule);
  const c = codes({ team: { date: '2026-10-15' } });
  assert.ok(c.includes('S76')); assert.ok(c.includes('S77'));
  const ok = codes({ team: { date: '2026-10-15' }, carryover: [{ task: 'TK-1', decision: 'reporter' }], actions_followup: [{ action: 'relire les PR le matin', done: 'oui', effect: 'attente divisée par deux' }] });
  assert.ok(!ok.includes('S76')); assert.ok(!ok.includes('S77'));
});

test('rappel en début de session : sprint review due et blocage ancien, sans jamais bloquer', () => {
  const repo = join(sandbox(), 'repo'); endedSprint(repo);
  mkdirSync(join(repo, '.tizi/blocages'), { recursive: true });
  writeFileSync(join(repo, '.tizi/blocages/demo.yaml'), yaml.dump({ blocages: [{ id: 'BL-001', on: 'TK-003', cause: 'environnement', note: 'CI en panne', started: new Date(Date.now() - 5 * 864e5).toISOString(), ended: '' }] }));
  const r = node(script('plan-builder', 'session-start.mjs'), [], { cwd: repo, input: JSON.stringify({ hook_event_name: 'SessionStart', cwd: repo }) });
  assert.equal(r.code, 0); assert.match(r.out, /Sprint review due : demo IT-1/); assert.match(r.out, /BL-001 sur TK-003/);
  assert.equal(node(script('plan-builder', 'session-start.mjs'), [], { cwd: repo, input: 'pas du json' }).code, 0);
});

test('CI : prépare la sprint review due et l\'issue (simulation)', () => {
  const repo = join(sandbox(), 'repo'); endedSprint(repo);
  const r = node(script('plan-builder', 'ci-sprint-review.mjs'), ['.', '--dry-run'], { cwd: repo });
  assert.equal(r.code, 0, r.err); assert.match(r.out, /\(simulation\) issue « Sprint review due : demo IT-1 »/);
});

test('installation --ci : workflow planifié aux droits minimaux, hook de début de session', () => {
  const proj = mkdtempSync(join(tmpdir(), 'tizi-ci-'));
  assert.equal(node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', 'both', '--ci']).code, 0);
  const wf = yaml.load(readFileSync(join(proj, '.github/workflows/tizi-sprint-review.yml'), 'utf8'));
  assert.deepEqual(wf.permissions, { contents: 'read', issues: 'write' });
  assert.ok(JSON.parse(readFileSync(join(proj, '.claude/settings.json'), 'utf8')).hooks.SessionStart);
  assert.ok(JSON.parse(readFileSync(join(proj, '.github/hooks/tizi.json'), 'utf8')).hooks.SessionStart);
});
