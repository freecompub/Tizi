#!/usr/bin/env node
// Installe les skills du SDLC dans un dépôt, pour Claude Code, GitHub Copilot, ou les deux.
// Aucune dépendance : Node 18 ou plus suffit. L'installation est idempotente : la relancer met à jour.
//
// Usage : node install.mjs --project <dépôt> --target claude|copilot|both|plugin [--skills …] [--user] [--dry-run]
//
// La cible « plugin » est à part : elle n'installe pas Tizi dans un dépôt, elle génère les artefacts du
// plugin Claude Code DANS l'archive de Tizi — commands/, agents/, hooks/hooks.json et
// .claude-plugin/plugin.json — depuis la même source unique que les deux autres cibles. Les skills ne
// sont pas recopiés : la racine de l'archive est la racine du plugin, et skills/ y est déjà.
// Les chemins y sont écrits en ${CLAUDE_PLUGIN_ROOT}/…, qui résout là où le plugin est installé.
//
// Ce qui est posé :
//   skills   claude → .claude/skills/   copilot → .github/skills/   both → .claude/skills/ (lu par Claude Code ET par Copilot)
//   agents   claude → .claude/agents/<nom>.md   copilot → .github/agents/<nom>.agent.md   both → les deux
//   hooks    claude → .claude/settings.json (fusionné)   copilot → .github/hooks/tizi.json   both → les deux
//            PreToolUse → garde-fou TDD (si impl-builder est installé) ; Stop, PreCompact, SessionEnd → capture des sessions
//   points d'entrée (entrypoints/entrypoints.yaml) : claude → .claude/commands/<nom>.md (/tizi, /tizi-brd…)
//                                                  copilot → .github/agents/<nom>.agent.md (liste des agents)
//   --ci : workflows GitHub Actions — porte de PR rejouée, preuves de release avec provenance, sprint reviews dues
//   .gitignore : .impl/ et .tizi/sessions/*.jsonl
// --user installe skills et agents dans le dossier personnel (~/.claude, ~/.copilot) au lieu du dépôt ; les hooks restent dans le dépôt.
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const project = resolve(opt('--project') || '.');
const target = opt('--target');
const user = args.includes('--user'), dry = args.includes('--dry-run'), ci = args.includes('--ci');
if (!['claude', 'copilot', 'both', 'plugin'].includes(target)) { console.error('Usage : node install.mjs --project <dépôt> --target claude|copilot|both|plugin [--skills a,b] [--user] [--dry-run]'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'skills');
const all = readdirSync(source).filter(d => existsSync(join(source, d, 'SKILL.md')));
const skills = opt('--skills') ? opt('--skills').split(',').map(s => s.trim()) : all;
for (const s of skills) if (!all.includes(s)) { console.error(`Skill inconnu : ${s}`); process.exit(2); }
const log = [];
const act = (msg, fn) => { log.push(msg); if (!dry) fn(); };
// Marque posée dans chaque artefact généré du plugin. Pas de fichier à part : un README.md dans
// commands/ ou agents/ serait chargé COMME commande et COMME agent (vérifié : « Skills (18) … README »).
const GENERE = (quoi, source) => `<!-- Généré par install.mjs --target plugin depuis ${source}. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->`;
const plugin = target === 'plugin';
const claude = target === 'claude' || target === 'both', copilot = target === 'copilot' || target === 'both';
if (plugin && user) { console.error('--user n\'a pas de sens avec --target plugin : le plugin se distribue par un marketplace.'); process.exit(2); }

// 1. Skills
const skillsDir = user ? (target === 'copilot' ? join(homedir(), '.copilot', 'skills') : join(homedir(), '.claude', 'skills'))
  : join(project, target === 'copilot' ? '.github/skills' : '.claude/skills');
for (const s of plugin ? [] : skills) act(`skill ${s} → ${skillsDir}/${s}`, () => {
  rmSync(join(skillsDir, s), { recursive: true, force: true });
  mkdirSync(skillsDir, { recursive: true });
  cpSync(join(source, s), join(skillsDir, s), { recursive: true, filter: p => !/node_modules|package-lock\.json/.test(p) });
});
const relSkills = user ? null : (target === 'copilot' ? '.github/skills' : '.claude/skills');
// Dans un plugin, la racine est donnée par l'outil : Claude Code expose ${CLAUDE_PLUGIN_ROOT},
// Copilot CLI expose ${PLUGIN_ROOT}. Hors plugin, les deux outils lisent le même dossier.
const PLUGIN_VAR = { claude: '${CLAUDE_PLUGIN_ROOT}', copilot: '${PLUGIN_ROOT}' };
const skillRootFor = tool => (plugin ? `${PLUGIN_VAR[tool]}/skills` : (user ? skillsDir : relSkills));
const scriptPath = (skill, script, tool = 'claude') => (plugin ? `${skillRootFor(tool)}/${skill}/scripts/${script}` : user ? join(skillsDir, skill, 'scripts', script) : `${relSkills}/${skill}/scripts/${script}`);

// 2. Agents du council
for (const s of skills) {
  const dir = join(source, s, 'agents');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, f), 'utf8');
    const name = f.replace(/\.md$/, '');
    if (claude) {
      // Même marque que pour Copilot : un sous-agent interne n'est pas un point d'entrée. Copilot
      // l'exclut de la liste de l'utilisateur ; Claude Code l'affiche encore, d'où la mention
      // « ne pas utiliser directement » dans sa description. La marque est posée des deux côtés
      // pour que la règle soit lisible, vérifiable par les tests, et honorée dès que l'outil le permet.
      const marked = /^---\n/.test(text) && !/^user-invocable:/m.test(text)
        ? text.replace(/^---\n([\s\S]*?)---\n/, (_, fm) => `---\n${fm}user-invocable: false\n---\n`)
        : text;
      const d = user ? join(homedir(), '.claude', 'agents') : join(project, '.claude', 'agents');
      act(`agent ${name} → ${d}/${f}`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, f), marked); });
    }
    if (plugin) {
      // Le plugin charge agents/ : on y pose la copie marquée non invocable, comme pour les deux
      // autres cibles. Les sources de skills/*/agents/ ne portent pas la marque.
      const marked = /^---\n/.test(text) && !/^user-invocable:/m.test(text)
        ? text.replace(/^---\n([\s\S]*?)---\n/, (_, fm) => `---\n${fm}user-invocable: false\n---\n`)
        : text;
      const marque = marked.replace(/^(---\n[\s\S]*?---\n)/, `$1\n${GENERE('sous-agent', `skills/*/agents/${f}`)}\n`);
      const d = join(project, 'agents');
      act(`agent ${name} → agents/${f}`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, f), marque); });
      // Copilot lit com.github.copilot/agents/<nom>.agent.md : l'espace de noms évite toute collision
      // avec les composants de Claude Code dans le même plugin.
      const body = text.replace(/^---[\s\S]*?---\n/, '');
      const desc = (text.match(/^description: (.*)$/m) ?? [])[1] ?? '';
      const cop = `---\nname: ${name}\ndescription: ${desc}\ntools: ['read', 'search']\nuser-invocable: false\n---\n\n${GENERE('sous-agent', `skills/*/agents/${f}`)}\n${body}`;
      const dc = join(project, 'com.github.copilot', 'agents');
      act(`agent ${name} → com.github.copilot/agents/${name}.agent.md`, () => { mkdirSync(dc, { recursive: true }); writeFileSync(join(dc, `${name}.agent.md`), cop); });
    }
    if (copilot) {
      // Format des agents personnalisés de Copilot : outils de lecture seule, mêmes consignes.
      const body = text.replace(/^---[\s\S]*?---\n/, '');
      const desc = (text.match(/^description: (.*)$/m) ?? [])[1] ?? '';
      const agent = `---\nname: ${name}\ndescription: ${desc}\ntools: ['read', 'search']\nuser-invocable: false\n---\n${body}`;
      const d = user ? join(homedir(), '.copilot', 'agents') : join(project, '.github', 'agents');
      act(`agent ${name} → ${d}/${name}.agent.md`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, `${name}.agent.md`), agent); });
    }
  }
}

// 2 bis. Points d'entrée : commandes pour Claude Code, agents pour GitHub Copilot, depuis une source unique.
const yaml = (await import(join(source, 'brd-builder', 'scripts', 'lib', 'vendor', 'js-yaml.mjs'))).default;
const ep = yaml.load(readFileSync(join(here, 'entrypoints', 'entrypoints.yaml'), 'utf8')).entrypoints;
const installed = new Set(skills);
const usable = ep.filter(e => !e.skill || installed.has(e.skill));
const byName = new Map(usable.map(e => [e.name, e]));
const scriptsOf = (e, tool) => `${skillRootFor(tool)}/${e.skill ?? (installed.has('brd-builder') ? 'brd-builder' : skills[0])}/scripts`;
const q = v => JSON.stringify(String(v));
const bodyOf = (e, tool) => {
  const next = (e.handoffs ?? []).filter(h => byName.has(h));
  const call = n => (tool === 'claude' ? `/${n}` : `l'agent ${n}`);
  const lines = [`# ${e.title}`, ''];
  if (tool === 'claude') lines.push('Arguments reçus : $ARGUMENTS', '');
  if (e.skill) lines.push(`Charge le skill \`${e.skill}\` : lis \`${skillRootFor(tool)}/${e.skill}/SKILL.md\` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.`, '');
  const inp = e.inputs ?? {};
  if ((inp.required ?? []).length || (inp.optional ?? []).length) {
    lines.push('**Entrées**', '');
    for (const r of inp.required ?? []) lines.push(`- obligatoire : ${r}`);
    for (const o of inp.optional ?? []) lines.push(`- facultatif : ${o}`);
    lines.push('', 'Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.', '');
  }
  if (e.body) lines.push(e.body.replaceAll('{scripts}', scriptsOf(e, tool)).trim(), '');
  if (next.length) lines.push(`**Étape suivante** : quand cette étape est terminée ou figée, propose ${next.map(call).join(' ou ')}.`, '');
  return lines.join('\n');
};
for (const e of usable) {
  if (claude) {
    const d = user ? join(homedir(), '.claude', 'commands') : join(project, '.claude', 'commands');
    const text = `---\ndescription: ${q(e.description)}\nargument-hint: ${q(e.argument_hint ?? '')}\n---\n\n${bodyOf(e, 'claude')}`;
    act(`commande /${e.name} → ${d}/${e.name}.md`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, `${e.name}.md`), text); });
  }
  if (plugin) {
    const d = join(project, 'commands');
    const text = `---\ndescription: ${q(e.description)}\nargument-hint: ${q(e.argument_hint ?? '')}\n---\n\n${GENERE('commande', 'entrypoints/entrypoints.yaml')}\n\n${bodyOf(e, 'claude')}`;
    act(`commande /tizi:${e.name} → commands/${e.name}.md`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, `${e.name}.md`), text); });
    // Côté Copilot, un point d'entrée est un agent, comme pour la cible copilot : mêmes outils,
    // mêmes boutons de passage, mais les chemins pointent dans le plugin par ${PLUGIN_ROOT}.
    const handoffs = (e.handoffs ?? []).filter(h => byName.has(h)).map(h => `  - label: ${q(`→ ${byName.get(h).title}`)}\n    agent: ${h}\n    prompt: ${q(`Reprends l'initiative en cours à l'étape « ${byName.get(h).title} ».`)}\n    send: false`);
    const cop = `---\nname: ${e.name}\ndescription: ${q(e.description)}\nargument-hint: ${q(e.argument_hint ?? '')}\ntools: [${(e.tools ?? []).map(t => `'${t}'`).join(', ')}]\n${handoffs.length ? `handoffs:\n${handoffs.join('\n')}\n` : ''}---\n\n${GENERE('agent', 'entrypoints/entrypoints.yaml')}\n\n${bodyOf(e, 'copilot')}`;
    const dc = join(project, 'com.github.copilot', 'agents');
    act(`agent ${e.name} → com.github.copilot/agents/${e.name}.agent.md`, () => { mkdirSync(dc, { recursive: true }); writeFileSync(join(dc, `${e.name}.agent.md`), cop); });
  }
  if (copilot) {
    const d = user ? join(homedir(), '.copilot', 'agents') : join(project, '.github', 'agents');
    const handoffs = (e.handoffs ?? []).filter(h => byName.has(h)).map(h => `  - label: ${q(`→ ${byName.get(h).title}`)}\n    agent: ${h}\n    prompt: ${q(`Reprends l'initiative en cours à l'étape « ${byName.get(h).title} ».`)}\n    send: false`);
    const text = `---\nname: ${e.name}\ndescription: ${q(e.description)}\nargument-hint: ${q(e.argument_hint ?? '')}\ntools: [${(e.tools ?? []).map(t => `'${t}'`).join(', ')}]\n${handoffs.length ? `handoffs:\n${handoffs.join('\n')}\n` : ''}---\n\n${bodyOf(e, 'copilot')}`;
    act(`agent ${e.name} → ${d}/${e.name}.agent.md`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, `${e.name}.agent.md`), text); });
  }
}

// 3. Hooks
const captureSkill = skills.find(s => existsSync(join(source, s, 'scripts', 'session-capture.mjs')));
const startHook = captureSkill ? scriptPath(captureSkill, 'session-start.mjs') : '';
const hasImpl = skills.includes('impl-builder');
const capture = captureSkill ? scriptPath(captureSkill, 'session-capture.mjs') : '';
const guard = hasImpl ? scriptPath('impl-builder', 'tdd-guard.mjs') : '';
if (claude && (capture || guard)) {
  const p = join(project, '.claude', 'settings.json');
  act(`hooks Claude Code → ${p}`, () => {
    const cfg = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
    cfg.hooks ??= {};
    const cmd = s => (user ? `node "${s}"` : `node "$CLAUDE_PROJECT_DIR/${s}"`);
    const set = (event, script, matcher) => {
      const list = (cfg.hooks[event] ??= []);
      const kept = list.filter(e => !JSON.stringify(e).includes(`/scripts/${script.split('/').pop()}`)); // remplace notre ancienne entrée, garde les autres
      kept.push({ ...(matcher ? { matcher } : {}), hooks: [{ type: 'command', command: cmd(script) }] });
      cfg.hooks[event] = kept;
    };
    if (guard) set('PreToolUse', guard, 'Edit|Write|MultiEdit|NotebookEdit');
    if (capture) for (const e of ['Stop', 'PreCompact', 'SessionEnd']) set(e, capture);
    if (startHook) set('SessionStart', startHook);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
  });
}
if (plugin && (capture || guard)) {
  // Un fichier de hooks par outil : les chemins ne peuvent pas être les mêmes, puisque la variable qui
  // donne la racine du plugin diffère (${CLAUDE_PLUGIN_ROOT} contre ${PLUGIN_ROOT}). Elle est toujours
  // entre guillemets : un chemin d'installation peut contenir des espaces.
  const pathsFor = tool => ({
    guard: hasImpl ? scriptPath('impl-builder', 'tdd-guard.mjs', tool) : '',
    capture: captureSkill ? scriptPath(captureSkill, 'session-capture.mjs', tool) : '',
    start: captureSkill ? scriptPath(captureSkill, 'session-start.mjs', tool) : '',
  });
  const mapFor = tool => {
    const x = pathsFor(tool);
    const entry = s => [{ hooks: [{ type: 'command', command: `node "${s}"` }] }];
    const hooks = {};
    if (x.guard) hooks.PreToolUse = [{ matcher: 'Edit|Write|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: `node "${x.guard}"` }] }];
    if (x.capture) for (const e of ['Stop', 'PreCompact', 'SessionEnd']) hooks[e] = entry(x.capture);
    if (x.start) hooks.SessionStart = entry(x.start);
    return hooks;
  };
  // Claude Code : hooks/hooks.json, enveloppé dans « hooks ».
  const pc = join(project, 'hooks', 'hooks.json');
  act(`hooks Claude Code → hooks/hooks.json`, () => {
    mkdirSync(dirname(pc), { recursive: true });
    writeFileSync(pc, `${JSON.stringify({ hooks: mapFor('claude') }, null, 2)}\n`);
  });
  // Copilot : com.github.copilot/hooks/hooks.json, même forme que .github/hooks/tizi.json.
  const pg = join(project, 'com.github.copilot', 'hooks', 'hooks.json');
  act(`hooks Copilot → com.github.copilot/hooks/hooks.json`, () => {
    const hooks = Object.fromEntries(Object.entries(mapFor('copilot')).map(([e, v]) => {
      const list = v.flatMap(m => m.hooks).map(h => ({ ...h, timeoutSec: 30 }));
      return [e, list];
    }));
    mkdirSync(dirname(pg), { recursive: true });
    writeFileSync(pg, `${JSON.stringify({ version: 1, hooks }, null, 2)}\n`);
  });
}
if (plugin) {
  const p = join(project, '.claude-plugin', 'plugin.json');
  act(`manifeste du plugin → .claude-plugin/plugin.json`, () => {
    // Le manifeste ne porte que les métadonnées : l'arborescence est exactement celle du standard
    // (skills/, commands/, agents/, hooks/hooks.json), que Claude Code scanne sans qu'on la déclare.
    // Déclarer ces clés remplace le scan par défaut, et une liste de fichiers pour « agents » n'a pas
    // chargé les sous-agents — vérifié avec claude plugin details. Moins on déclare, moins ça casse.
    const manifest = {
      // Copilot CLI n'accepte le format « Agent Plugins » que sur ce $schema exact ; Claude Code
      // ignore le champ au chargement. Un seul manifeste sert donc les deux outils.
      $schema: 'https://agent-plugins.org/schemas/1.1.0/plugin.schema.json',
      name: 'tizi',
      displayName: 'Tizi',
      description: "Un SDLC agentique, du besoin à la preuve : BRD, PRD, conception, plan, implémentation sous garde-fou TDD, vérification de release avec preuves.",
      version: JSON.parse(readFileSync(join(here, 'package.json'), 'utf8')).version ?? '0.1.0',
      author: { name: 'Samir Alili' },
      repository: 'https://github.com/freecompub/Tizi',
      license: 'MIT',
      keywords: ['sdlc', 'brd', 'prd', 'architecture', 'tdd', 'traceability'],
    };
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(manifest, null, 2)}\n`);
  });
}
if (copilot && (capture || guard)) {
  const p = join(project, '.github', 'hooks', 'tizi.json');
  act(`hooks Copilot → ${p}`, () => {
    // Noms d'événements en PascalCase : charge utile compatible VS Code et Claude (snake_case, noms d'outils traduits).
    const entry = s => [{ type: 'command', command: `node ${user ? `"${s}"` : s}`, timeoutSec: 30 }];
    const hooks = {};
    if (guard) hooks.PreToolUse = entry(guard);
    if (capture) for (const e of ['Stop', 'PreCompact', 'SessionEnd']) hooks[e] = entry(capture);
    if (startHook) hooks.SessionStart = entry(startHook);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify({ version: 1, hooks }, null, 2)}\n`);
  });
}

// 3 bis. Tâche planifiée en CI (--ci) : prépare les sprint reviews dues et ouvre une issue. Demande le droit d'écrire des issues.
if (ci && skills.includes('plan-builder') && !user) {
  const wf = join(project, '.github', 'workflows', 'tizi-sprint-review.yml');
  act(`workflow planifié → ${wf}`, () => {
    mkdirSync(dirname(wf), { recursive: true });
    writeFileSync(wf, `# Tizi : chaque jour ouvré, prépare les sprint reviews dues et ouvre une issue pour l'équipe.
# Ne décide rien et ne modifie aucun fichier du dépôt : les décisions se prennent en sprint review.
name: Tizi — sprint reviews dues
on:
  schedule:
    - cron: '0 6 * * 1-5'
  workflow_dispatch:
permissions:
  contents: read
  issues: write
jobs:
  sprint-reviews:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
      - name: Préparer les sprint reviews dues et ouvrir une issue
        env:
          GH_TOKEN: \${{ github.token }}
        run: node ${relSkills}/plan-builder/scripts/ci-sprint-review.mjs .
`);
  });
}

// 3 ter. Workflows de vérification (--ci) : porte de PR rejouée sur chaque pull request, preuves de release produites
// sur le commit lui-même. Droits en lecture seule. Les actions sont référencées par étiquette : les épingler sur un SHA
// (ci-audit.mjs le signale).
if (ci && !user && skills.includes('impl-builder')) {
  const wf = join(project, '.github', 'workflows', 'tizi-pr-gate.yml');
  act(`workflow porte de PR → ${wf}`, () => { mkdirSync(dirname(wf), { recursive: true }); writeFileSync(wf, `# Tizi : rejoue la porte de PR de la tâche citée (TK-xxx dans le titre ou la branche) sur chaque pull request.
# Exiger le job « Tizi — porte de PR » dans la protection de la branche principale.
name: Tizi — porte de PR
on: pull_request
permissions:
  contents: read
jobs:
  porte-de-pr:
    name: Tizi — porte de PR
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
      # Installer ici les dépendances du projet nécessaires aux suites de tests.
      - name: Porte de PR de la tâche citée
        env:
          TITLE: \${{ github.event.pull_request.title }}
          BRANCH: \${{ github.head_ref }}
          # Clé publique qui autorise l'exécution des contrôles automatiques de la constitution.
          # Une VARIABLE du dépôt, pas un secret et surtout pas un fichier du dépôt : une pull request
          # peut modifier .tizi/constitution.yaml, donc les commandes exécutées ici. Elle ne peut pas
          # modifier les variables du dépôt. Sans cette clé, la porte refuse C10 au lieu de l'affirmer.
          # À poser dans Settings → Secrets and variables → Actions → Variables.
          TIZI_CONSTITUTION_PUBKEY: \${{ vars.TIZI_CONSTITUTION_PUBKEY }}
        run: |
          TASK=$(printf '%s %s' "$TITLE" "$BRANCH" | grep -oE 'TK-[0-9]+' | head -1)
          if [ -z "$TASK" ]; then echo "Aucune tâche Tizi citée (TK-xxx) : porte non applicable."; exit 0; fi
          STATE=$(grep -lw "id: $TASK" impl/*/state.yaml 2>/dev/null | head -1)
          if [ -z "$STATE" ]; then echo "::error::$TASK n'a pas été prise en charge par impl-builder"; exit 1; fi
          node ${relSkills}/impl-builder/scripts/pr-gate.mjs "$STATE" --task "$TASK" --run
`); });
}
if (ci && !user && skills.includes('test-builder')) {
  const wf = join(project, '.github', 'workflows', 'tizi-preuves.yml');
  act(`workflow preuves de release → ${wf}`, () => { mkdirSync(dirname(wf), { recursive: true }); writeFileSync(wf, `# Tizi : produit les preuves de release sur le commit lui-même (jamais un commit de fusion de pull request),
# avec leur manifeste de provenance, publiés dans l'artefact « tizi-preuves » que /tizi-test vérifie (R9).
name: Tizi — preuves
on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
permissions:
  contents: read
jobs:
  preuves:
    name: Tizi — preuves
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: 20
      # Installer ici les dépendances du projet nécessaires aux suites de tests.
      - name: Suites de tests et manifeste de provenance
        run: node ${relSkills}/test-builder/scripts/ci-run-suites.mjs --lancer
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        if: always()
        with:
          name: tizi-preuves
          path: tizi-preuves/
          if-no-files-found: error
`); });
}

// 4. .gitignore
const gi = join(project, '.gitignore');
const lines = plugin ? [] : ['# Tizi : état local de la tâche en cours, transcriptions brutes, rapports de test, copies téléchargées depuis la CI, rapport d\'audit de la CI (l\'archive des preuves, elle, se commite)', '.impl/', '.tizi/sessions/*.jsonl', '.tizi/sessions/*.tmp', '.tizi/ci-audit.md', 'reports/', 'qa/*/ci/*/'];
if (lines.length) act(`.gitignore → ${gi}`, () => {
  const cur = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  const missing = lines.filter(l => !cur.split('\n').includes(l));
  if (missing.length) writeFileSync(gi, `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
});

console.log(`${dry ? 'Simulation — rien n\'est écrit.\n' : ''}${log.map(l => `• ${l}`).join('\n')}`);
console.log(plugin
  ? `\nArtefacts du plugin Tizi générés depuis entrypoints/entrypoints.yaml et skills/ : ${usable.length} commande(s), ${skills.length} skill(s) déjà en place.\nValide-les : claude plugin validate ${project === resolve('.') ? '.' : project}`
  : `\nInstallé pour ${target === 'both' ? 'Claude Code et GitHub Copilot' : target === 'claude' ? 'Claude Code' : 'GitHub Copilot'} : ${skills.length} skill(s).`);
if (copilot) console.log('Copilot : les hooks sont pris en charge par la CLI et l\'agent cloud ; dans VS Code ils sont en préversion et peuvent devoir être activés.');
if (target === 'both') console.log('Les deux outils lisent .claude/settings.json et .github/hooks/ : un même hook peut s\'exécuter deux fois sous Copilot. Les scripts sont conçus pour le supporter (verdicts identiques, écritures atomiques).');
