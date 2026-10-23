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
    // Les sous-agents internes portent la même marque que côté Copilot : ce ne sont pas des points d'entrée.
    const adir = join(proj, '.claude/agents');
    if (existsSync(adir)) for (const f of readdirSync(adir)) {
      const a = front(join(adir, f));
      assert.equal(a['user-invocable'], false, `${f} : sous-agent interne non marqué non invocable`);
      assert.match(a.description ?? '', /ne pas utiliser directement/, `${f} : la description doit le dire aussi, Claude Code l'affichant encore`);
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

// Installation partielle. Le point d'entrée « tizi » n'a pas de skill : install.mjs fait tomber son
// {scripts} sur brd-builder, sinon sur le premier skill installé. Cela marche parce que les scripts
// communs qu'il appelle sont dans les sept skills — règle vraie, jamais écrite, jamais vérifiée. Un
// script commun ajouté à six skills sur sept casserait --skills <le septième> en silence.
for (const seul of ['backlog-executor', 'brd-builder', 'impl-builder', 'plan-builder', 'prd-builder', 'sad-builder', 'test-builder'])
  test(`installation partielle : --skills ${seul} produit des points d'entrée utilisables`, () => {
    const proj = mkdtempSync(join(tmpdir(), `tizi-part-${seul}-`));
    const r = node(join(ROOT, 'install.mjs'), ['--project', proj, '--target', 'claude', '--skills', seul]);
    assert.equal(r.code, 0, r.err);

    // Seul le skill demandé est posé.
    assert.deepEqual(readdirSync(join(proj, '.claude/skills')), [seul]);

    // Les points d'entrée posés sont ceux de ce skill, plus « tizi » qui n'en a pas.
    const cmds = readdirSync(join(proj, '.claude/commands')).map(f => f.replace(/\.md$/, ''));
    assert.ok(cmds.includes('tizi'), 'le point d\'étape est toujours posé');
    for (const e of source) {
      if (e.skill && e.skill !== seul) assert.ok(!cmds.includes(e.name), `${e.name} ne devrait pas être posé sans ${e.skill}`);
    }

    // Et surtout : tout script cité par une commande posée doit exister.
    for (const c of cmds) {
      const text = readFileSync(join(proj, '.claude/commands', `${c}.md`), 'utf8');
      for (const m of text.matchAll(/`?(\.claude\/skills\/[a-z-]+\/scripts\/[a-z0-9-]+\.mjs)`?/g)) {
        assert.ok(existsSync(join(proj, m[1])), `/${c} appelle ${m[1]}, absent avec --skills ${seul}`);
      }
      for (const m of text.matchAll(/`([^`]*\/SKILL\.md)`/g)) assert.ok(existsSync(join(proj, m[1])), `/${c} : ${m[1]} introuvable`);
    }
  });
