// Chaîne BRD → PRD → conception → plan → exécution : vérification, rendu, intégrité des handoffs, verrous.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { sandbox, node, script, golden, lintSignature, FIX } from './helpers.mjs';

const DOCS = { brd: 'brd-builder', prd: 'prd-builder', sad: 'sad-builder', plan: 'plan-builder' };
const RENDER = { brd: ['render-brd.mjs', 'brd.md'], prd: ['render-prd.mjs', 'prd.md'], sad: ['render-sad.mjs', 'sad.md'], plan: ['render-plan.mjs', 'plan.md'] };

for (const [doc, skill] of Object.entries(DOCS)) {
  test(`${doc} : la vérification émet exactement les constats attendus`, () => {
    const dir = sandbox();
    const r = node(script(skill, 'lint.mjs'), [`${doc}/demo/state.yaml`], { cwd: dir });
    assert.equal(r.code, 0, r.err);
    golden(`lint-${doc}`, lintSignature(r.out));
  });
  test(`${doc} : le document se génère, avec la mention de relecture humaine`, () => {
    const dir = sandbox();
    const [scr, out] = RENDER[doc];
    const r = node(script(skill, scr), [`${doc}/demo/state.yaml`], { cwd: dir });
    assert.equal(r.code, 0, r.err);
    const md = readFileSync(join(dir, doc, 'demo', out), 'utf8');
    assert.match(md, /## Relecture humaine/);
    assert.doesNotMatch(md, /undefined|\[object Object\]/, 'valeur non rendue dans le document');
  });
}

test('handoffs : intègres, puis refusés une fois altérés', () => {
  const dir = sandbox();
  for (const doc of ['brd', 'prd', 'sad', 'plan']) {
    const hdir = join(dir, doc, 'demo', 'handoff');
    if (!existsSync(hdir)) continue;
    for (const v of readdirSync(hdir)) {
      const h = join(hdir, v, 'handoff.yaml');
      assert.equal(node(script('brd-builder', 'verify-handoff.mjs'), [h], { cwd: dir }).code, 0, `${doc} ${v} devrait être intègre`);
      appendFileSync(h, '\n# altération\n');
      assert.notEqual(node(script('brd-builder', 'verify-handoff.mjs'), [h], { cwd: dir }).code, 0, `${doc} ${v} altéré devrait être refusé`);
    }
  }
});

test('exécuteur : refuse un plan d\'opérations non approuvé, puis altéré', () => {
  const dir = sandbox();
  const prep = node(script('plan-builder', 'plan-operations.mjs'), ['plan/demo/state.yaml', '--target', 'github', '--offline'], { cwd: dir });
  assert.equal(prep.code, 0, prep.err);
  const ops = 'plan/demo/exports/github/operations.yaml';
  const r1 = node(script('backlog-executor', 'apply-operations.mjs'), [ops, '--state', 'plan/demo/state.yaml', '--dry-run'], { cwd: dir });
  assert.notEqual(r1.code, 0); assert.match(r1.out + r1.err, /aucune approbation/);
  appendFileSync(join(dir, ops), '\n# altération\n');
  const r2 = node(script('backlog-executor', 'apply-operations.mjs'), [ops, '--state', 'plan/demo/state.yaml', '--dry-run'], { cwd: dir });
  assert.notEqual(r2.code, 0); assert.match(r2.out + r2.err, /empreinte|intégrité|altér/i);
});

test('pont design thinking : propositions sans modifier l\'état', () => {
  const dir = sandbox();
  const before = readFileSync(join(dir, 'brd/demo/state.yaml'), 'utf8');
  const r = node(script('brd-builder', 'ingest-dt-handoff.mjs'), [join(FIX, 'dt-handoff-summary.md'), 'brd/demo/state.yaml'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /1 contrainte\(s\) · 1 hypothèse\(s\) · 3 zone\(s\) d'ombre · 1 document\(s\)/);
  assert.equal(readFileSync(join(dir, 'brd/demo/state.yaml'), 'utf8'), before, 'l\'état ne doit pas être modifié');
});
