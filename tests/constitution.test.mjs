// Constitution du produit, cinq questions, listes de contrôle de relecture, analyse croisée du sens.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { sandbox, node, script } from './helpers.mjs';
import { checkState } from '../skills/brd-builder/scripts/lib/rules.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const C = (dir, ...a) => node(script('brd-builder', 'constitution.mjs'), ['.', ...a], { cwd: dir });
function withConstitution(dir) {
  assert.equal(C(dir, '--proposer', '--texte', 'Aucune donnée de santé ne doit apparaître dans un journal.', '--type', 'ne_doit_pas', '--raison', 'Secret médical', '--controle', 'automatique', '--commande', '! grep -rn "console.log(dossier" src', '--par', 'Samir').code, 0);
  assert.equal(C(dir, '--decider', 'PC-01', '--accepter', '--par', 'Samir').code, 0);
}

test('constitution : principe vérifiable, accepté par son responsable, amendé par lui seul, dérogation nommée', () => {
  const dir = sandbox();
  assert.match(C(dir, '--proposer', '--texte', 'x doit y', '--type', 'doit', '--raison', 'r', '--controle', 'automatique', '--par', 'S').err, /commande/);
  withConstitution(dir);
  const c = yaml.load(readFileSync(join(dir, '.tizi/constitution.yaml'), 'utf8'));
  assert.equal(c.principles[0].status, 'actif'); assert.equal(c.principles[0].owner, 'Samir');
  assert.match(C(dir, '--amender', 'PC-01', '--texte', 'nouveau texte doit', '--raison', 'r', '--par', 'Autre').err, /Seul le responsable/);
  assert.equal(C(dir, '--amender', 'PC-01', '--texte', 'Aucune donnée de santé ne doit apparaître dans un journal ni une alerte.', '--raison', 'alertes', '--par', 'Samir').code, 0);
  assert.notEqual(C(dir, '--deroger', 'PC-01', '--initiative', 'demo', '--element', 'ADR-001').code, 0, 'dérogation sans raison ni approbateur refusée');
  assert.equal(C(dir, '--deroger', 'PC-01', '--initiative', 'demo', '--element', 'ADR-001', '--raison', 'journal chiffré', '--par', 'DPO').code, 0);
  assert.equal(C(dir).code, 0);
});

test('constitution dans la chaîne : S79 au BRD et à la conception, fiche de contexte, instructions du dépôt, porte de PR (C10)', () => {
  const dir = sandbox(); withConstitution(dir);
  const consti = yaml.load(readFileSync(join(dir, '.tizi/constitution.yaml'), 'utf8'));
  assert.ok(checkState({ document: 'brd', phase: 'define' }, { constitution: consti }).some(f => f.rule === 'S79'));
  assert.ok(!checkState({ document: 'brd', phase: 'define', principles_applicable: ['PC-01'] }, { constitution: consti }).some(f => f.rule === 'S79'));
  const sad = extra => checkState({ document: 'sad', phase: 'govern', constitution_check: { after: { date: '2026-10-22', by: 'S' }, ...extra } }, { constitution: consti }).filter(f => f.rule === 'S79');
  assert.equal(sad({}).length, 0);
  assert.equal(sad({ conflicts: [{ principle: 'PC-01', element: 'ADR-009', resolution: '' }] }).length, 1);
  node(script('plan-builder', 'render-plan.mjs'), ['plan/demo/state.yaml'], { cwd: dir });
  assert.match(readFileSync(join(dir, 'plan/demo/tasks/TK-002.md'), 'utf8'), /## Principes du produit[\s\S]*PC-01/);
  node(script('brd-builder', 'sync-agent-instructions.mjs'), ['.'], { cwd: dir });
  assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /### Principes du produit[\s\S]*PC-01/);
  const repo = join(dir, 'repo'); mkdirSync(join(repo, '.tizi'), { recursive: true });
  writeFileSync(join(repo, '.tizi/constitution.yaml'), readFileSync(join(dir, '.tizi/constitution.yaml')));
  assert.match(node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo }).out, /✓ Principes de la constitution à contrôle automatique respectés/);
  writeFileSync(join(repo, 'src/completude/fuite.js'), 'console.log(dossier.glycemie)\n');
  assert.match(node(script('impl-builder', 'pr-gate.mjs'), ['impl/demo/state.yaml', '--task', 'TK-002'], { cwd: repo }).out, /✗ Principes de la constitution à contrôle automatique respectés — en échec : PC-01/);
});

test('cinq questions : bloquantes et contradictions d\'abord, cinq au plus', () => {
  const dir = sandbox(); const p = join(dir, 'z.yaml');
  writeFileSync(p, yaml.dump({ document: 'prd', shadow_zones: [
    ...Array.from({ length: 6 }, (_, i) => ({ id: `ZO-H${i}`, type: 'hypothese_non_verifiee', question: 'h ?', status: 'ouverte' })),
    { id: 'ZO-C', type: 'contradiction', question: 'c ?', status: 'ouverte' }, { id: 'ZO-B', type: 'hypothese_non_verifiee', question: 'b ?', status: 'ouverte', blocking: true },
    { id: 'ZO-F', type: 'contradiction', question: 'f ?', status: 'résolue' }] }));
  const top = JSON.parse(node(script('prd-builder', 'ask-five.mjs'), [p, '--json'], { cwd: dir }).out);
  assert.equal(top.length, 5); assert.deepEqual(top.slice(0, 2).map(z => z.id), ['ZO-B', 'ZO-C']); assert.ok(!top.some(z => z.id === 'ZO-F'));
});

test('listes de contrôle : jamais cochées sans relecteur nommé, complètes avant la gouvernance (S80)', () => {
  const dir = sandbox();
  node(script('prd-builder', 'review-checklist.mjs'), ['prd/demo/state.yaml', '--domaines', 'securite'], { cwd: dir });
  const f = join(dir, 'prd/demo/checklists/securite.md');
  const lists = () => [{ file: 'securite.md', text: readFileSync(f, 'utf8') }];
  const s80 = phase => checkState({ document: 'prd', phase }, { checklists: lists() }).filter(x => x.rule === 'S80');
  assert.ok(s80('govern').some(x => /non traité/.test(x.message)));
  writeFileSync(f, readFileSync(f, 'utf8').replace('- [ ] CL-SEC-01', '- [x] CL-SEC-01'));
  assert.ok(s80('specify').some(x => /sans relecteur nommé/.test(x.message)), 'coché sans nom');
  writeFileSync(f, readFileSync(f, 'utf8').replace(/^- \[ \] (CL-SEC-\d+.*)$/gm, '- [x] $1 — Chloé').replace(/^(- \[x\] CL-SEC-01.*\?)$/m, '$1 — Chloé'));
  assert.equal(s80('govern').length, 0);
});

test('analyse croisée : constats vérifiés, transformés en questions proposées', () => {
  const dir = sandbox();
  node(script('prd-builder', 'cross-context.mjs'), ['prd/demo/state.yaml'], { cwd: dir });
  writeFileSync(join(dir, 'prd/demo/analyse/findings.yaml'), yaml.dump({ findings: [
    { id: 'X-01', kind: 'contradiction', items: ['FR-001', 'RG-001'], explanation: 'e', question: 'q ?', confidence: 0.9 },
    { id: 'X-02', kind: 'doublon', items: ['FR-001'], explanation: 'e', question: 'q ?' }] }));
  assert.match(node(script('prd-builder', 'cross-merge.mjs'), ['prd/demo/state.yaml'], { cwd: dir }).out, /1 constat\(s\) retenu\(s\).*1 rejeté/);
  const prop = yaml.load(readFileSync(join(dir, 'prd/demo/analyse/proposals.yaml'), 'utf8')).shadow_zones;
  assert.equal(prop[0].type, 'contradiction'); assert.equal(prop[0].status, 'proposée'); assert.equal(prop[0].blocking, true);
});
