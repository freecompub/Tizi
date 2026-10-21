#!/usr/bin/env node
// Génère le dossier de revue d'une version : synthèse d'une page et une fiche par relecteur.
// Usage : node review-pack.mjs <brd/<slug>/state.yaml>
// Sortie : brd/<slug>/review/v<version>/synthese.md et relecteur-<SH-xx>.md
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, shLabel, prLabel, PRIORITY_ORDER, validated, today } from './lib/common.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node review-pack.mjs <state.yaml>', 2);
const s = loadState(statePath);
const version = String(s.governance?.version ?? '');
const outDir = join(dirname(statePath), 'review', `v${version}`);
const name = s.initiative?.name ?? '';

const objs = validated(s.objectives);
const brs = validated(s.business_requirements);
const risks = validated(s.risks);
const openZones = arr(s.shadow_zones).filter(z => z.status === 'ouverte');
const hypos = arr(s.hypotheses).filter(h => h.status === 'à vérifier');

// ── Synthèse ───────────────────────────────────────────────
const syn = [];
syn.push(`# Synthèse pour revue — ${name} (v${version})`, '');
syn.push(`Préparée le ${today()}. Le BRD complet accompagne cette synthèse.`, '');
syn.push('## Problème', '', txt(s.problem?.statement), '');
syn.push('## Objectifs', '', table(['ID', 'Objectif', 'Indicateur', 'Actuel → cible'], objs.map(o => [o.id, o.statement, o.indicator, `${txt(o.baseline)} → ${txt(o.target)}`])));
syn.push('## Exigences prioritaires (Must)', '', list(brs.filter(b => b.priority === 'must').map(b => `**${b.id}** — ${b.statement}`)));
syn.push('## Répartition des exigences', '', table(['Priorité', 'Nombre'], PRIORITY_ORDER.map(p => [prLabel(p), brs.filter(b => b.priority === p).length]).filter(r => r[1])));
syn.push('## Principaux risques', '', table(['ID', 'Risque', 'Impact'], risks.filter(r => r.impact === 'fort' || r.likelihood === 'forte').map(r => [r.id, r.text, r.impact])));
const dds = validated(s.decisions);
if (dds.length) syn.push('## Décisions rendues pendant la construction', '', table(['ID', 'Question', 'Décision', 'Décidé par'], dds.map(d => [d.id, d.question, d.decision, shLabel(s, d.decided_by)])));
syn.push('## Points à trancher', '');
syn.push(list([
  ...openZones.map(z => `${z.id} — ${z.question}${z.blocking ? ' **(bloquant)**' : ''}`),
  ...hypos.map(h => `${h.id} — hypothèse à confirmer : ${h.text}`),
]));
writeOut(join(outDir, 'synthese.md'), syn.join('\n'));

// ── Fiches relecteurs ──────────────────────────────────────
// Une exigence concerne un relecteur si l'un de ses besoins candidats vient d'une source où il est intervenu.
const srcBySh = new Map();
for (const src of arr(s.sources)) for (const sh of arr(src.stakeholders)) {
  if (!srcBySh.has(sh)) srcBySh.set(sh, new Set());
  srcBySh.get(sh).add(src.id);
}
const needs = new Map(arr(s.candidate_needs).map(n => [n.id, n]));
const reviewers = arr(s.governance?.reviewers).filter(r => r.role !== 'informé');
if (!reviewers.length) console.warn('Avertissement : aucun relecteur ni approbateur déclaré dans governance.reviewers.');

for (const r of reviewers) {
  const mine = srcBySh.get(r.stakeholder) ?? new Set();
  const concerned = brs.filter(b => arr(b.from_needs).some(n => arr(needs.get(n)?.sources).some(x => mine.has(x.ref))));
  const zones = openZones.filter(z => z.ask_to === r.stakeholder);
  const f = [];
  f.push(`# Revue du BRD — ${name} (v${version})`, '');
  f.push(`**Pour** : ${shLabel(s, r.stakeholder)} — rôle dans la revue : **${r.role}**`, '');
  f.push('Merci de relire le BRD joint. Cette fiche vous signale les éléments sur lesquels votre regard est le plus utile.', '');
  f.push('## Exigences issues de vos échanges', '', 'Vérifiez qu\'elles traduisent fidèlement ce que vous avez exprimé.', '');
  f.push(concerned.length ? concerned.map(b => `### ${b.id} — ${prLabel(b.priority)}\n\n${b.statement}\n\n${list(arr(b.acceptance).map(a => `Critère : ${a}`))}`).join('\n') : '_Aucune exigence directement issue de vos échanges._\n');
  const rules = validated(s.business_rules).filter(x => x.owner === r.stakeholder);
  if (rules.length) f.push('## Règles métier dont vous êtes responsable', '', 'Vérifiez qu\'elles sont exactes et toujours en vigueur.', '', table(['ID', 'Règle'], rules.map(x => [x.id, x.statement])));
  const arbitrations = arr(s.shadow_zones).filter(z => z.status === 'ouverte' && z.arbiter === r.stakeholder);
  if (arbitrations.length) f.push('## Arbitrages attendus de vous', '', list(arbitrations.map(z => `${z.id} — ${z.question}`)));
  f.push('## Questions qui vous sont adressées', '', list(zones.map(z => `${z.id} — ${z.question}`)));
  if (r.role === 'approbateur') {
    f.push('## Votre décision', '', 'Indiquez : **approuvé**, **approuvé avec réserves** (précisez-les) ou **refusé** (précisez pourquoi).', '');
  }
  f.push('## Vos commentaires', '', 'Indiquez la référence concernée (identifiant ou section) pour chaque commentaire.', '');
  f.push('| Référence | Commentaire |', '|---|---|', '| | |', '| | |', '| | |', '');
  writeOut(join(outDir, `relecteur-${r.stakeholder}.md`), f.join('\n'));
}

console.log(`Dossier de revue généré : ${outDir} (synthèse + ${reviewers.length} fiche(s))`);
