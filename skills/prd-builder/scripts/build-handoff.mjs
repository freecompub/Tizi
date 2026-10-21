#!/usr/bin/env node
// Construit le paquet de handoff du PRD vers la conception et la planification, à partir d'une version figée.
// Usage : node build-handoff.mjs <prd/<slug>/versions/v<version>/state.yaml>
import { dirname, join, basename, resolve } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, PRIORITY_ORDER, validated, today, writeHandoff } from './lib/common.mjs';
import { coverage } from './lib/rules.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node build-handoff.mjs <versions/v<version>/state.yaml>', 2);
const vdir = dirname(resolve(statePath));
if (!/^v\d+\.\d+$/.test(basename(vdir)) || basename(dirname(vdir)) !== 'versions') fail('Le handoff se construit à partir d\'une version figée : versions/v<version>/state.yaml');
const s = loadState(statePath);
const version = basename(vdir).slice(1);
const root = dirname(dirname(vdir));
if (s.governance?.status !== 'baseline') console.warn(`Avertissement : la version ${version} n'est pas une baseline (status : ${txt(s.governance?.status)}).`);

const frs = validated(s.functional_requirements), acs = validated(s.acceptance_criteria);
const rels = validated(s.releases);
const byPriority = list => PRIORITY_ORDER.flatMap(p => list.filter(x => x.priority === p));
const handoff = {
  source: { initiative: s.initiative?.name ?? '', prd_version: version, status: s.governance?.status ?? '', mode: s.mode, brd_version: s.source_brd?.version ?? '', generated: today() },
  problem: s.problem?.statement ?? '',
  vision: s.vision ?? '',
  goals: validated(s.goals).map(({ id, statement, kpi, target, brd_objectives }) => ({ id, statement, kpi, target, brd_objectives })),
  personas: validated(s.personas).map(({ id, name, role }) => ({ id, name, role })),
  journeys: validated(s.journeys).map(({ id, persona, goal, steps }) => ({ id, persona, goal, steps: arr(steps) })),
  transition_requirements: arr(s.brd_ref?.transition_requirements),
  concepts: arr(s.concepts).filter(c => c.decision).map(({ id, title, decision, reason }) => ({ id, title, decision, reason })),
  story_map: arr(s.story_map).map(a => ({ id: a.id, name: a.name, tasks: arr(a.tasks).map(({ id, name, journey, release }) => ({ id, name, journey, release })) })),
  releases: rels.map(r => ({
    id: r.id, name: r.name, learning_goal: r.learning_goal, signal: r.signal,
    functional_requirements: byPriority(frs.filter(f => f.release === r.id)).map(f => ({
      id: f.id, priority: f.priority, statement: f.statement, actor: f.actor,
      brd_requirements: arr(f.brd_requirements), journeys: arr(f.journeys), business_rules: arr(f.business_rules),
      acceptance: acs.filter(a => a.fr === f.id).map(({ id, scenario, kind, given, when, then }) => ({ id, scenario, kind, given, when, then })),
    })),
  })),
  non_functional: validated(s.nfrs).map(({ id, category, statement, metric, target, measurement, applies_to, priority }) => ({ id, category, statement, metric, target, measurement, applies_to: arr(applies_to), priority })),
  constraints: validated(s.constraints).map(({ id, statement, imposed_by, category }) => ({ id, statement, imposed_by, category })),
  design_decisions: validated(s.design_decisions).map(({ id, decision, rationale, decided_by }) => ({ id, decision, rationale, decided_by: decided_by ?? '' })),
  business_rules: arr(s.business_rules).filter(r => r.status !== 'abandonné').map(({ id, statement, kind, enforcement, automation, owner }) => ({ id, statement, kind, enforcement: enforcement ?? '', automation: automation ?? 'à_décider', owner: owner ?? '' })),
  metrics: arr(s.metrics).map(({ id, goal, name, target, instrumentation }) => ({ id, goal, name, target, instrumentation })),
  open_hypotheses: arr(s.hypotheses).filter(h => h.status === 'à vérifier').map(({ id, text }) => ({ id, text })),
  risks: validated(s.risks).map(({ id, text, impact }) => ({ id, text, impact })),
  assumed_shadow_zones: arr(s.shadow_zones).filter(z => z.status === 'assumée').map(({ id, question, resolution }) => ({ id, question, reason: resolution })),
  approval_reserves: arr(s.governance?.approvals).filter(a => a.decision === 'approuvé_avec_réserves').map(a => ({ by: a.who ?? a.stakeholder, reserves: arr(a.reserves) })),
  decision_rights: arr(s.decision_rights),
  glossary: arr(s.glossary),
};

const outDir = join(root, 'handoff', `v${version}`);
const cov = coverage(s, {});
handoff.coverage = cov.map(({ id, label, covered, total, pct, threshold, met, waiver }) => ({ id, label, covered, total, pct, threshold, met, waiver }));
const handoffSha = writeHandoff(join(outDir, 'handoff.yaml'), '# Handoff PRD → conception et planification — généré, ne pas modifier.', handoff, statePath);

const md = [`# Handoff PRD → conception et planification — ${handoff.source.initiative} (PRD v${version})`, ''];
md.push(`Généré le ${today()} à partir de la version figée${handoff.source.brd_version ? `, issue du BRD v${handoff.source.brd_version}` : ''}. La conception et la planification conservent les identifiants FR, NFR et AC.`, '');
for (const r of handoff.releases) {
  md.push(`## ${r.id} — ${txt(r.name)}`, '', `Hypothèse testée : ${txt(r.learning_goal)} · Signal : ${txt(r.signal)}`, '');
  for (const f of r.functional_requirements) {
    md.push(`### ${f.id} — ${prLabel(f.priority)}`, '', f.statement, '', `Origine BRD : ${f.brd_requirements.join(', ') || '—'}`, '');
    md.push(list(f.acceptance.map(a => `${a.id} (${txt(a.kind)}) — ${txt(a.scenario)}`)));
  }
}
md.push('## Exigences non fonctionnelles', '', table(['ID', 'Catégorie', 'Exigence', 'Cible', 'Portée'], handoff.non_functional.map(n => [n.id, n.category, n.statement, n.target, n.applies_to.join(', ') || 'globale'])));
md.push('## Contraintes', '', table(['ID', 'Contrainte', 'Imposée par'], handoff.constraints.map(c => [c.id, c.statement, c.imposed_by])));
md.push('## Décisions produit', '', table(['ID', 'Décision', 'Justification', 'Décidé par'], handoff.design_decisions.map(d => [d.id, d.decision, d.rationale, d.decided_by])));
md.push('## Règles métier à faire respecter', '', 'Les règles automatisées doivent pouvoir évoluer sans réécrire le produit : la conception en tiendra compte.', '', table(['ID', 'Règle', 'Type', 'Application', 'Automatisation'], handoff.business_rules.map(r => [r.id, r.statement, r.kind, r.enforcement || '—', r.automation])));
md.push('## Instrumentation à prévoir', '', table(['Métrique', 'Objectif', 'Événements'], handoff.metrics.map(m => [`${m.id} ${txt(m.name)}`, m.goal, m.instrumentation])));
md.push('## Points de vigilance', '', '### Hypothèses à vérifier', '', list(handoff.open_hypotheses.map(h => `${h.id} — ${h.text}`)));
md.push('### Risques', '', table(['ID', 'Risque', 'Impact'], handoff.risks.map(r => [r.id, r.text, r.impact])));
md.push('### Zones d\'ombre assumées', '', list(handoff.assumed_shadow_zones.map(z => `${z.id} — ${z.question} (${txt(z.reason)})`)));
if (handoff.approval_reserves.length) md.push('### Réserves d\'approbation', '', list(handoff.approval_reserves.map(r => `${r.by} : ${r.reserves.join(', ')}`)));
md.push('', '## Couverture', '', table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], handoff.coverage.map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason} (${c.waiver.approved_by ?? '—'})` : '**non atteint**'])));
md.push('', `Empreinte SHA-256 de handoff.yaml : \`${handoffSha}\`. L\'étape suivante la vérifie avec verify-handoff.mjs avant d\'ingérer.`, '');
writeOut(join(outDir, 'handoff.md'), md.join('\n'));
console.log(`Handoff généré : ${outDir} (${frs.length} FR, ${acs.length} AC)`);
