// Défauts : signalement, recherche de l'attente, tri, exigence contredite, résolution par test de régression, porte R10.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sandbox, node, script, ROOT } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const def = (repo, ...a) => node(script('test-builder', 'defect.mjs'), ['demo', ...a], { cwd: repo });
const gate = repo => { const r = node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo }); return { out: r.out, md: readFileSync(join(repo, 'qa/demo/matrix.md'), 'utf8'), y: yaml.load(readFileSync(join(repo, 'qa/demo/matrix.yaml'), 'utf8')) }; };

test('signalement : version et auteur obligatoires ; tri : un défaut nomme son attente, un changement son décideur', () => {
  const repo = join(sandbox(), 'repo');
  assert.notEqual(def(repo, '--signaler', '--titre', 'x', '--observe', 'y').code, 0);
  assert.equal(def(repo, '--signaler', '--titre', 'Transmission sans justificatif', '--observe', 'le dossier part sans justificatif de domicile', '--version', '1.0.0-rc1', '--par', 'Chloé').code, 0);
  assert.match(def(repo, '--trier', 'DEF-001', '--classement', 'defaut', '--severite', 'majeur', '--attendu', 'refus').err, /nomme l'attente qu'il contredit/);
  assert.match(def(repo, '--trier', 'DEF-001', '--classement', 'changement').err, /adressée à qui décide/);
});

test('recherche de l\'attente : le critère et l\'exemple concernés arrivent en tête, avec leur preuve', () => {
  const repo = join(sandbox(), 'repo');
  node(script('test-builder', 'release-matrix.mjs'), ['qa/demo/state.yaml'], { cwd: repo });
  const r = JSON.parse(node(script('test-builder', 'find-expectations.mjs'), ['demo', 'le bouton Transmettre accepte un dossier sans justificatif de domicile', '--json'], { cwd: repo }).out);
  const top = r.slice(0, 3).map(x => x.id);
  assert.ok(top.includes('EX-001') && (top.includes('AC-001') || top.includes('RG-001')), top.join(','));
  assert.match(r.find(x => x.id === 'EX-001').proof, /prouvé/);
  assert.match(node(script('test-builder', 'find-expectations.mjs'), ['demo', 'la couleur du logo est fausse'], { cwd: repo }).out, /c'est une question/);
});

test('défaut ouvert : exigence contredite, test insuffisant signalé, porte fermée ; résolu par un test de régression', () => {
  const repo = join(sandbox(), 'repo');
  def(repo, '--signaler', '--titre', 'Transmission sans justificatif', '--observe', 'le dossier part', '--version', '1.0.0-rc1', '--par', 'Chloé');
  let g = gate(repo);
  assert.match(g.out, /✗ R10 .*à trier : DEF-001/);
  def(repo, '--trier', 'DEF-001', '--classement', 'defaut', '--exigence', 'AC-001', '--attendu', 'la transmission est refusée', '--severite', 'majeur', '--par', 'Chloé');
  g = gate(repo);
  assert.match(g.out, /✗ R10 .*ouverts : DEF-001 \(majeur\)/);
  assert.equal(g.y.requirements.find(r => r.id === 'AC-001').status, 'contredit');
  assert.equal(g.y.functional.find(f => f.id === 'FR-001').proof, 'contredit');
  assert.match(g.md, /Prouvé puis contredit[\s\S]*AC-001 \(DEF-001\)/);
  // Le test de régression, étiqueté @DEF-001, passe sur la version candidate : le défaut est résolu.
  const acc = join(repo, 'reports/acceptance.xml');
  writeFileSync(acc, readFileSync(acc, 'utf8').replace('</testsuites>', '<testcase classname="régression" name="[DEF-001][AC-001] refus sans justificatif, même par le bouton"/></testsuites>'));
  g = gate(repo);
  assert.match(g.out, /✓ R10/);
  assert.equal(g.y.requirements.find(r => r.id === 'AC-001').status, 'prouvé');
  assert.equal(g.y.defects.find(d => d.id === 'DEF-001').resolved, true);
});

test('reprise depuis GitHub : signalements à trier, sans doublon à la relance', () => {
  const repo = join(sandbox(), 'repo');
  writeFileSync(join(repo, 'bugs.json'), JSON.stringify([{ number: 12, title: 'Message illisible', body: 'Version : 1.0.0-rc1\nLe message ne nomme pas la pièce', author: { login: 'chloe' }, createdAt: '2026-10-20T10:00:00Z', url: 'https://github.com/x/y/issues/12', labels: [{ name: 'bug' }] }]));
  const imp = () => node(script('test-builder', 'import-defects.mjs'), ['demo', '--github', '--json', 'bugs.json'], { cwd: repo }).out;
  assert.match(imp(), /1 bug\(s\) repris/); assert.match(imp(), /0 bug\(s\) repris comme signalements à trier, 1 déjà présent/);
  const d = yaml.load(readFileSync(join(repo, '.tizi/defauts/demo.yaml'), 'utf8')).defauts[0];
  assert.equal(d.status, 'à_trier'); assert.equal(d.found_in, '1.0.0-rc1'); assert.equal(d.source, 'github#12');
});

test('voie rapide : sans épopée signalée (S78), rattachée à l\'épopée de l\'exigence corrigée', () => {
  const plan = attach => checkState({ document: 'plan', settings: { cadence: 'sprint' }, stories: [{ id: 'US-9', title: 'Corriger DEF-001', lane: 'rapide', origin: { type: 'defaut', ref: 'DEF-001' }, size: 'S', ...(attach ? { attach_to: 'ACT-01' } : {}) }] }).map(f => f.rule);
  assert.ok(plan(false).includes('S78')); assert.ok(!plan(true).includes('S78'));
  const repo = join(sandbox(), 'repo');
  const sp = join(repo, 'plan/demo/state.yaml'); const s = yaml.load(readFileSync(sp, 'utf8'));
  s.stories.find(x => x.id === 'US-003').attach_to = 'ACT-01'; writeFileSync(sp, yaml.dump(s));
  assert.match(gate(repo).md, /### ACT-01 Transmettre[\s\S]*US-003/);
});

// Le point d'étape ne connaissait que 9 des 10 points d'entrée : tizi-bug n'était jamais proposé, et
// les signalements à trier n'apparaissaient nulle part — seul le hook de début de session les
// mentionnait. Or ils ferment la porte de release tant qu'ils ne sont pas triés.
test('point d\'étape : un signalement à trier propose tizi-bug et se voit dans les notes', () => {
  const repo = join(sandbox(), 'repo');
  const etape = () => JSON.parse(node(script('test-builder', 'next-step.mjs'), ['.', '--json'], { cwd: repo }).out).find(x => x.slug === 'demo');

  const avant = etape();
  assert.notEqual(avant.next.entry, 'tizi-bug', 'sans signalement, tizi-bug n\'a rien à faire là');
  assert.ok(!avant.notes.some(n => /signalement/.test(n)));

  assert.equal(node(script('test-builder', 'defect.mjs'), ['demo', '--signaler', '--titre', 'Dossier incomplet transmis',
    '--observe', 'le dossier part sans la pièce manquante', '--version', '1.0.0-rc1', '--par', 'Chloé'], { cwd: repo }).code, 0);

  const apres = etape();
  assert.equal(apres.next.entry, 'tizi-bug', 'un signalement à trier passe devant');
  assert.match(apres.next.why, /1 signalement\(s\) à trier \(DEF-001\)/);
  assert.match(apres.next.why, /ferment la porte de release/);
  assert.ok(apres.notes.some(n => /1 signalement\(s\) à trier : tizi-bug/.test(n)), 'et il est dit dans les points à noter');

  // Trié, il ne monopolise plus l'étape suivante.
  assert.equal(node(script('test-builder', 'defect.mjs'), ['demo', '--trier', 'DEF-001', '--classement', 'non_reproductible'], { cwd: repo }).code, 0);
  assert.notEqual(etape().next.entry, 'tizi-bug');
});

// Les dix points d'entrée doivent être atteignables : un point d'entrée que rien ne propose jamais est
// un point d'entrée que personne ne trouve.
test('point d\'étape : tous les points d\'entrée du SDLC sont joignables', () => {
  const source = yaml.load(readFileSync(join(ROOT, 'entrypoints/entrypoints.yaml'), 'utf8')).entrypoints.map(e => e.name);
  const code = readFileSync(join(ROOT, 'skills/brd-builder/scripts/next-step.mjs'), 'utf8');
  const cites = source.filter(n => n !== 'tizi' && new RegExp(`'${n}'`).test(code));
  const manquants = source.filter(n => n !== 'tizi' && !cites.includes(n));
  assert.deepEqual(manquants, [], `points d'entrée jamais proposés par next-step.mjs : ${manquants.join(', ')}`);
});

// La porte de release comptait deux verdicts, et `[].every()` rend `true` : une condition sans mesure
// s'affichait ✓. Sur le dépôt d'exemple, retirer les rapports donnait « ✓ R1 Toutes les suites
// collectées passent — aucun rapport », et R6 comme R7 disparaissaient de la table — une condition
// qu'on ne voit pas ne se discute pas. Trois états désormais, et « incomplète » n'est pas « ouverte ».
test('porte de release : une condition non mesurée s\'affiche « ? », jamais ✓, et reste dans la table', () => {
  const repo = join(sandbox(), 'repo');
  const etat = join(repo, 'qa/demo/state.yaml');
  // Intact : tout est mesuré, la porte s'ouvre — pas de régression sur le cas nominal.
  let g = gate(repo);
  assert.equal(g.y.verdict, 'ouverte');
  assert.ok(g.y.gate.every(c => c.ok === true && c.mesure), 'une condition de l\'exemple intact n\'est pas satisfaite');

  // Plus aucun rapport collecté, plus aucune session exploratoire.
  const s = yaml.load(readFileSync(etat, 'utf8'));
  for (const k of Object.keys(s.settings.reports)) s.settings.reports[k] = '';
  s.exploratory = [];
  writeFileSync(etat, yaml.dump(s, { lineWidth: 120 }));
  g = gate(repo);
  const par = Object.fromEntries(g.y.gate.map(c => [c.code, c]));
  for (const code of ['R1', 'R5', 'R6', 'R7']) {
    assert.equal(par[code]?.ok, null, `${code} rend un verdict sur une mesure absente`);
    assert.equal(par[code]?.mesure, false, `${code} se dit mesurée`);
  }
  assert.match(g.out, /\? R1 .*non mesuré : aucun rapport collecté/);
  assert.match(g.out, /\? R5 .*non mesuré : aucune session exploratoire/);
  assert.match(g.md, /\? R6/, 'R6 a disparu de la table au lieu de s\'y dire non mesurée');
  assert.match(g.md, /\? R7/, 'R7 a disparu de la table au lieu de s\'y dire non mesurée');
  assert.equal(g.y.open, false);

  // Un seuil à 0 ne compare rien : « pose ton seuil à 0 et dis-le par écrit » était la doctrine, et
  // RIEN ne lisait cet écrit — R6 passait au vert sur un seuil à 0, sans une ligne de raison. Un seuil
  // qui éteint une mesure passe désormais par une dérogation nommée, comme un seuil non atteint.
  s.settings.thresholds = { ...s.settings.thresholds, mutation: 0 };
  writeFileSync(etat, yaml.dump(s, { lineWidth: 120 }));
  const r6 = gate(repo).y.gate.find(c => c.code === 'R6');
  assert.equal(r6.ok, null, 'un seuil à 0 passe au vert sans que rien ne dise pourquoi');
  assert.match(r6.detail, /seuil à 0 : la mesure n'est pas jugée, et aucune dérogation nommée ne dit pourquoi/);

  // Et une dérogation ne compte que si elle dit pourquoi ET qui l'a approuvée.
  s.waivers = [{ metric: 'mutation', reason: 'aucun outil de mutation sur cette pile' }];
  writeFileSync(etat, yaml.dump(s, { lineWidth: 120 }));
  const muette = gate(repo).y.gate.find(c => c.code === 'R6');
  assert.equal(muette.ok, null, 'une dérogation sans approbateur éteint la mesure');
  assert.match(muette.detail, /dérogation qui ne dit pas qui l'a approuvée/);

  s.waivers = [{ metric: 'mutation', reason: 'aucun outil de mutation sur cette pile', approved_by: 'Alice' }];
  writeFileSync(etat, yaml.dump(s, { lineWidth: 120 }));
  const assumee = gate(repo);
  const r6ok = assumee.y.gate.find(c => c.code === 'R6');
  assert.equal(r6ok.ok, true, 'une dérogation nommée n\'assume pas le seuil');
  assert.match(r6ok.detail, /hors périmètre assumé : aucun outil de mutation sur cette pile \(approuvé par Alice\)/);
  // La table des dérogations dit lesquelles comptent, et ce qui manque aux autres.
  assert.match(assumee.md, /Une dérogation ne compte que si elle dit pourquoi \*\*et\*\* qui l'a approuvée/);
  assert.match(assumee.md, /\| mutation \| aucun outil de mutation sur cette pile \| Alice \| oui \|/);
});
