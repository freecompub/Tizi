#!/usr/bin/env node
// Génère le dossier de revue d'une version du PRD : synthèse d'une page et une fiche par relecteur.
// Usage : node review-pack.mjs <prd/<slug>/state.yaml>
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, PRIORITY_ORDER, validated, today } from './lib/common.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node review-pack.mjs <state.yaml>', 2);
const s = loadState(statePath);
const version = String(s.governance?.version ?? '');
const outDir = join(dirname(statePath), 'review', `v${version}`);
const name = s.initiative?.name ?? '';

const goals = validated(s.goals), rels = validated(s.releases), frs = validated(s.functional_requirements), nfrs = validated(s.nfrs);
const acs = validated(s.acceptance_criteria), dds = validated(s.design_decisions);
const mvp = rels[0];
const openZones = arr(s.shadow_zones).filter(z => z.status === 'ouverte');

const syn = [];
syn.push(`# Synthèse pour revue — PRD ${name} (v${version})`, '', `Préparée le ${today()}. Le PRD complet accompagne cette synthèse.`, '');
syn.push('## Vision', '', txt(s.vision), '');
syn.push('## Objectifs produit', '', table(['ID', 'Objectif', 'KPI', 'Cible'], goals.map(g => [g.id, g.statement, g.kpi, g.target])));
if (mvp) {
  syn.push(`## ${mvp.id} — ${txt(mvp.name)}`, '', table(['Critère', 'Valeur'], [['Hypothèse testée', mvp.learning_goal], ['Valeur de bout en bout', mvp.value], ['Signal', mvp.signal], ['Confinement', mvp.containment]]));
  syn.push('**Exigences Must du MVP**', '', list(frs.filter(f => f.release === mvp.id && f.priority === 'must').map(f => `**${f.id}** — ${f.statement}`)));
}
syn.push('## Volumétrie', '', table(['Release', ...PRIORITY_ORDER.map(prLabel)], rels.map(r => [r.id, ...PRIORITY_ORDER.map(pr => frs.filter(f => f.release === r.id && f.priority === pr).length)])));
syn.push(`${nfrs.length} exigence(s) non fonctionnelle(s), ${acs.length} critère(s) d'acceptation, ${dds.length} décision(s) produit.`, '');
if (s.mode === 'chaîné') {
  const uncovered = arr(s.brd_ref?.requirements).filter(b => b.priority !== 'wont' && !frs.some(f => arr(f.brd_requirements).includes(b.id)) && !nfrs.some(n => arr(n.brd_requirements).includes(b.id)));
  syn.push('## Exigences du BRD non couvertes', '', list(uncovered.map(b => `${b.id} — ${b.statement}`)));
}
syn.push('## Décisions produit à confirmer', '', list(dds.map(d => `${d.id} — ${d.decision}`)));
syn.push('## Points à trancher', '', list(openZones.map(z => `${z.id} — ${z.question}${z.blocking ? ' **(bloquant)**' : ''}`)));
writeOut(join(outDir, 'synthese.md'), syn.join('\n'));

const FOCUS = {
  approbateur: 'Vérifiez que le MVP, les priorités et les décisions produit correspondent à vos attentes.',
  relecteur: 'Vérifiez que les exigences et critères qui relèvent de votre domaine sont justes, complets et vérifiables.',
};
const reviewers = arr(s.governance?.reviewers).filter(r => r.role !== 'informé');
if (!reviewers.length) console.warn('Avertissement : aucun relecteur ni approbateur déclaré dans governance.reviewers.');
for (const r of reviewers) {
  const who = r.who ?? r.stakeholder ?? 'relecteur';
  const slug = String(who).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const zones = openZones.filter(z => z.ask_to && String(z.ask_to).toLowerCase() === String(who).toLowerCase());
  const f = [`# Revue du PRD — ${name} (v${version})`, '', `**Pour** : ${who} — rôle dans la revue : **${r.role}**`, '', FOCUS[r.role] ?? FOCUS.relecteur, ''];
  f.push('## Questions qui vous sont adressées', '', list(zones.map(z => `${z.id} — ${z.question}`)));
  if (r.role === 'approbateur') f.push('## Votre décision', '', 'Indiquez : **approuvé**, **approuvé avec réserves** (précisez-les) ou **refusé** (précisez pourquoi).', '');
  f.push('## Vos commentaires', '', 'Indiquez la référence concernée (FR, AC, NFR, section) pour chaque commentaire.', '', '| Référence | Commentaire |', '|---|---|', '| | |', '| | |', '| | |', '');
  writeOut(join(outDir, `relecteur-${slug}.md`), f.join('\n'));
}
console.log(`Dossier de revue généré : ${outDir} (synthèse + ${reviewers.length} fiche(s))`);
