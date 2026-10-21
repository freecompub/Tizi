// Conformité des skills à la spécification Agent Skills et identité des fichiers communs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { SKILLS } from './helpers.mjs';
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
const COMMON = ['lib/common.mjs', 'lib/agent-io.mjs', 'lib/sessions.mjs', 'lib/vendor/js-yaml.mjs', 'session-capture.mjs', 'session-search.mjs', 'status.mjs', 'next-step.mjs', 'choose-path.mjs', 'sync-agent-instructions.mjs', 'lib/rules.mjs', 'lint.mjs', 'freeze-version.mjs', 'verify-handoff.mjs', 'lib/testing.mjs'];
for (const f of COMMON) test(`fichier commun identique partout : ${f}`, () => {
  const hashes = skills.filter(s => existsSync(join(SKILLS, s, 'scripts', f))).map(s => createHash('md5').update(readFileSync(join(SKILLS, s, 'scripts', f))).digest('hex'));
  assert.ok(hashes.length >= 2); assert.equal(new Set(hashes).size, 1, `${f} diverge entre skills`);
});
