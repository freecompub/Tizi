#!/usr/bin/env node
// Installe les skills du SDLC dans un dépôt, pour Claude Code, GitHub Copilot, ou les deux.
// Aucune dépendance : Node 18 ou plus suffit. L'installation est idempotente : la relancer met à jour.
//
// Usage : node install.mjs --project <dépôt> --target claude|copilot|both [--skills brd-builder,prd-builder,…] [--user] [--dry-run]
//
// Ce qui est posé :
//   skills   claude → .claude/skills/   copilot → .github/skills/   both → .claude/skills/ (lu par Claude Code ET par Copilot)
//   agents   claude → .claude/agents/<nom>.md   copilot → .github/agents/<nom>.agent.md   both → les deux
//   hooks    claude → .claude/settings.json (fusionné)   copilot → .github/hooks/tizi.json   both → les deux
//            PreToolUse → garde-fou TDD (si impl-builder est installé) ; Stop, PreCompact, SessionEnd → capture des sessions
//   points d'entrée (entrypoints/entrypoints.yaml) : claude → .claude/commands/<nom>.md (/sdlc, /tizi-brd…)
//                                                  copilot → .github/agents/<nom>.agent.md (liste des agents)
//   --ci : workflow GitHub Actions planifié qui prépare les sprint reviews dues et ouvre une issue
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
if (!['claude', 'copilot', 'both'].includes(target)) { console.error('Usage : node install.mjs --project <dépôt> --target claude|copilot|both [--skills a,b] [--user] [--dry-run]'); process.exit(2); }
const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, 'skills');
const all = readdirSync(source).filter(d => existsSync(join(source, d, 'SKILL.md')));
const skills = opt('--skills') ? opt('--skills').split(',').map(s => s.trim()) : all;
for (const s of skills) if (!all.includes(s)) { console.error(`Skill inconnu : ${s}`); process.exit(2); }
const log = [];
const act = (msg, fn) => { log.push(msg); if (!dry) fn(); };
const claude = target !== 'copilot', copilot = target !== 'claude';

// 1. Skills
const skillsDir = user ? (target === 'copilot' ? join(homedir(), '.copilot', 'skills') : join(homedir(), '.claude', 'skills'))
  : join(project, target === 'copilot' ? '.github/skills' : '.claude/skills');
for (const s of skills) act(`skill ${s} → ${skillsDir}/${s}`, () => {
  rmSync(join(skillsDir, s), { recursive: true, force: true });
  mkdirSync(skillsDir, { recursive: true });
  cpSync(join(source, s), join(skillsDir, s), { recursive: true, filter: p => !/node_modules|package-lock\.json/.test(p) });
});
const relSkills = user ? null : (target === 'copilot' ? '.github/skills' : '.claude/skills');
const scriptPath = (skill, script) => (user ? join(skillsDir, skill, 'scripts', script) : `${relSkills}/${skill}/scripts/${script}`);

// 2. Agents du council
for (const s of skills) {
  const dir = join(source, s, 'agents');
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, f), 'utf8');
    const name = f.replace(/\.md$/, '');
    if (claude) {
      const d = user ? join(homedir(), '.claude', 'agents') : join(project, '.claude', 'agents');
      act(`agent ${name} → ${d}/${f}`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, f), text); });
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
const skillRoot = user ? skillsDir : relSkills;
const scriptsOf = e => `${skillRoot}/${e.skill ?? (installed.has('brd-builder') ? 'brd-builder' : skills[0])}/scripts`;
const q = v => JSON.stringify(String(v));
const bodyOf = (e, tool) => {
  const next = (e.handoffs ?? []).filter(h => byName.has(h));
  const call = n => (tool === 'claude' ? `/${n}` : `l'agent ${n}`);
  const lines = [`# ${e.title}`, ''];
  if (tool === 'claude') lines.push('Arguments reçus : $ARGUMENTS', '');
  if (e.skill) lines.push(`Charge le skill \`${e.skill}\` : lis \`${skillRoot}/${e.skill}/SKILL.md\` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.`, '');
  const inp = e.inputs ?? {};
  if ((inp.required ?? []).length || (inp.optional ?? []).length) {
    lines.push('**Entrées**', '');
    for (const r of inp.required ?? []) lines.push(`- obligatoire : ${r}`);
    for (const o of inp.optional ?? []) lines.push(`- facultatif : ${o}`);
    lines.push('', 'Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.', '');
  }
  if (e.body) lines.push(e.body.replaceAll('{scripts}', scriptsOf(e)).trim(), '');
  if (next.length) lines.push(`**Étape suivante** : quand cette étape est terminée ou figée, propose ${next.map(call).join(' ou ')}.`, '');
  return lines.join('\n');
};
for (const e of usable) {
  if (claude) {
    const d = user ? join(homedir(), '.claude', 'commands') : join(project, '.claude', 'commands');
    const text = `---\ndescription: ${q(e.description)}\nargument-hint: ${q(e.argument_hint ?? '')}\n---\n\n${bodyOf(e, 'claude')}`;
    act(`commande /${e.name} → ${d}/${e.name}.md`, () => { mkdirSync(d, { recursive: true }); writeFileSync(join(d, `${e.name}.md`), text); });
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
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Préparer les sprint reviews dues et ouvrir une issue
        env:
          GH_TOKEN: \${{ github.token }}
        run: node ${relSkills}/plan-builder/scripts/ci-sprint-review.mjs .
`);
  });
}

// 4. .gitignore
const gi = join(project, '.gitignore');
const lines = ['# SDLC : état local de la tâche en cours et transcriptions brutes (voir references/sessions.md)', '.impl/', '.tizi/sessions/*.jsonl', '.tizi/sessions/*.tmp'];
act(`.gitignore → ${gi}`, () => {
  const cur = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  const missing = lines.filter(l => !cur.split('\n').includes(l));
  if (missing.length) writeFileSync(gi, `${cur}${cur && !cur.endsWith('\n') ? '\n' : ''}${missing.join('\n')}\n`);
});

console.log(`${dry ? 'Simulation — rien n\'est écrit.\n' : ''}${log.map(l => `• ${l}`).join('\n')}`);
console.log(`\nInstallé pour ${target === 'both' ? 'Claude Code et GitHub Copilot' : target === 'claude' ? 'Claude Code' : 'GitHub Copilot'} : ${skills.length} skill(s).`);
if (copilot) console.log('Copilot : les hooks sont pris en charge par la CLI et l\'agent cloud ; dans VS Code ils sont en préversion et peuvent devoir être activés.');
if (target === 'both') console.log('Les deux outils lisent .claude/settings.json et .github/hooks/ : un même hook peut s\'exécuter deux fois sous Copilot. Les scripts sont conçus pour le supporter (verdicts identiques, écritures atomiques).');
