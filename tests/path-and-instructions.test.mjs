// Chemin minimal (choose-path.mjs) et instructions du dépôt (sync-agent-instructions.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sandbox, node, script } from './helpers.mjs';
import { decide } from '../skills/brd-builder/scripts/choose-path.mjs';

const no = { evident: false, reglementaire: false, 'intention-floue': false, 'regle-metier': false, 'contrat-donnee': false, 'plusieurs-jours': false };
test('chemin : la question réglementaire impose la chaîne complète, même pour une modification « évidente »', () => {
  assert.equal(decide({ ...no, evident: true, reglementaire: true }).path, 'complet');
});
test('chemin : voie rapide, hors Tizi, court', () => {
  assert.equal(decide(no).path, 'voie-rapide');
  assert.deepEqual(decide(no).steps, ['plan', 'impl']);
  assert.equal(decide({ ...no, evident: true }).path, 'hors-tizi');
  assert.deepEqual(decide({ ...no, 'regle-metier': true }).steps, ['prd', 'plan', 'impl', 'qa']);
  assert.deepEqual(decide({ ...no, 'contrat-donnee': true, 'plusieurs-jours': true }).steps, ['sad', 'plan', 'impl', 'qa']);
  assert.equal(decide({ ...no, 'intention-floue': true }).path, 'complet');
});

const answers = a => Object.entries({ ...no, ...a }).flatMap(([k, v]) => [`--${k}`, v ? 'oui' : 'non']);
test('chemin enregistré : ne se rétrécit pas, s\'élargit avec historique, guide l\'étape suivante', () => {
  const dir = sandbox();
  const cp = (...x) => node(script('brd-builder', 'choose-path.mjs'), x, { cwd: dir });
  assert.equal(cp('nouvelle', '--par', 'Samir', ...answers({})).code, 0);
  assert.notEqual(cp('nouvelle', '--par', 'Samir', ...answers({})).code, 0, 'un second choix sans --elargir est refusé');
  const next = () => JSON.parse(node(script('brd-builder', 'next-step.mjs'), ['.', '--json'], { cwd: dir }).out);
  assert.equal(next().find(x => x.slug === 'nouvelle').next.entry, 'tizi-plan', 'voie rapide : commencer par le plan');
  assert.equal(cp('nouvelle', '--par', 'Samir', '--elargir', ...answers({ 'regle-metier': true })).code, 0);
  assert.equal(next().find(x => x.slug === 'nouvelle').next.entry, 'tizi-prd', 'élargi : un PRD d\'abord');
  assert.match(readFileSync(join(dir, '.tizi/chemins/nouvelle.yaml'), 'utf8'), /history:\n\s+- path: voie-rapide/);
  // Une conception seule, avec un chemin court qui ne passe pas par le PRD : on ne renvoie ni au BRD ni au PRD.
  assert.equal(cp('green', '--par', 'Samir', ...answers({ 'contrat-donnee': true, 'plusieurs-jours': true })).code, 0);
  const g = next().find(x => x.slug === 'green');
  assert.equal(g.next.entry, 'tizi-sad'); assert.equal(g.progress.split(' ')[0], '–');
});

// Une initiative découpée n'est pas une initiative jetée. Le vocabulaire d'Assess n'avait que `jeter`
// pour clore : sur le premier dossier réel, la mère portait `decision: jeter` avec la vérité en
// commentaire YAML, et les deux outils de portefeuille annonçaient un abandon.
test('initiative découpée : close sans abandon, filles nommées, point d\'étape et portefeuille', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-decoup-'));
  const ecrire = (slug, opp) => {
    mkdirSync(join(dir, 'brd', slug), { recursive: true });
    writeFileSync(join(dir, 'brd', slug, 'state.yaml'), `document: brd\ninitiative: { name: "${slug}", slug: ${slug} }\nphase: close\nopportunity:\n${opp}\n`);
  };
  ecrire('programme', '  decision: decoupee\n  decided_by: SH-01\n  split_into: [inscription, communication]');

  const next = JSON.parse(node(script('brd-builder', 'next-step.mjs'), ['.', '--json'], { cwd: dir }).out);
  const mere = next.find(x => x.slug === 'programme');
  assert.match(mere.next.why, /découpée en inscription, communication/, 'le point d\'étape annonce un abandon');
  assert.doesNotMatch(mere.next.why, /jetée/);

  const porte = node(script('brd-builder', 'list-opportunities.mjs'), ['.'], { cwd: dir }).out;
  assert.match(porte, /decoupee → inscription, communication/, 'le portefeuille ne dit pas où est passé le travail');

  // Un découpage qui ne nomme pas ses filles se relit comme un abandon : la règle le dit.
  ecrire('muette', '  decision: decoupee\n  decided_by: SH-01');
  const lint = node(script('brd-builder', 'lint.mjs'), ['brd/muette/state.yaml'], { cwd: dir }).out;
  assert.match(lint, /S56.*sans nommer les initiatives filles/, 'découpage sans filles accepté en silence');
  rmSync(dir, { recursive: true });
});

// La porte de synthèse se déclare à la fin de Discover et `S65` ne la contrôle qu'à l'entrée de Define :
// le premier dossier réel avait ses cinq dimensions vides et zéro partie prenante entendue, sans qu'aucun
// outil ne le montre. Le point d'étape l'affiche comme une distance, avec les deux comptes calculables.
test('point d\'étape : porte de synthèse montrée en Discover, avec ce qui se compte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-synth-'));
  mkdirSync(join(dir, 'brd/cadrage'), { recursive: true });
  writeFileSync(join(dir, 'brd/cadrage/state.yaml'), [
    'document: brd', 'initiative: { name: "Cadrage", slug: cadrage }', 'phase: discover',
    'stakeholders:', '  - { id: SH-01, status: interrogée }', '  - { id: SH-02, status: à interroger }',
    '  - { id: SH-03, status: à interroger }',
    'sources:', '  - { id: SRC-001, type: cadrage, stakeholders: [SH-01] }',
    'candidate_needs:', '  - { id: BC-001, text: "x", sources: [{ ref: SRC-001 }] }',
    '  - { id: BC-002, text: "y", sources: [{ ref: SRC-001 }] }', '',
  ].join('\n'));
  const out = node(script('brd-builder', 'status.mjs'), ['brd/cadrage/state.yaml'], { cwd: dir }).out;
  assert.match(out, /Porte de synthèse avant Define : 0 dimension\(s\) sur 5/);
  assert.match(out, /couverture\s+à déclarer — 1 partie\(s\) prenante\(s\) entendue\(s\) sur 3/);
  assert.match(out, /robustesse\s+à déclarer — 2 besoin\(s\) candidat\(s\) sur 2 à source unique/);
  rmSync(dir, { recursive: true });
});

test('instructions du dépôt : bloc généré, contenu humain conservé, idempotent, dérives détectées', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tizi-instr-'));
  const ex = sandbox();
  cpSync(join(ex, 'sad'), join(dir, 'sad'), { recursive: true }); cpSync(join(ex, 'repo/impl'), join(dir, 'impl'), { recursive: true }); cpSync(join(ex, 'repo/src'), join(dir, 'src'), { recursive: true });
  writeFileSync(join(dir, 'AGENTS.md'), '# Projet\n\nNote humaine.\n');
  const sync = (...x) => node(script('brd-builder', 'sync-agent-instructions.mjs'), ['.', ...x], { cwd: dir });
  assert.equal(sync('--check').code, 1, 'bloc absent');
  assert.equal(sync().code, 0);
  const a1 = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(a1, /^# Projet\n\nNote humaine\./); assert.match(a1, /Composants et dossiers/); assert.match(a1, /donnée de santé/);
  assert.match(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), /@AGENTS\.md/);
  assert.ok(!existsSync(join(dir, '.github/copilot-instructions.md')), 'pas créé sans --copilot');
  sync();
  assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), a1, 'idempotent');
  rmSync(join(dir, 'src/completude'), { recursive: true });
  const c = sync('--check');
  assert.equal(c.code, 1); assert.match(c.out, /introuvable : src\/completude/);
});
