// Conformité des skills à la spécification Agent Skills et identité des fichiers communs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { SKILLS, ROOT, run } from './helpers.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const skills = readdirSync(SKILLS).filter(d => existsSync(join(SKILLS, d, 'SKILL.md')));
test('sept skills présents', () => assert.equal(skills.length, 7));
for (const s of skills) test(`${s} : en-tête conforme à la spécification Agent Skills`, () => {
  const text = readFileSync(join(SKILLS, s, 'SKILL.md'), 'utf8');
  const fm = yaml.load(text.split(/^---$/m)[1]);
  assert.equal(fm.name, s, 'name doit égaler le nom du dossier');
  assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(fm.description.length > 0 && fm.description.length <= 1024, `description : ${fm.description.length} caractères`);
  if (fm.compatibility) assert.ok(fm.compatibility.length <= 500);
  if (fm['allowed-tools']) assert.doesNotMatch(fm['allowed-tools'], /,/, 'allowed-tools : séparé par des espaces');
  assert.ok(text.split('\n').length < 500, 'SKILL.md doit rester sous 500 lignes');
});
for (const s of skills) for (const f of existsSync(join(SKILLS, s, 'agents')) ? readdirSync(join(SKILLS, s, 'agents')) : []) test(`${s}/agents/${f} : en-tête lisible`, () => {
  const fm = yaml.load(readFileSync(join(SKILLS, s, 'agents', f), 'utf8').split(/^---$/m)[1]);
  assert.equal(fm.name, f.replace(/\.md$/, '')); assert.ok(fm.description);
});
const COMMON = ['lib/common.mjs', 'lib/agent-io.mjs', 'lib/sessions.mjs', 'lib/vendor/js-yaml.mjs', 'session-capture.mjs', 'session-search.mjs', 'status.mjs', 'next-step.mjs', 'choose-path.mjs', 'sync-agent-instructions.mjs', 'adopt.mjs', 'block.mjs', 'due-reviews.mjs', 'session-start.mjs', 'constitution.mjs', 'ask-five.mjs', 'review-checklist.mjs', 'lib/checklists.mjs', 'cross-context.mjs', 'cross-merge.mjs', 'lib/rules.mjs', 'lint.mjs', 'freeze-version.mjs', 'verify-handoff.mjs', 'lib/testing.mjs', 'defect.mjs'];
for (const f of COMMON) test(`fichier commun identique partout : ${f}`, () => {
  const hashes = skills.filter(s => existsSync(join(SKILLS, s, 'scripts', f))).map(s => createHash('md5').update(readFileSync(join(SKILLS, s, 'scripts', f))).digest('hex'));
  assert.ok(hashes.length >= 2); assert.equal(new Set(hashes).size, 1, `${f} diverge entre skills`);
});

// La liste ci-dessus est tenue à la main : un fichier dupliqué qu'on oublie d'y mettre n'est plus
// comparé, et peut diverger sans que rien ne le dise. On vérifie donc l'invariant par défaut : tout
// fichier portant le même nom dans deux skills est identique, sauf ceux qui sont propres au document
// du skill par construction. Même règle pour les sous-agents homonymes (cross-analyzer).
const PAR_DOCUMENT = new Set(['build-handoff.mjs', 'review-pack.mjs']);
test('tout fichier homonyme entre skills est identique, sauf ceux propres au document', () => {
  const vus = new Map();
  for (const s of skills) {
    const dir = join(SKILLS, s, 'scripts');
    const walk = (d, prefix = '') => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name), `${prefix}${e.name}/`);
        else if (e.name.endsWith('.mjs')) {
          const k = `${prefix}${e.name}`;
          if (PAR_DOCUMENT.has(e.name)) continue;
          vus.set(k, [...(vus.get(k) ?? []), { s, h: createHash('md5').update(readFileSync(join(d, e.name))).digest('hex') }]);
        }
      }
    };
    walk(dir);
  }
  for (const [f, copies] of vus) {
    if (copies.length < 2) continue;
    const distinctes = new Set(copies.map(c => c.h));
    assert.equal(distinctes.size, 1, `scripts/${f} diverge entre ${copies.map(c => c.s).join(', ')}`);
  }
});

test('tout sous-agent homonyme entre skills est identique', () => {
  const vus = new Map();
  for (const s of skills) {
    const dir = join(SKILLS, s, 'agents');
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
      vus.set(f, [...(vus.get(f) ?? []), { s, h: createHash('md5').update(readFileSync(join(dir, f))).digest('hex') }]);
    }
  }
  for (const [f, copies] of vus) {
    if (copies.length < 2) continue;
    // install.mjs les écrit tous dans un même dossier : le dernier gagnerait, en silence.
    assert.equal(new Set(copies.map(c => c.h)).size, 1, `agents/${f} diverge entre ${copies.map(c => c.s).join(', ')} : l'installation en écraserait un`);
  }
});

// Les données de test du dépôt doivent être versionnées. Ignorées, elles n'existent que dans l'arbre
// de travail de celui qui les a produites : 12 tests sur 124 échouaient sur tout clone neuf, donc en
// CI, parce que exemple/repo/.gitignore masquait reports/ et .impl/. Et un dossier vide ne traverse
// pas un clone : la fixture d'adoption attendait web/app/api/, que git ne peut pas versionner.
test('données de test versionnées : rien d\'ignoré, aucun dossier vide attendu', () => {
  const attendus = [
    'exemple/repo/.impl/runs.jsonl',
    'exemple/repo/.impl/current.json',
    'exemple/repo/reports/unit.xml',
    'exemple/repo/reports/acceptance.xml',
    'exemple/repo/reports/mutation/mutation.json',
    'tests/fixtures/depot-existant/web/app/api/notifications/route.ts',
  ];
  for (const f of attendus) assert.ok(existsSync(join(ROOT, f)), `${f} : absent du dépôt`);

  // Les contrôles git n'ont de sens que dans un vrai checkout : hors de là (archive, paquet),
  // la présence des fichiers suffit, et on ne fabrique pas un échec qui ne dit rien.
  const estCheckout = run('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT }).out.trim() === 'true'
    && run('git', ['ls-files', 'package.json'], { cwd: ROOT }).out.trim() === 'package.json';
  if (!estCheckout) return;

  for (const f of attendus) {
    const ignore = run('git', ['check-ignore', '-v', f], { cwd: ROOT });
    assert.equal(ignore.code, 1, `${f} est ignoré par git : ${ignore.out.trim()} — il n'existera pas sur un clone neuf`);
    assert.equal(run('git', ['ls-files', '--error-unmatch', f], { cwd: ROOT }).code, 0, `${f} n'est pas suivi par git`);
  }
});
