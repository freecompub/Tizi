#!/usr/bin/env node
// Lit un résumé de passage du DT Coach de hve-core (handoff-summary.md) et PROPOSE les éléments correspondants pour un BRD.
// N'écrit pas dans l'état : les propositions vont dans brd/<slug>/sources/dt-import-<date>.yaml, à valider par lots.
// Usage : node ingest-dt-handoff.mjs <handoff-summary.md> <brd/<slug>/state.yaml>
import { existsSync, readFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, today, fileSha256 } from './lib/common.mjs';

const [handoffPath, statePath] = process.argv.slice(2);
if (!handoffPath || !statePath) fail('Usage : node ingest-dt-handoff.mjs <handoff-summary.md> <state.yaml>', 2);
if (!existsSync(handoffPath)) fail(`Introuvable : ${handoffPath}`);
const s = loadState(statePath);
const root = dirname(statePath);

// Le résumé est du YAML, seul ou dans un bloc de code d'un fichier Markdown.
const text = readFileSync(handoffPath, 'utf8');
const block = text.match(/```ya?ml\n([\s\S]*?)```/);
let h;
try { h = yaml.load(block ? block[1] : text.replace(/^---\n[\s\S]*?\n---\n/, '')); } catch (e) { fail(`Résumé illisible (${e.message}).`); }
if (!h || typeof h !== 'object') fail('Résumé vide ou sans structure reconnue.');

// Prochains identifiants libres.
const next = (prefix, list, width = 3) => {
  const n = Math.max(0, ...arr(list).map(x => Number(String(x.id ?? '').replace(`${prefix}-`, '')) || 0));
  let k = n;
  return () => `${prefix}-${String(++k).padStart(width, '0')}`;
};
const nextSrc = next('SRC', s.sources), nextH = next('H', s.hypotheses), nextZo = next('ZO', s.shadow_zones);
mkdirSync(join(root, 'sources'), { recursive: true });
const copy = join(root, 'sources', `dt-${basename(handoffPath)}`);
copyFileSync(handoffPath, copy);
const src = { id: nextSrc(), type: 'dt-handoff', date: String(h.date ?? today()), path: copy, note: `Résumé de passage hve-core, sortie « ${h.exit_point ?? '?'} » après la méthode ${h.dt_method ?? '?'} (empreinte ${fileSha256(copy).slice(0, 12)})` };
const ENV = /phys|environ|ambient|noise|bruit|lumi|light|glove|gant/i;
const prop = { source: src, constraints: [], hypotheses: [], shadow_zones: [], documents_to_analyze: [] };
const conf = x => String(x?.confidence ?? 'unknown').toLowerCase();
for (const c of arr(h.constraints)) {
  const d = c.description ?? c.text ?? '';
  switch (conf(c)) {
    case 'validated': prop.constraints.push({ type: ENV.test(`${c.category ?? ''} ${d}`) ? 'environnement' : 'autre', text: d, source: src.id, implication: c.severity ? `sévérité hve-core : ${c.severity}` : '' }); break;
    case 'assumed': prop.hypotheses.push({ id: nextH(), text: d, basis: `rapporté par ${c.source ?? 'la démarche de design thinking'}, non confirmé`, status: 'à vérifier' }); break;
    case 'conflicting': prop.shadow_zones.push({ id: nextZo(), type: 'contradiction', subtype: '', question: `Contrainte contradictoire : ${d}`, origin: src.id, blocking: false, status: 'ouverte' }); break;
    default: prop.shadow_zones.push({ id: nextZo(), type: 'probleme_flou', question: `À établir : ${d}`, origin: src.id, blocking: false, status: 'ouverte' });
  }
}
for (const a of arr(h.assumptions)) {
  const d = a.description ?? a.text ?? '';
  if (conf(a) === 'unknown') prop.shadow_zones.push({ id: nextZo(), type: 'hypothese_non_verifiee', question: `Non étudié : ${d}`, origin: src.id, blocking: a.impact === 'high', status: 'ouverte' });
  else if (conf(a) === 'conflicting') prop.shadow_zones.push({ id: nextZo(), type: 'contradiction', subtype: '', question: d, origin: src.id, blocking: a.impact === 'high', status: 'ouverte' });
  else prop.hypotheses.push({ id: nextH(), text: d, basis: `hve-core : ${conf(a)}, impact ${a.impact ?? '?'}`, status: conf(a) === 'validated' ? 'confirmée' : 'à vérifier' });
}
for (const a of arr(h.artifacts)) {
  if (conf(a) === 'validated') prop.documents_to_analyze.push({ path: a.path, type: a.type ?? '' });
  else prop.shadow_zones.push({ id: nextZo(), type: 'hypothese_non_verifiee', question: `Artefact ${a.type ?? a.path} non validé (${conf(a)}) : à confirmer avant usage`, origin: src.id, blocking: false, status: 'ouverte' });
}
const out = join(root, 'sources', `dt-import-${today()}.yaml`);
writeOut(out, `# Propositions issues d'un résumé de design thinking (hve-core) — à valider par lots, rien n'est encore dans l'état.\n${yaml.dump(prop, { lineWidth: 120 })}`);
console.log(`Propositions : ${out}`);
console.log(`Source ${src.id} (dt-handoff) · ${prop.constraints.length} contrainte(s) · ${prop.hypotheses.length} hypothèse(s) · ${prop.shadow_zones.length} zone(s) d'ombre · ${prop.documents_to_analyze.length} document(s) à analyser.`);
