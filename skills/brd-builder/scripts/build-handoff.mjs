#!/usr/bin/env node
// Construit le paquet de handoff vers le PRD à partir d'une version figée du BRD.
// Usage : node build-handoff.mjs <brd/<slug>/versions/v<version>/state.yaml>
// Sortie : brd/<slug>/handoff/v<version>/handoff.yaml et handoff.md
import { dirname, join, basename, resolve } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, list, loadState, writeOut, fail, shLabel, prLabel, PRIORITY_ORDER, validated, today, writeHandoff } from './lib/common.mjs';
import { coverage, evidenceOf, brSources } from './lib/rules.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node build-handoff.mjs <versions/v<version>/state.yaml>', 2);
const vdir = dirname(resolve(statePath));
if (!/^v\d+\.\d+$/.test(basename(vdir)) || basename(dirname(vdir)) !== 'versions') {
  fail('Le handoff se construit à partir d\'une version figée : versions/v<version>/state.yaml');
}
const s = loadState(statePath);
const version = basename(vdir).slice(1);
const root = dirname(dirname(vdir));
if (s.governance?.status !== 'baseline') console.warn(`Avertissement : la version ${version} n'est pas une baseline (status : ${txt(s.governance?.status)}).`);

const brs = validated(s.business_requirements);
const handoff = {
  source: { initiative: s.initiative?.name ?? '', brd_version: version, status: s.governance?.status ?? '', generated: today() },
  problem: s.problem?.statement ?? '',
  objectives: validated(s.objectives).map(({ id, statement, indicator, baseline, target, deadline, owner }) => ({ id, statement, indicator, baseline, target, deadline, owner })),
  requirements: PRIORITY_ORDER.flatMap(p => brs.filter(b => b.priority === p)).map(b => ({ id: b.id, statement: b.statement, priority: b.priority, objectives: b.objectives, acceptance: b.acceptance, business_rules: arr(b.business_rules), evidence: evidenceOf(s, brSources(s, b), [b.id, ...arr(b.from_needs)]).class })),
  transition_requirements: validated(s.transition_requirements).map(({ id, kind, text, stakeholders, done_when, related }) => ({ id, kind, text, stakeholders: arr(stakeholders), done_when, related: arr(related) })),
  request: s.opportunity?.request ?? {},
  business_rules: validated(s.business_rules).map(({ id, statement, kind, enforcement, owner, sources, exceptions }) => ({ id, statement, kind, enforcement: enforcement ?? '', owner, sources: arr(sources), exceptions: arr(exceptions) })),
  decision_rights: arr(s.decision_rights),
  decisions: validated(s.decisions).map(({ id, question, decision, rationale, decided_by }) => ({ id, question, decision, rationale, decided_by })),
  target_process: s.target_process ?? {},
  constraints: arr(s.constraints),
  scope: { in: arr(s.scope?.in), out: arr(s.scope?.out), deadline: s.scope?.deadline ?? '' },
  open_hypotheses: arr(s.hypotheses).filter(h => h.status === 'à vérifier').map(({ id, text }) => ({ id, text })),
  risks: validated(s.risks).map(({ id, text, likelihood, impact, response }) => ({ id, text, likelihood, impact, response })),
  assumed_shadow_zones: arr(s.shadow_zones).filter(z => z.status === 'assumée').map(({ id, question, resolution }) => ({ id, question, reason: resolution })),
  approval_reserves: arr(s.governance?.approvals).filter(a => a.decision === 'approuvé_avec_réserves').map(a => ({ by: a.stakeholder, reserves: arr(a.reserves) })),
  stakeholders: arr(s.stakeholders).map(({ id, name, role }) => ({ id, name, role })),
  glossary: arr(s.glossary),
};

const outDir = join(root, 'handoff', `v${version}`);
const cov = coverage(s, {});
handoff.coverage = cov.map(({ id, label, covered, total, pct, threshold, met, waiver }) => ({ id, label, covered, total, pct, threshold, met, waiver }));
const handoffSha = writeHandoff(join(outDir, 'handoff.yaml'), '# Handoff BRD → PRD — généré, ne pas modifier.', handoff, statePath);

const md = [];
md.push(`# Handoff BRD → PRD — ${handoff.source.initiative} (BRD v${version})`, '');
md.push(`Généré le ${today()} à partir de la version figée. Le PRD doit couvrir les exigences ci-dessous et en conserver les identifiants.`, '');
md.push('## Problème', '', txt(handoff.problem), '');
md.push('## Objectifs', '', table(['ID', 'Objectif', 'Indicateur', 'Cible', 'Responsable'], handoff.objectives.map(o => [o.id, o.statement, o.indicator, o.target, shLabel(s, o.owner)])));
md.push('## Exigences métier à couvrir', '');
for (const b of handoff.requirements) md.push(`### ${b.id} — ${prLabel(b.priority)}`, '', b.statement, '', `Objectifs : ${arr(b.objectives).join(', ')}`, '', list(arr(b.acceptance).map(a => `Critère : ${a}`)));
md.push('## Règles métier', '', 'Le PRD décide lesquelles automatiser ; chaque règle automatisée doit être couverte par une exigence fonctionnelle.', '', table(['ID', 'Règle', 'Type', 'Application', 'Responsable'], handoff.business_rules.map(r => [r.id, r.statement, r.kind, r.enforcement || '—', shLabel(s, r.owner)])));
md.push('## Exigences de transition', '', 'Le PRD les rattache à une release ; le plan les planifie.', '', table(['ID', 'Type', 'Exigence', 'Achevée quand'], handoff.transition_requirements.map(t => [t.id, t.kind, t.text, t.done_when])));
md.push('## Droits de décision', '', table(['Domaine', 'Décideur', 'Recours'], handoff.decision_rights.map(d => [d.domain, shLabel(s, d.decider), d.escalation ? shLabel(s, d.escalation) : '—'])));
md.push('## Points de vigilance pour le PRD', '');
md.push('### Hypothèses encore à vérifier', '', list(handoff.open_hypotheses.map(h => `${h.id} — ${h.text}`)));
md.push('### Risques', '', table(['ID', 'Risque', 'Probabilité', 'Impact'], handoff.risks.map(r => [r.id, r.text, r.likelihood, r.impact])));
md.push('### Zones d\'ombre assumées', '', list(handoff.assumed_shadow_zones.map(z => `${z.id} — ${z.question} (${txt(z.reason)})`)));
if (handoff.approval_reserves.length) md.push('### Réserves d\'approbation', '', list(handoff.approval_reserves.map(r => `${shLabel(s, r.by)} : ${r.reserves.join(', ')}`)));
md.push('## Périmètre', '', '**Inclus**', '', list(handoff.scope.in), '**Exclu**', '', list(handoff.scope.out));
md.push('', '## Couverture', '', table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], handoff.coverage.map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason} (${c.waiver.approved_by ?? '—'})` : '**non atteint**'])));
md.push('', `Empreinte SHA-256 de handoff.yaml : \`${handoffSha}\`. L\'étape suivante la vérifie avec verify-handoff.mjs avant d\'ingérer.`, '');
writeOut(join(outDir, 'handoff.md'), md.join('\n'));

console.log(`Handoff généré : ${outDir} (${handoff.requirements.length} exigence(s))`);
