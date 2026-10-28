// Chaîne BRD → PRD → conception → plan → exécution : vérification, rendu, intégrité des handoffs, verrous.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, cpSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { sandbox, node, script, golden, lintSignature, tempDir, FIX } from './helpers.mjs';

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

test('le col scelle le document, pas seulement l\'état (source_doc)', () => {
  const dir = sandbox();
  const h = join(dir, 'brd/demo/handoff/v1.0/handoff.yaml');
  const frozen = join(dir, 'brd/demo/versions/v1.0');
  const verify = () => node(script('prd-builder', 'verify-handoff.mjs'), [h], { cwd: dir });
  assert.equal(verify().code, 0, 'handoff intact');

  // Le document figé est ce que relisent et approuvent les personnes : l'altérer doit fermer le col.
  // Avant le scellement du document, seul l'état était couvert et cette modification passait.
  const doc = join(frozen, 'brd.md');
  writeFileSync(doc, `ALTÉRÉ\n${readFileSync(doc, 'utf8')}`);
  const alt = verify();
  assert.notEqual(alt.code, 0, 'document figé altéré : doit être refusé');
  assert.match(alt.err + alt.out, /document figé d'origine \(brd\.md\) a été modifié/);
  writeFileSync(doc, readFileSync(doc, 'utf8').replace('ALTÉRÉ\n', ''));
  assert.equal(verify().code, 0, 'document rétabli');

  // Vider l'empreinte et recalculer le .sha256 voisin désarmait le contrôle en silence.
  const etat = join(frozen, 'state.yaml');
  appendFileSync(etat, '\n# tampered\n');
  assert.notEqual(verify().code, 0, 'état figé altéré : doit être refusé');
  writeFileSync(h, readFileSync(h, 'utf8').replace(/source_state: [0-9a-f]{64}/, "source_state: ''"));
  writeFileSync(`${h}.sha256`, `${createHash('sha256').update(readFileSync(h)).digest('hex')}  handoff.yaml\n`);
  const vide = verify();
  assert.notEqual(vide.code, 0, 'empreinte vidée : le contrôle ne doit pas être sauté');
  assert.match(vide.err + vide.out, /ne porte pas l'empreinte de sa version figée/);
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

// Le garde-fou ci-dessus — `undefined` et `[object Object]` interdits dans un document généré — est
// juste, et il n'a rien vu pendant des mois : `exemple/brd/demo` ne renseigne ni `problem.symptoms`,
// ni `problem.impact`, ni `current_process`. Un contrôle ne vaut que l'état qu'on lui donne à lire.
// Sur le deuxième dossier réel, le BRD figé en 0.2 et envoyé à cinq relecteurs portait DIX
// `[object Object]` — sept symptômes et trois impacts, tous renseignés et sourcés dans l'état — et
// annonçait « Aucun élément » sous « Processus actuel » là où l'état tenait sept étapes sourcées,
// parce que `current_process` était une liste nue quand `target_process` est un objet portant
// `.events`. Cette fixture renseigne, dans la forme que le gabarit documente, les collections que le
// cas d'exemple laisse vides.
test('brd : chaque forme documentée du gabarit se rend dans le document', () => {
  const dir = tempDir('tizi-formes');
  mkdirSync(join(dir, 'brd', 'formes'), { recursive: true });
  cpSync(join(FIX, 'brd-formes-documentees.yaml'), join(dir, 'brd', 'formes', 'state.yaml'));
  const r = node(script('brd-builder', 'render-brd.mjs'), ['brd/formes/state.yaml'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  const md = readFileSync(join(dir, 'brd', 'formes', 'brd.md'), 'utf8');
  assert.doesNotMatch(md, /undefined|\[object Object\]|NaN/, 'valeur non rendue dans le document');

  // Chaque valeur renseignée paraît, avec ce qui la qualifie : sa source, son type, sa raison.
  for (const [quoi, motif] of [
    ['un symptôme', /- Un symptôme porte son texte et sa source \(SRC-01\)/],
    ['un impact, avec son type', /- \*\*risque\*\* — Un impact porte son type, son texte et sa source \(SRC-01\)/],
    ['une étape du processus actuel', /- Le dossier arrive au bureau — Awa \(SH-01\) \(SRC-01\)/],
    ['un impact organisationnel', /- Le bureau relance les familles attendues \(SRC-01\)/],
    ['une inclusion de périmètre, avec sa raison', /- Ce qui est dans le périmètre — parce qu'une inclusion se justifie/],
    ['une exclusion de périmètre, avec sa raison', /- Ce qui en sort — parce que rien ne sort en silence/],
  ]) assert.match(md, motif, `${quoi} ne se rend pas`);

  // Et la section « Processus actuel » ne dit pas « Aucun élément » quand l'état en porte.
  const actuel = md.split('### Processus actuel')[1].split('### Processus cible')[0];
  assert.doesNotMatch(actuel, /Aucun élément/, 'le processus actuel est rendu vide alors que l\'état en porte');
});
