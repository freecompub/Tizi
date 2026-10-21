#!/usr/bin/env node
// Bloc d'instructions du dépôt, généré à partir des états de Tizi, pour les agents qui ne passent pas par un skill
// (complétion dans l'éditeur, question rapide, autre agent). Idée reprise de bmad-project-context (BMAD-METHOD).
//
//   AGENTS.md                         le bloc complet (lu par Copilot en CLI et dans VS Code, et par de nombreux agents)
//   CLAUDE.md                         un import « @AGENTS.md » dans un bloc Tizi, sans dupliquer le contenu
//   .github/copilot-instructions.md   le bloc complet, seulement si le fichier existe déjà (ou avec --copilot)
// Tout ce qui est hors des balises <!-- tizi:début --> … <!-- tizi:fin --> est conservé tel quel.
//
// Usage : node sync-agent-instructions.mjs [racine] [--check] [--copilot]
//   --check : ne modifie rien ; signale un bloc absent ou périmé, et les dossiers cités qui n'existent plus (code 1).
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, writeOut, approxTokens } from './lib/common.mjs';

const args = process.argv.slice(2);
const root = args.find(a => !a.startsWith('--')) ?? '.';
const check = args.includes('--check');
const BEGIN = '<!-- tizi:début — bloc généré par Tizi (sync-agent-instructions.mjs), ne pas modifier à la main -->';
const END = '<!-- tizi:fin -->';
const MAX_TOKENS = 900; // ce fichier est chargé à chaque session : il doit rester court

const load = p => (existsSync(p) ? yaml.load(readFileSync(p, 'utf8')) : null);
const states = doc => (existsSync(join(root, doc)) ? readdirSync(join(root, doc)).map(d => ({ slug: d, s: load(join(root, doc, d, 'state.yaml')) })).filter(x => x.s) : []);
const cfg = load(join(root, 'impl', 'config.yaml')) ?? {};
const sads = states('sad');

const L = [BEGIN, '', '## Tizi : règles de ce dépôt', '',
  'Les spécifications vivent dans `brd/`, `prd/`, `sad/` et `plan/` ; les états `state.yaml` font foi. Pour travailler sur une initiative, passer par le point d\'entrée : `/tizi` (Claude Code) ou l\'agent `tizi` (Copilot).', ''];
const rules = sads.flatMap(({ s }) => arr(s.decisions).filter(a => a.status === 'accepté' && (a.rule || a.outcome)));
if (rules.length) {
  L.push('### Règles d\'architecture', '', 'Issues des décisions acceptées. Une modification qui les enfreint est refusée en revue.', '');
  for (const a of rules) L.push(`- **${a.id}** — ${a.rule || `option retenue : ${a.outcome}`}${a.prevents ? ` (empêche : ${a.prevents})` : ''}`);
  L.push('');
}
const elements = sads.flatMap(({ s }) => arr(s.elements).filter(e => ['container', 'component'].includes(e.kind) && e.status !== 'abandonné'));
const dirs = cfg.elements ?? {};
const mapped = elements.filter(e => arr(dirs[e.id]).length);
if (mapped.length) {
  L.push('### Composants et dossiers', '', 'Chaque dossier appartient à un composant. Modifier le dossier d\'un autre composant demande une tâche qui le cite.', '');
  for (const e of mapped) L.push(`- ${e.id} ${e.name ?? ''} : ${arr(dirs[e.id]).map(d => `\`${d}\``).join(', ')}`);
  L.push('');
}
const contracts = arr(cfg.paths?.contracts);
const apis = sads.flatMap(({ s }) => arr(s.interfaces));
if (contracts.length || apis.length) {
  L.push('### Contrats d\'interface', '', `Les contrats (${contracts.map(c => `\`${c}\``).join(', ') || apis.map(a => a.id).join(', ')}) ne se modifient que dans une tâche qui cite l'opération concernée : un contrat consommé par d'autres est une décision de conception.`, '');
}
const sensitive = sads.flatMap(({ s }) => arr(s.data_entities).filter(d => ['personnelle', 'sante', 'confidentielle'].includes(d.classification) && d.status !== 'abandonné'));
if (sensitive.length) {
  L.push('### Données sensibles', '', 'Ne jamais les écrire dans un journal, un message d\'erreur, une donnée de test réelle ou un prompt.', '');
  const CLASS = { personnelle: 'donnée personnelle', sante: 'donnée de santé', confidentielle: 'confidentielle' };
  for (const d of sensitive) L.push(`- ${d.id} ${d.name ?? ''} : ${CLASS[d.classification] ?? d.classification}${d.retention ? `, conservation : ${d.retention}` : ''}${d.store ? `, détenue par ${d.store}` : ''}`);
  L.push('');
}
const suites = Object.entries(cfg.suites ?? {}).filter(([, v]) => v?.command);
if (suites.length) {
  L.push('### Tests', '', ...suites.map(([k, v]) => `- ${k} : \`${v.command}\``), '');
  L.push('Tout changement de comportement commence par un test qui échoue. Pendant une tâche Tizi, un garde-fou bloque le code de production écrit sans test en échec : ne pas le contourner.', '');
}
L.push(END);
const block = L.join('\n');
const tokens = approxTokens(block);

// Remplace le bloc s'il existe, sinon l'ajoute à la fin ; le reste du fichier est conservé.
const merge = (text, b) => {
  const i = text.indexOf('<!-- tizi:début'), j = text.indexOf(END);
  if (i >= 0 && j > i) return text.slice(0, i) + b + text.slice(j + END.length);
  return `${text}${text && !text.endsWith('\n') ? '\n' : ''}${text ? '\n' : ''}${b}\n`;
};
const claudeBlock = [BEGIN, '', '@AGENTS.md', '', END].join('\n');
const targets = [[join(root, 'AGENTS.md'), block, true], [join(root, 'CLAUDE.md'), claudeBlock, true],
  [join(root, '.github', 'copilot-instructions.md'), block, existsSync(join(root, '.github', 'copilot-instructions.md')) || args.includes('--copilot')]];

if (check) {
  const issues = [];
  for (const [p, b, wanted] of targets) {
    if (!wanted) continue;
    const text = existsSync(p) ? readFileSync(p, 'utf8') : '';
    if (!text.includes('<!-- tizi:début')) issues.push(`${p} : bloc Tizi absent`);
    else if (merge(text, b) !== text) issues.push(`${p} : bloc Tizi périmé (les états ont changé depuis la dernière synchronisation)`);
  }
  for (const [id, ds] of Object.entries(dirs)) for (const d of arr(ds)) { const base = d.split('*')[0].replace(/\/$/, ''); if (base && !existsSync(join(root, base))) issues.push(`dossier cité pour ${id} introuvable : ${d}`); }
  if (tokens > MAX_TOKENS) issues.push(`bloc trop long : environ ${tokens} tokens pour ${MAX_TOKENS} au plus (il est chargé à chaque session)`);
  console.log(issues.length ? issues.map(x => `⚠ ${x}`).join('\n') : `Instructions du dépôt à jour (bloc d'environ ${tokens} tokens).`);
  process.exitCode = issues.length ? 1 : 0;
} else {
  for (const [p, b, wanted] of targets) if (wanted) writeOut(p, merge(existsSync(p) ? readFileSync(p, 'utf8') : '', b));
  console.log(`Instructions du dépôt synchronisées : ${targets.filter(t => t[2]).map(t => t[0]).join(', ')} — bloc d'environ ${tokens} tokens${tokens > MAX_TOKENS ? ` (au-delà de ${MAX_TOKENS} : à alléger)` : ''}.`);
}
