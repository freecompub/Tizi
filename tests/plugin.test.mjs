// Le dépôt est aussi un marketplace Claude Code, et sa racine est la racine du plugin « tizi » :
// skills/ y est déjà, et commands/, agents/ et hooks/hooks.json sont générés par install.mjs depuis
// la même source unique que les cibles claude et copilot. Ces artefacts sont commités, pour qu'un
// clone suffise à installer le plugin — donc il faut vérifier qu'ils n'ont pas dérivé de leur source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { node, ROOT } from './helpers.mjs';
import yaml from '../skills/brd-builder/scripts/lib/vendor/js-yaml.mjs';

const entrypoints = yaml.load(readFileSync(join(ROOT, 'entrypoints/entrypoints.yaml'), 'utf8')).entrypoints;
const lire = p => readFileSync(join(ROOT, p), 'utf8');
const json = p => JSON.parse(lire(p));

test('marketplace : manifeste conforme, un plugin, source à la racine', () => {
  const m = json('.claude-plugin/marketplace.json');
  assert.ok(m.name && m.owner?.name && Array.isArray(m.plugins), 'name, owner et plugins sont exigés');
  assert.match(m.name, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case');
  assert.equal(m.plugins.length, 1);
  const [e] = m.plugins;
  assert.ok(e.name && e.source, 'une entrée a un name et un source');
  assert.ok(!String(e.source).includes('..'), 'un source relatif ne sort pas de la racine du marketplace');
  // Le nom de l'entrée et celui du manifeste doivent coïncider, sinon l'installation par nom échoue.
  assert.equal(e.name, json('.claude-plugin/plugin.json').name, 'nom de l\'entrée = nom du manifeste');
});

test('plugin : manifeste de métadonnées, arborescence standard, aucun chemin déclaré en trop', () => {
  const m = json('.claude-plugin/plugin.json');
  assert.equal(m.name, 'tizi');
  assert.match(m.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(!/^(claude|anthropic|anthropics|cc-plugin)-/.test(m.name), 'un nom réservé est refusé par Claude Code');
  assert.equal(m.version, JSON.parse(lire('package.json')).version, 'la version vient de package.json');
  assert.ok(m.description && m.author?.name);

  // L'arborescence est exactement celle du standard : rien à déclarer, donc rien qui puisse mentir.
  for (const k of ['skills', 'commands', 'agents', 'hooks']) {
    assert.ok(!(k in m), `${k} ne doit pas être déclaré : l'emplacement par défaut est utilisé`);
  }
  for (const d of ['skills', 'commands', 'agents']) assert.ok(existsSync(join(ROOT, d)), `${d}/ attendu à la racine`);
  assert.ok(existsSync(join(ROOT, 'hooks/hooks.json')), 'hooks/hooks.json attendu');
});

test('plugin : une commande par point d\'entrée, un agent par sous-agent de skill', () => {
  const cmds = readdirSync(join(ROOT, 'commands')).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')).sort();
  assert.deepEqual(cmds, entrypoints.map(e => e.name).sort(), 'les commandes du plugin sont les points d\'entrée');

  const attendus = readdirSync(join(ROOT, 'skills'))
    .flatMap(sk => (existsSync(join(ROOT, 'skills', sk, 'agents')) ? readdirSync(join(ROOT, 'skills', sk, 'agents')) : []))
    .filter(f => f.endsWith('.md'));
  assert.deepEqual(readdirSync(join(ROOT, 'agents')).sort(), [...new Set(attendus)].sort());

  // Les sous-agents du plugin portent la marque, comme pour les deux autres cibles.
  for (const f of readdirSync(join(ROOT, 'agents'))) {
    const fm = yaml.load(lire(`agents/${f}`).split(/^---$/m)[1]);
    assert.equal(fm['user-invocable'], false, `${f} : sous-agent interne non marqué`);
  }
});

test('plugin : les hooks pointent dans le plugin, par ${CLAUDE_PLUGIN_ROOT}', () => {
  const h = json('hooks/hooks.json');
  assert.ok(h.hooks, 'un fichier de hooks porte l\'enveloppe « hooks »');
  const commandes = Object.values(h.hooks).flat().flatMap(m => m.hooks ?? []).map(x => x.command);
  assert.ok(commandes.length >= 4, `garde-fou TDD, capture, début de session (vu : ${commandes.length})`);
  for (const c of commandes) {
    assert.match(c, /\$\{CLAUDE_PLUGIN_ROOT\}/, `${c} : un chemin de plugin se résout par $\{CLAUDE_PLUGIN_ROOT\}`);
    assert.match(c, /"\$\{CLAUDE_PLUGIN_ROOT\}[^"]*"/, `${c} : le chemin doit être entre guillemets (espaces possibles)`);
    const rel = c.replace(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\//, '').replace(/"$/, '');
    assert.ok(existsSync(join(ROOT, rel)), `${rel} : script introuvable dans le plugin`);
  }
  // Le garde-fou TDD ne doit filtrer que les écritures.
  assert.equal(h.hooks.PreToolUse[0].matcher, 'Edit|Write|MultiEdit|NotebookEdit');
});

// Le plus important : les artefacts commités sont ceux que la source produit. Sans ce test, le plugin
// dériverait en silence dès qu'un point d'entrée ou un sous-agent change.
test('plugin : les artefacts commités sont ceux que install.mjs régénère', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'tizi-plugin-'));
  for (const d of ['skills', 'entrypoints']) cpSync(join(ROOT, d), join(tmp, d), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(tmp, 'package.json'));
  const r = node(join(ROOT, 'install.mjs'), ['--project', tmp, '--target', 'plugin']);
  assert.equal(r.code, 0, r.err);

  const compare = p => assert.equal(readFileSync(join(tmp, p), 'utf8'), lire(p), `${p} a dérivé de sa source : relance node install.mjs --project . --target plugin`);
  compare('.claude-plugin/plugin.json');
  compare('hooks/hooks.json');
  for (const f of readdirSync(join(tmp, 'commands'))) compare(`commands/${f}`);
  for (const f of readdirSync(join(tmp, 'agents'))) compare(`agents/${f}`);
  // Et rien de plus que ce que la source produit.
  assert.deepEqual(readdirSync(join(ROOT, 'commands')).sort(), readdirSync(join(tmp, 'commands')).sort());
  assert.deepEqual(readdirSync(join(ROOT, 'agents')).sort(), readdirSync(join(tmp, 'agents')).sort());
});
