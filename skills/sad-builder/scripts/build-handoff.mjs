#!/usr/bin/env node
// Construit le paquet de handoff de la conception vers la planification (étape 4), à partir d'une version figée.
// Usage : node build-handoff.mjs <sad/<slug>/versions/v<version>/state.yaml>
import { dirname, join, basename, resolve } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, today, writeHandoff } from './lib/common.mjs';
import { coverage } from './lib/rules.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node build-handoff.mjs <versions/v<version>/state.yaml>', 2);
const vdir = dirname(resolve(statePath));
if (!/^v\d+\.\d+$/.test(basename(vdir)) || basename(dirname(vdir)) !== 'versions') fail('Le handoff se construit à partir d\'une version figée : versions/v<version>/state.yaml');
const s = loadState(statePath);
const version = basename(vdir).slice(1);
const root = dirname(dirname(vdir));
if (s.governance?.status !== 'baseline') console.warn(`Avertissement : la version ${version} n'est pas une baseline (status : ${txt(s.governance?.status)}).`);

const ok = x => ['validé', 'accepté'].includes(x?.status);
const ref = s.prd_ref ?? {};
const frIndex = new Map(arr(ref.functional_requirements).map(f => [f.id, f]));
const els = arr(s.elements).filter(ok);
const elName = id => els.find(e => e.id === id)?.name ?? id;
const toBuild = els.filter(e => ['container', 'component'].includes(e.kind) && !['existant_conservé', 'existant_retiré', 'existant_remplacé'].includes(e.lifecycle || 'nouveau'));
const releasesOf = e => [...new Set(arr(e.frs).map(f => frIndex.get(f)?.release).filter(Boolean))];

const handoff = {
  source: { initiative: s.initiative?.name ?? '', sad_version: version, status: s.governance?.status ?? '', context_mode: s.context_mode, prd_version: s.source_prd?.version ?? '', generated: today() },
  work_items: toBuild.map(e => ({ id: e.id, name: e.name, kind: e.kind, lifecycle: e.lifecycle || 'nouveau', technology: e.technology ?? '', owner: e.owner ?? '', parent: e.parent ?? '', frs: arr(e.frs), releases: releasesOf(e), contexts: arr(e.contexts) })),
  retired: els.filter(e => ['existant_retiré', 'existant_remplacé'].includes(e.lifecycle)).map(e => ({ id: e.id, name: e.name, lifecycle: e.lifecycle, replaced_by: e.replaced_by ?? '' })),
  decisions: arr(s.decisions).filter(a => a.status === 'accepté').map(a => ({ id: a.id, title: a.title, outcome: a.outcome, prevents: a.prevents ?? '', rule: a.rule ?? '', confirmation: a.confirmation ?? '', elements: arr(a.elements) })),
  interfaces: arr(s.interfaces).filter(ok).map(a => ({ id: a.id, name: a.name, kind: a.kind, provider: a.provider, consumers: arr(a.consumers), lifecycle: a.lifecycle ?? 'nouveau', operations: arr(a.operations).map(o => ({ id: o.id, name: o.name, frs: arr(o.frs) })) })),
  verifications: arr(s.nfr_responses).filter(ok).map(r => ({ id: r.id, nfr: r.nfr, method: r.verification?.method ?? '', description: r.verification?.description ?? '', stage: r.verification?.stage ?? '' })),
  security_measures: arr(s.threats).filter(t => ok(t) && t.treatment === 'attenuer').map(t => ({ threat: t.id, stride: t.stride, target: t.target, mitigations: arr(t.mitigations) })),
  accepted_risks: arr(s.threats).filter(t => ok(t) && t.treatment === 'accepter').map(t => ({ threat: t.id, description: t.description, accepted_by: t.accepted_by })),
  spikes: arr(s.hypotheses).filter(h => h.status === 'à vérifier' && h.validation === 'spike').map(h => ({ id: h.id, text: h.text, spike: h.spike ?? '' })),
  tech_debt: arr(s.tech_debt),
  data: arr(s.data_entities).filter(ok).map(({ id, name, store, classification, retention }) => ({ id, name, store, classification, retention })),
  risks: arr(s.risks).filter(ok).map(({ id, text, impact }) => ({ id, text, impact })),
  assumed_shadow_zones: arr(s.shadow_zones).filter(z => z.status === 'assumée').map(({ id, question, resolution }) => ({ id, question, reason: resolution })),
  approval_reserves: arr(s.governance?.approvals).filter(a => a.decision === 'approuvé_avec_réserves').map(a => ({ by: a.who, reserves: arr(a.reserves) })),
};

const outDir = join(root, 'handoff', `v${version}`);
const cov = coverage(s, {});
handoff.coverage = cov.map(({ id, label, covered, total, pct, threshold, met, waiver }) => ({ id, label, covered, total, pct, threshold, met, waiver }));
const handoffSha = writeHandoff(join(outDir, 'handoff.yaml'), '# Handoff conception → planification — généré, ne pas modifier.', handoff, statePath);

const md = [`# Handoff conception → planification — ${handoff.source.initiative} (SAD v${version})`, ''];
md.push(`Généré le ${today()} à partir de la version figée, issue du PRD v${txt(handoff.source.prd_version)}. La planification conserve les identifiants (CT, CP, API, OP, NR, TH, ADR) pour préserver la traçabilité jusqu'au code.`, '');
md.push('## Éléments à construire ou à modifier', '', table(['ID', 'Élément', 'Cycle de vie', 'Technologie', 'Équipe', 'FR', 'Releases'],
  handoff.work_items.map(w => [w.id, w.name, w.lifecycle, w.technology, w.owner, w.frs.join(', '), w.releases.join(', ')])));
if (handoff.retired.length) md.push('## Éléments remplacés ou retirés', '', table(['ID', 'Élément', 'Cycle de vie', 'Remplacé par'], handoff.retired.map(r => [r.id, r.name, r.lifecycle, r.replaced_by ? elName(r.replaced_by) : '—'])));
md.push('## Spikes à mener avant les tickets qui en dépendent', '', list(handoff.spikes.map(h => `${h.id} — ${h.text}${h.spike ? ` (spike : ${h.spike})` : ''}`)));
md.push('## Contrats', '', table(['ID', 'Interface', 'Type', 'Fournisseur', 'Opérations'], handoff.interfaces.map(a => [a.id, a.name, a.kind, elName(a.provider), a.operations.map(o => o.id).join(', ')])));
const stages = ['tests', 'integration', 'recette', 'exploitation'];
md.push('## Vérifications des NFR, par étape', '');
for (const st of stages) {
  const v = handoff.verifications.filter(x => x.stage === st);
  if (v.length) md.push(`### ${st}`, '', table(['Réponse', 'NFR', 'Méthode', 'Ce qui est vérifié'], v.map(x => [x.id, x.nfr, x.method, x.description])));
}
md.push('## Mesures de sécurité à réaliser', '', table(['Menace', 'STRIDE', 'Cible', 'Mesures'], handoff.security_measures.map(m => [m.threat, m.stride, m.target, m.mitigations.join(' ; ')])));
if (handoff.accepted_risks.length) md.push('### Menaces acceptées', '', table(['Menace', 'Description', 'Accepté par'], handoff.accepted_risks.map(r => [r.threat, r.description, r.accepted_by])));
md.push('## Décisions à respecter', '', table(['ADR', 'Décision', 'Règle', 'Empêche', 'Confirmation'], handoff.decisions.map(a => [a.id, a.title, a.rule, a.prevents, a.confirmation])));
if (handoff.tech_debt.length) md.push('## Dette technique concernée', '', table(['ID', 'Dette', 'Impact'], handoff.tech_debt.map(d => [d.id, d.text, d.impact])));
md.push('## Points de vigilance', '', '### Risques', '', table(['ID', 'Risque', 'Impact'], handoff.risks.map(r => [r.id, r.text, r.impact])));
md.push('### Zones d\'ombre assumées', '', list(handoff.assumed_shadow_zones.map(z => `${z.id} — ${z.question} (${txt(z.reason)})`)));
if (handoff.approval_reserves.length) md.push('### Réserves d\'approbation', '', list(handoff.approval_reserves.map(r => `${r.by} : ${r.reserves.join(', ')}`)));
md.push('', '## Couverture', '', table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], handoff.coverage.map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason} (${c.waiver.approved_by ?? '—'})` : '**non atteint**'])));
md.push('', `Empreinte SHA-256 de handoff.yaml : \`${handoffSha}\`. L\'étape suivante la vérifie avec verify-handoff.mjs avant d\'ingérer.`, '');
writeOut(join(outDir, 'handoff.md'), md.join('\n'));
console.log(`Handoff généré : ${outDir} (${handoff.work_items.length} élément(s) à construire, ${handoff.spikes.length} spike(s))`);
