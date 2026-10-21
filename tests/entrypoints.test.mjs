// Points d'entrée : commandes Claude Code et agents Copilot générés depuis entrypoints/entrypoints.yaml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { node, sandbox, script, ROOT } from './helpers.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const front = f => yaml.load(readFileSync(f, 'utf8').split(/^---$/m)[1]);
const source = yaml.load(readFileSync(join(ROOT, 'entrypoints/entrypoints.yaml'), 'utf8')).entrypoints;

test('source des points d\'entrée : skills existants, passages vers des entrées connues', () => {
  const names = new Set(source.map(e => e.name));
  for (const e of source) {
    if (e.skill) assert.ok(existsSync(join(ROOT, 'skills', e.skill, 'SKILL.md')), `${e.name} : skill ${e.skill} absent`);
    for (const h of e.handoffs ?? []) assert.ok(names.has(h), `${e.name} : passage vers ${h} inconnu`);
  }
  assert.ok(!source.find(e => e.name === 'tizi').tools.includes('edit'), 'le point d\'entrée tizi ne modifie rien');
  assert.ok(!source.find(e => e.name === 'tizi-backlog').tools.includes('edit'));
});

for (const target of ['claude', 'copilot', 'both']) test(`génération des points d'entrée : cible ${target}`, () => {
  const proj = mkdtempSync(join(tmpdir(), `tizi-ep-${target}-`));
  assert.equal(node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', target]).code, 0);
  const skillsDir = target === 'copilot' ? '.github/skills' : '.claude/skills';
  if (target !== 'copilot') {
    const cmds = readdirSync(join(proj, '.claude/commands'));
    assert.equal(cmds.length, source.length);
    for (const c of cmds) {
      const text = readFileSync(join(proj, '.claude/commands', c), 'utf8');
      assert.ok(front(join(proj, '.claude/commands', c)).description);
      for (const m of text.matchAll(/`([^`]*\/SKILL\.md)`/g)) assert.ok(existsSync(join(proj, m[1])), `${c} : chemin ${m[1]} introuvable`);
    }
  }
  if (target !== 'claude') {
    const dir = join(proj, '.github/agents');
    const agents = new Map(readdirSync(dir).map(f => [f, front(join(dir, f))]));
    const names = new Set([...agents.values()].map(a => a.name));
    for (const [f, a] of agents) {
      assert.equal(a.name, f.replace(/\.agent\.md$/, ''));
      for (const h of a.handoffs ?? []) assert.ok(names.has(h.agent), `${f} : passage vers ${h.agent} absent`);
      const isEntry = source.some(e => e.name === a.name);
      assert.equal(a['user-invocable'] === false, !isEntry, `${f} : seuls les points d'entrée sont proposés à l'utilisateur`);
      for (const m of readFileSync(join(dir, f), 'utf8').matchAll(/`([^`]*\/SKILL\.md)`/g)) assert.ok(m[1].startsWith(skillsDir) && existsSync(join(proj, m[1])), `${f} : chemin ${m[1]}`);
    }
  }
});

test('étape suivante calculée sur l\'exemple', () => {
  const dir = sandbox();
  const r = node(script('brd-builder', 'next-step.mjs'), ['.', '--json'], { cwd: dir });
  assert.equal(r.code, 0, r.err);
  const by = Object.fromEntries(JSON.parse(r.out).map(x => [x.slug, x]));
  assert.equal(by.demo.next.entry, 'tizi-impl');
  assert.equal(by.green.next.entry, 'tizi-sad', 'une conception seule repart de la conception, pas du BRD');
  const repo = node(script('brd-builder', 'next-step.mjs'), ['.', '--json'], { cwd: join(dir, 'repo') });
  assert.equal(JSON.parse(repo.out).find(x => x.slug === 'demo').next.entry, 'tizi-test');
});
