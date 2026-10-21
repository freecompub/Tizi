#!/usr/bin/env node
// Copie les handoffs du PRD et de la conception dans plan/<slug>/refs.yaml (lecture seule, régénéré à chaque ingestion).
// Usage : node ingest-handoffs.mjs <plan/<slug>/state.yaml> --prd <handoff.yaml du PRD> --sad <handoff.yaml de la conception> [--force]
// Refuse un handoff dont l'empreinte ne correspond pas (sauf --force), et relève les empreintes dans refs.yaml.
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, basename } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, loadState, writeOut, fail, today, verifyHandoff } from './lib/common.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--prd' && args[args.indexOf(a) - 1] !== '--sad');
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const prdPath = opt('--prd'), sadPath = opt('--sad');
if (!statePath || !prdPath || !sadPath) fail('Usage : node ingest-handoffs.mjs <state.yaml> --prd <handoff PRD> --sad <handoff conception>', 2);
for (const p of [statePath, prdPath, sadPath]) if (!existsSync(p)) fail(`Fichier introuvable : ${p}`);

const root = dirname(statePath);
// Intégrité : chaque handoff doit correspondre à son empreinte et à sa version figée d'origine.
const frozenOf = h => { const v = resolve(dirname(h)); return join(dirname(dirname(v)), 'versions', basename(v), 'state.yaml'); };
const integrity = {};
for (const [k, h] of [['prd', prdPath], ['sad', sadPath]]) {
  const r = verifyHandoff(h, frozenOf(h));
  if (!r.ok) {
    console.error(`Handoff ${k} NON intègre (${h}) :\n${r.problems.map(x => `  - ${x}`).join('\n')}`);
    if (!args.includes('--force')) fail('Ingestion refusée. Régénère le handoff depuis sa version figée, ou relance avec --force en connaissance de cause.');
  }
  integrity[k] = r.sha256;
}
const prd = loadState(prdPath), sad = loadState(sadPath);
for (const [label, h] of [['PRD', prd], ['conception', sad]]) {
  if (h.source?.status !== 'baseline') console.warn(`Avertissement : le handoff ${label} ne vient pas d'une baseline (status : ${h.source?.status ?? '—'}).`);
}
if (sad.source?.prd_version && prd.source?.prd_version && String(sad.source.prd_version) !== String(prd.source.prd_version)) {
  console.warn(`Avertissement : la conception part du PRD v${sad.source.prd_version}, le handoff du PRD est en v${prd.source.prd_version}. Le plan risque de mélanger deux versions.`);
}
const previous = existsSync(join(root, 'refs.yaml')) ? loadState(join(root, 'refs.yaml')) : null;
const refs = {
  ingested: today(),
  paths: { prd: relative(root, prdPath), sad: relative(root, sadPath) },
  sha256: integrity,
  prd, sad,
};
writeOut(join(root, 'refs.yaml'), `# Copie des handoffs amont — généré par ingest-handoffs.mjs, ne pas modifier.\n${yaml.dump(refs, { lineWidth: 120 })}`);

const frs = arr(prd.releases).flatMap(r => arr(r.functional_requirements));
console.log(`refs.yaml écrit : PRD v${prd.source?.prd_version ?? '?'} (${frs.length} FR, ${arr(prd.story_map).length} activité(s)), conception v${sad.source?.sad_version ?? '?'} (${arr(sad.work_items).length} élément(s), ${arr(sad.spikes).length} spike(s)).`);
if (previous) {
  const ids = h => new Set([...arr(h?.prd?.releases).flatMap(r => arr(r.functional_requirements).map(f => `${f.id}:${JSON.stringify(f)}`)), ...arr(h?.sad?.work_items).map(w => `${w.id}:${JSON.stringify(w)}`)]);
  const a = ids(previous), b = ids(refs);
  const changed = [...b].filter(x => !a.has(x)).map(x => x.split(':')[0]);
  const removed = [...a].filter(x => !b.has(x)).map(x => x.split(':')[0]).filter(id => !changed.includes(id));
  if (changed.length || removed.length) console.log(`Changements depuis la précédente ingestion — modifiés ou ajoutés : ${[...new Set(changed)].join(', ') || 'aucun'} ; retirés : ${[...new Set(removed)].join(', ') || 'aucun'}. Les stories et tâches concernées repassent en Refine.`);
  else console.log('Aucun changement sur les FR et les éléments depuis la précédente ingestion.');
}
