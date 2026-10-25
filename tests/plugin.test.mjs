// Le dépôt est aussi un marketplace, et sa racine est la racine du plugin « tizi ». Les deux outils le
// lisent : Claude Code et Copilot CLI acceptent tous deux .claude-plugin/marketplace.json et
// .claude-plugin/plugin.json. Les composants partagés (skills/) sont communs ; ceux qui diffèrent sont
// séparés — commands/, agents/, hooks/ pour Claude Code, com.github.copilot/ pour Copilot.
// skills/ y est déjà, et commands/, agents/ et hooks/hooks.json sont générés par install.mjs depuis
// la même source unique que les cibles claude et copilot. Ces artefacts sont commités, pour qu'un
// clone suffise à installer le plugin — donc il faut vérifier qu'ils n'ont pas dérivé de leur source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, node, tempDir } from './helpers.mjs';
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
  // Copilot CLI n'accepte le format « Agent Plugins » que sur ce $schema exact ; Claude Code l'ignore.
  assert.match(m.$schema, /^https:\/\/agent-plugins\.org\/schemas\/1\.[01]\.0\/plugin\.schema\.json$/);
  assert.match(m.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  assert.ok(!/^(claude|anthropic|anthropics|cc-plugin)-/.test(m.name), 'un nom réservé est refusé par Claude Code');
  assert.equal(m.version, JSON.parse(lire('package.json')).version, 'la version vient de package.json');
  assert.ok(m.description && m.author?.name);

  // L'arborescence est exactement celle du standard : rien à déclarer, donc rien qui puisse mentir.
  for (const k of ['skills', 'commands', 'agents', 'hooks']) {
    assert.ok(!(k in m), `${k} ne doit pas être déclaré : l'emplacement par défaut est utilisé`);
  }
  // Claude Code : emplacements standard. Copilot : espace de noms com.github.copilot/ (Agent Plugins 1.0).
  for (const d of ['skills', 'commands', 'agents', 'com.github.copilot/agents']) assert.ok(existsSync(join(ROOT, d)), `${d}/ attendu`);
  for (const f of ['hooks/hooks.json', 'com.github.copilot/hooks/hooks.json']) assert.ok(existsSync(join(ROOT, f)), `${f} attendu`);
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

test('plugin : côté Copilot, chaque point d\'entrée et chaque sous-agent est un agent', () => {
  const dir = 'com.github.copilot/agents';
  const fichiers = readdirSync(join(ROOT, dir));
  assert.ok(fichiers.every(f => f.endsWith('.agent.md')), 'Copilot attend <nom>.agent.md');

  const noms = fichiers.map(f => f.replace(/\.agent\.md$/, '')).sort();
  const sousAgents = readdirSync(join(ROOT, 'agents')).map(f => f.replace(/\.md$/, ''));
  assert.deepEqual(noms, [...entrypoints.map(e => e.name), ...sousAgents].sort(),
    'les points d\'entrée ET les sous-agents, côté Copilot');

  for (const f of fichiers) {
    const fm = yaml.load(lire(`${dir}/${f}`).split(/^---$/m)[1]);
    assert.equal(fm.name, f.replace(/\.agent\.md$/, ''), `${f} : name doit égaler le nom du fichier`);
    assert.ok(fm.description, `${f} : sans description`);
    // Seuls les points d'entrée sont proposés à l'utilisateur.
    const estEntree = entrypoints.some(e => e.name === fm.name);
    assert.equal(fm['user-invocable'] === false, !estEntree, `${f} : seuls les points d'entrée sont invocables`);
    if (estEntree) assert.ok(Array.isArray(fm.tools) && fm.tools.length, `${f} : un agent Copilot déclare ses outils`);
  }

  // Le point d'étape et l'exécuteur de backlog ne modifient aucun fichier.
  for (const n of ['tizi', 'tizi-backlog']) {
    const fm = yaml.load(lire(`${dir}/${n}.agent.md`).split(/^---$/m)[1]);
    assert.ok(!fm.tools.includes('edit'), `${n} ne doit pas pouvoir éditer`);
  }
});

test('plugin : les hooks de chaque outil pointent dans le plugin, par sa variable de racine', () => {
  // La variable qui donne la racine du plugin diffère : les deux fichiers ne peuvent pas être le même.
  for (const [fichier, variable, enveloppe] of [
    ['hooks/hooks.json', '${CLAUDE_PLUGIN_ROOT}', h => h.hooks],
    ['com.github.copilot/hooks/hooks.json', '${PLUGIN_ROOT}', h => h.hooks],
  ]) {
    const brut = json(fichier);
    const h = enveloppe(brut);
    assert.ok(h, `${fichier} : enveloppe « hooks » attendue`);
    if (fichier.includes('copilot')) assert.equal(brut.version, 1, 'les hooks Copilot portent version: 1');
    const commandes = Object.values(h).flat().flatMap(m => m.hooks ?? [m]).map(x => x.command);
    assert.ok(commandes.length >= 4, `${fichier} : garde-fou TDD, capture, début de session (vu : ${commandes.length})`);
    for (const c of commandes) {
      assert.ok(c.includes(variable), `${fichier} : ${c} doit passer par ${variable}`);
      assert.ok(c.includes(`"${variable}`), `${fichier} : le chemin doit être entre guillemets (espaces possibles)`);
      const rel = c.replace(`node "${variable}/`, '').replace(/"$/, '');
      assert.ok(existsSync(join(ROOT, rel)), `${rel} : script introuvable dans le plugin`);
    }
    const pre = h.PreToolUse.flatMap(m => m.hooks ?? [m]);
    assert.ok(pre.length, `${fichier} : garde-fou TDD absent`);
  }
  // Côté Claude Code, le garde-fou filtre les outils d'écriture ; côté Copilot, le filtrage est dans le script.
  assert.equal(json('hooks/hooks.json').hooks.PreToolUse[0].matcher, 'Edit|Write|MultiEdit|NotebookEdit');
});

// Le plus important : les artefacts commités sont ceux que la source produit. Sans ce test, le plugin
// dériverait en silence dès qu'un point d'entrée ou un sous-agent change.
test('plugin : les artefacts commités sont ceux que install.mjs régénère', () => {
  const tmp = tempDir('tizi-plugin');
  for (const d of ['skills', 'entrypoints']) cpSync(join(ROOT, d), join(tmp, d), { recursive: true });
  cpSync(join(ROOT, 'package.json'), join(tmp, 'package.json'));
  const r = node(join(ROOT, 'install.mjs'), ['--project', tmp, '--target', 'plugin']);
  assert.equal(r.code, 0, r.err);

  const compare = p => assert.equal(readFileSync(join(tmp, p), 'utf8'), lire(p), `${p} a dérivé de sa source : relance node install.mjs --project . --target plugin`);
  compare('.claude-plugin/plugin.json');
  compare('hooks/hooks.json');
  for (const f of readdirSync(join(tmp, 'commands'))) compare(`commands/${f}`);
  for (const f of readdirSync(join(tmp, 'agents'))) compare(`agents/${f}`);
  compare('com.github.copilot/hooks/hooks.json');
  for (const f of readdirSync(join(tmp, 'com.github.copilot/agents'))) compare(`com.github.copilot/agents/${f}`);
  // Et rien de plus que ce que la source produit.
  assert.deepEqual(readdirSync(join(ROOT, 'commands')).sort(), readdirSync(join(tmp, 'commands')).sort());
  assert.deepEqual(readdirSync(join(ROOT, 'agents')).sort(), readdirSync(join(tmp, 'agents')).sort());
  assert.deepEqual(readdirSync(join(ROOT, 'com.github.copilot/agents')).sort(), readdirSync(join(tmp, 'com.github.copilot/agents')).sort());
});
