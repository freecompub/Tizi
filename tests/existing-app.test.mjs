// Application existante : adoption, comportements à préserver, tests de caractérisation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, appendFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, script, FIX } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

test('adoption : pile détectée sans rien exécuter, carte prouvée, configuration jamais écrasée', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-adopt-'));
  cpSync(join(FIX, 'depot-existant'), dir, { recursive: true });
  const r = node(script('impl-builder', 'adopt.mjs'), ['.'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /4 conteneur\(s\), 1 composant\(s\)/);
  const map = yaml.load(readFileSync(join(dir, '.tizi/adoption.yaml'), 'utf8'));
  assert.ok(map.elements.every(e => e.evidence.length > 0 && e.lifecycle === 'existant_conservé'), 'chaque élément prouvé, existant');
  assert.equal(map.elements.find(e => e.kind === 'component').parent, 'CT-01', 'les routes d\'API sont un composant de l\'application web');
  assert.equal(map.elements.filter(e => e.subtype === 'datastore').length, 1, 'une seule base, vue par Prisma et docker-compose');
  const cfg = yaml.load(readFileSync(join(dir, 'impl/config.yaml'), 'utf8'));
  assert.match(cfg.suites['unit-web'].command, /vitest run --reporter=junit/);
  assert.match(cfg.suites['unit-ios'].command, /xcodebuild test .* -scheme Diabeo/);
  writeFileSync(join(dir, 'impl/config.yaml'), '# écrit à la main\n');
  assert.match(node(script('impl-builder', 'adopt.mjs'), ['.'], { cwd: dir }).out, /existe déjà : non modifié/);
  assert.equal(readFileSync(join(dir, 'impl/config.yaml'), 'utf8'), '# écrit à la main\n');
});

test('comportements à préserver : exigés sur un produit existant, avec preuve (S73)', () => {
  const prd = extra => checkState({ document: 'prd', phase: 'specify', existing_product: true, ...extra }).map(f => f.rule);
  assert.ok(prd({}).includes('S73'));
  assert.ok(prd({ preserved_behaviors: [{ id: 'PB-01', behavior: 'x' }] }).includes('S73'), 'sans preuve');
  assert.ok(!prd({ preserved_behaviors: [{ id: 'PB-01', behavior: 'x', evidence: ['SRC-001'] }] }).includes('S73'));
});

test('comportement à préserver sans test : une tâche doit le protéger (S51)', () => {
  const plan = preserves => checkState({ document: 'plan', settings: { cadence: 'sprint' }, tasks: [{ id: 'TK-1', kind: 'dev', status: 'validé', preserves }] }, { refs: { prd: { preserved_behaviors: [{ id: 'PB-01', behavior: 'x', test: 'à écrire' }] } } }).filter(f => f.id === 'PB-01').map(f => f.rule);
  assert.ok(plan([]).includes('S51'));
  assert.ok(!plan(['PB-01']).includes('S51'));
});

test('caractérisation : figer l\'existant avant le premier test rouge (C9)', () => {
  const repo = join(sandbox(), 'repo');
  const fz = join(repo, 'plan/demo/versions/v1.0/state.yaml');
  const plan = yaml.load(readFileSync(fz, 'utf8'));
  plan.tasks.find(t => t.id === 'TK-002').preserves = ['PB-01'];
  writeFileSync(fz, yaml.dump(plan));
  const gate = () => node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo }).out;
  assert.match(gate(), /✗ Existant figé par des tests de caractérisation/);
  const runs = join(repo, '.impl/runs.jsonl');
  const lines = readFileSync(runs, 'utf8').trim().split('\n');
  const char = JSON.stringify({ task: 'TK-002', suite: 'unit', at: '2026-10-20T00:00:00Z', total: 1, failed: 0, characterization: true });
  writeFileSync(runs, [char, ...lines].join('\n') + '\n');
  const g = gate();
  assert.match(g, /✓ Existant figé par des tests de caractérisation/);
  assert.match(g, /✓ TDD : au moins un test vu en échec avant le premier vert/, 'la caractérisation verte ne compte pas dans le cycle rouge–vert');
});

test('release : un comportement à préserver est une exigence à prouver (PB)', () => {
  const repo = join(sandbox(), 'repo');
  const refsP = join(repo, 'plan/demo/versions/v1.0/refs.yaml');
  const refs = yaml.load(readFileSync(refsP, 'utf8'));
  refs.prd.preserved_behaviors = [{ id: 'PB-01', behavior: 'L\'accusé part au partenaire', test: 'à écrire' }];
  writeFileSync(refsP, yaml.dump(refs));
  const r = node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo });
  assert.match(readFileSync(join(repo, 'qa/demo/matrix.md'), 'utf8'), /PB-01 \| non-régression/);
  assert.notEqual(r.code, 0, 'non prouvé : porte fermée');
});

test('réalisé et prouvé : un réalisé non prouvé ferme la porte (R8), écarts listés', () => {
  const repo = join(sandbox(), 'repo');
  const matrix = () => { const r = node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo }); return { code: r.code, out: r.out, md: readFileSync(join(repo, 'qa/demo/matrix.md'), 'utf8') }; };
  let m = matrix();
  assert.match(m.out, /✓ R8/);
  assert.match(m.md, /\*\*Non réalisé\*\*[\s\S]*- FR-002 \(non commencé\)/, 'FR non commencée : décision demandée');
  assert.match(m.md, /\| FR-002 \|.*\| dérogation \|/, 'une preuve par dérogation n\'est pas affichée comme prouvée');
  // FR-001 entièrement réalisée (tâches fusionnées) mais son critère n'est plus prouvé : la porte se ferme.
  const sp = join(repo, 'impl/demo/state.yaml');
  const st = yaml.load(readFileSync(sp, 'utf8'));
  st.tasks = [{ id: 'TK-002', status: 'fusionnee' }, { id: 'TK-003', status: 'fusionnee' }, { id: 'TK-007', status: 'fusionnee' }];
  writeFileSync(sp, yaml.dump(st));
  writeFileSync(join(repo, 'reports/acceptance.xml'), '<testsuites><testcase classname="a" name="[EX-002] dossier complet transmis"/><testcase classname="a" name="[EX-004] message"/><testcase classname="a" name="[AC-099] hors plan"/></testsuites>');
  m = matrix();
  assert.notEqual(m.code, 0);
  assert.match(m.out, /✗ R8 Rien de réalisé sans être prouvé — réalisé mais non prouvé : FR-001/);
  assert.match(m.md, /\*\*Prouvé sans être prévu\*\*[\s\S]*- AC-099/);
});
