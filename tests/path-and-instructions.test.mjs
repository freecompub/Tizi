// Chemin minimal (choose-path.mjs) et instructions du dépôt (sync-agent-instructions.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, cpSync } from 'node:fs';
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
