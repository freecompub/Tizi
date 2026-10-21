#!/usr/bin/env node
// Construit le paquet de handoff du plan vers l'implémentation (étape 5), à partir d'une version figée :
// l'ordre d'exécution des tâches engagées, avec leur affectation et le chemin de leur fiche de contexte.
// Usage : node build-handoff.mjs <plan/<slug>/versions/v<version>/state.yaml>
import { dirname, join, basename, resolve } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, loadState, writeOut, fail, today, writeHandoff } from './lib/common.mjs';
import { existsSync } from 'node:fs';
import { taskCycles, storyReadiness, coverage } from './lib/rules.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node build-handoff.mjs <versions/v<version>/state.yaml>', 2);
const vdir = dirname(resolve(statePath));
if (!/^v\d+\.\d+$/.test(basename(vdir)) || basename(dirname(vdir)) !== 'versions') fail('Le handoff se construit à partir d\'une version figée : versions/v<version>/state.yaml');
const s = loadState(statePath);
const version = basename(vdir).slice(1);
const root = dirname(dirname(vdir));
if (s.governance?.status !== 'baseline') console.warn(`Avertissement : la version ${version} n'est pas une baseline (status : ${txt(s.governance?.status)}).`);

const flux = s.settings?.cadence === 'flux';
const tasks = arr(s.tasks).filter(t => !['abandonné', 'proposé'].includes(t.status));
// Tâches engagées : celles d'une itération ou d'un réapprovisionnement dont l'engagement est déclaré.
const committedIts = new Set(arr(s.iterations).filter(i => i.commitment?.declared_by).map(i => i.id));
const committedRp = new Set(arr(s.replenishments).filter(r => r.commitment?.declared_by).flatMap(r => arr(r.tasks)));
const refs = existsSync(join(vdir, 'refs.yaml')) ? loadState(join(vdir, 'refs.yaml')) : {};
const storyOf = id => arr(s.stories).find(x => x.id === id);
const inCommitment = tasks.filter(t => t.status !== 'terminé' && (flux ? committedRp.has(t.id) : committedIts.has(t.iteration)));
// Une story non prête ne peut pas faire partie d'un engagement : ses tâches sont retenues, pas transmises.
const held = inCommitment.filter(t => t.story && storyOf(t.story) && !storyReadiness(s, storyOf(t.story), refs).ready);
for (const t of held) console.warn(`Avertissement : ${t.id} est retenue, sa story ${t.story} n'est pas prête (${storyReadiness(s, storyOf(t.story), refs).reasons.join(' ; ')}).`);
const engaged = inCommitment.filter(t => !held.includes(t));
if (!engaged.length) console.warn('Avertissement : aucune tâche engagée. Un engagement doit être déclaré sur une itération ou un réapprovisionnement.');
if (taskCycles(engaged).length) fail('Dépendances circulaires parmi les tâches engagées : corrige le plan avant le handoff.');

// Ordre topologique ; à égalité, rang de la file (flux) ou ordre d'apparition.
const ids = new Set(engaged.map(t => t.id));
const done = new Set(tasks.filter(t => t.status === 'terminé').map(t => t.id));
const order = [], placed = new Set();
while (order.length < engaged.length) {
  const next = engaged.filter(t => !placed.has(t.id) && arr(t.depends_on).every(d => placed.has(d) || done.has(d) || !ids.has(d)))
    .sort((a, b) => (a.order || 0) - (b.order || 0))[0];
  if (!next) break;
  order.push(next); placed.add(next.id);
}
const external = t => arr(t.depends_on).filter(d => !ids.has(d) && !done.has(d));
const handoff = {
  source: { initiative: s.initiative?.name ?? '', plan_version: version, cadence: flux ? 'flux' : 'sprint', generated: today() },
  definition_of_done: arr(s.definition_of_done),
  held_back: held.map(t => ({ id: t.id, story: t.story, reasons: storyReadiness(s, storyOf(t.story), refs).reasons })),
  tasks: order.map((t, i) => ({ rank: i + 1, id: t.id, kind: t.kind, title: t.title ?? '', story: t.story ?? '', size: t.size ?? '', assignee_type: t.assignee_type ?? 'humain', assignee: t.assignee ?? '',
    iteration: t.iteration ?? '', depends_on: arr(t.depends_on), waits_for_outside: external(t), context: `versions/v${version}/tasks/${t.id}.md` })),
};
const outDir = join(root, 'handoff', `v${version}`);
const cov = coverage(s, refs);
handoff.coverage = cov.map(({ id, label, covered, total, pct, threshold, met, waiver }) => ({ id, label, covered, total, pct, threshold, met, waiver }));
const handoffSha = writeHandoff(join(outDir, 'handoff.yaml'), '# Handoff plan → implémentation — généré, ne pas modifier.', handoff, statePath);
const md = [`# Handoff plan → implémentation — ${handoff.source.initiative} (plan v${version})`, '', `Généré le ${today()}. Les tâches sont dans l'ordre d'exécution : une tâche ne démarre que lorsque ses dépendances sont terminées. Chaque PR cite l'identifiant de sa tâche.`, ''];
md.push(table(['Rang', 'Tâche', 'Type', 'Taille', 'Affectation', 'Dépend de', 'Attend hors engagement', 'Fiche de contexte'],
  handoff.tasks.map(t => [t.rank, `${t.id} — ${t.title}`, t.kind, t.size, `${t.assignee_type}${t.assignee ? ` (${t.assignee})` : ''}`, t.depends_on.join(', '), t.waits_for_outside.join(', '), t.context])));
if (handoff.held_back.length) md.push('', '## Tâches retenues (story non prête)', '', table(['Tâche', 'Story', 'Ce qui manque'], handoff.held_back.map(h => [h.id, h.story, h.reasons.join(' ; ')])));
md.push('', '## Couverture', '', table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], handoff.coverage.map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason} (${c.waiver.approved_by ?? '—'})` : '**non atteint**'])));
md.push('', `Empreinte SHA-256 de handoff.yaml : \`${handoffSha}\`. L\'étape suivante la vérifie avec verify-handoff.mjs avant d\'ingérer.`, '');
writeOut(join(outDir, 'handoff.md'), md.join('\n'));
console.log(`Handoff généré : ${outDir} (${handoff.tasks.length} tâche(s) engagée(s), dont ${handoff.tasks.filter(t => t.assignee_type === 'agent').length} pour des agents)`);
