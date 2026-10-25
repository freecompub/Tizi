// Application existante : adoption, comportements à préserver, tests de caractérisation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, cpSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { FIX, node, run, sandbox, script, tempDir } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

test('adoption : pile détectée sans rien exécuter, carte prouvée, configuration jamais écrasée', () => {
  const dir = tempDir('tizi-adopt');
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

// Première adoption sur un vrai dépôt — celui de Tizi — et trois défauts d'un coup : la commande
// proposée échouait sur un ENOENT faute de dossier de rapport, elle perdait le chemin des tests
// déclaré par le projet (donc Node balayait tout le dépôt), et `paths.production` restait vide, ce qui
// rendait le garde-fou TDD muet en silence.
test('adoption : la commande proposée tourne telle quelle, garde le chemin des tests, et ne cache pas un périmètre vide', () => {
  const dir = tempDir('tizi-adopt-node');
  mkdirSync(join(dir, 'tests'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'outil', scripts: { test: 'node --test tests/*.test.mjs' } }, null, 2));
  writeFileSync(join(dir, 'tests/un.test.mjs'), "import { test } from 'node:test';\ntest('vrai', () => {});\n");
  const r = node(script('impl-builder', 'adopt.mjs'), ['.'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  const cfg = yaml.load(readFileSync(join(dir, 'impl/config.yaml'), 'utf8'));
  const cmd = cfg.suites.unit.command;
  assert.match(cmd, /tests\/\*\.test\.mjs/, 'le chemin déclaré par le projet est perdu : Node balaierait tout le dépôt');
  assert.match(cmd, /^mkdir -p reports && /, 'la commande ne crée pas son dossier de rapport : elle échoue sur un ENOENT à la main');
  // Et elle tourne telle quelle, dans le dépôt adopté : c'est ce que .tizi/adoption.md étape 1 demande.
  // NODE_TEST_CONTEXT est posé par le `node --test` qui exécute CE test : laissé en place, le
  // `node --test` de la commande parlerait le protocole du parent au lieu d'écrire son rapport.
  const lance = run('sh', ['-c', cmd], { cwd: dir, env: { NODE_TEST_CONTEXT: undefined } });
  assert.equal(lance.code, 0, `la commande proposée échoue : ${lance.err}`);
  assert.ok(existsSync(join(dir, 'reports/unit.xml')), 'le rapport JUnit n\'a pas été produit');
  // Pile non reconnue : production reste vide, et ça doit être dit, pas caché.
  assert.deepEqual(cfg.paths.production, [], 'aucune pile reconnue ici : la liste est vide, c\'est attendu');
  const md = readFileSync(join(dir, '.tizi/adoption.md'), 'utf8');
  assert.match(md, /aucun chemin de code de production établi/, 'un périmètre de production vide passe sous silence');
  assert.match(md, /`paths.production` est vide/, 'les étapes suivantes ne disent pas de le renseigner');
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

// adopt.mjs prenait ses fixtures pour l'application : un vrai package.json et un vrai projet Xcode
// posés sous tests/fixtures/ étaient cartographiés comme l'existant à préserver, puis repris par la
// conception et protégés par des tests de caractérisation. Lancé sur le dépôt de Tizi lui-même, il
// proposait ses propres fixtures comme conteneurs. On les écarte — mais jamais en silence.
test('adoption : fixtures et exemples écartés de la carte, signalés, et réintégrables', () => {
  const dir = tempDir('tizi-fx');
  // L'application est à la racine ; une copie de la même pile vit sous tests/fixtures/ et sous examples/.
  cpSync(join(FIX, 'depot-existant'), dir, { recursive: true });
  mkdirSync(join(dir, 'tests/fixtures/ancien'), { recursive: true });
  cpSync(join(FIX, 'depot-existant'), join(dir, 'tests/fixtures/ancien'), { recursive: true });
  mkdirSync(join(dir, 'examples/vitrine'), { recursive: true });
  cpSync(join(FIX, 'depot-existant'), join(dir, 'examples/vitrine'), { recursive: true });

  const r = node(script('impl-builder', 'adopt.mjs'), ['.'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  const map = yaml.load(readFileSync(join(dir, '.tizi/adoption.yaml'), 'utf8'));

  // Aucun élément ne doit venir des fixtures ou des exemples.
  const dirs = map.elements.flatMap(e => e.dirs ?? []).concat(map.elements.flatMap(e => e.evidence ?? []));
  assert.ok(!dirs.some(d => /(^|\/)(tests|fixtures|examples)\//.test(d)), `carte polluée : ${dirs.filter(d => /(tests|fixtures|examples)\//.test(d)).join(', ')}`);
  // L'application de la racine, elle, est bien vue.
  assert.ok(map.elements.some(e => (e.evidence ?? []).some(x => x.startsWith('web/package.json'))), 'l\'application de la racine doit être cartographiée');

  // Et c'est dit, avec le moyen de revenir dessus.
  const md = readFileSync(join(dir, '.tizi/adoption.md'), 'utf8');
  assert.match(md, /tests\/fixtures\/ancien\/web\/package\.json écarté/);
  assert.match(md, /examples\/vitrine\/web\/package\.json écarté/);
  assert.match(md, /--inclure tests\/fixtures\/ancien\/web/);

  // --inclure réintègre un chemin précis, et lui seul.
  const r2 = node(script('impl-builder', 'adopt.mjs'), ['.', '--force', '--inclure', 'examples/vitrine'], { cwd: dir });
  assert.equal(r2.code, 0, r2.err);
  const map2 = yaml.load(readFileSync(join(dir, '.tizi/adoption.yaml'), 'utf8'));
  const ev2 = map2.elements.flatMap(e => e.evidence ?? []);
  assert.ok(ev2.some(x => x.startsWith('examples/vitrine/web/package.json')), '--inclure doit réintégrer le chemin demandé');
  assert.ok(!ev2.some(x => x.startsWith('tests/fixtures/ancien/')), 'les autres restent écartés');
});
