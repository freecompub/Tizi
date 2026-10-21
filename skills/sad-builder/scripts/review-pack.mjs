#!/usr/bin/env node
// Génère le dossier de revue d'architecture d'une version : synthèse d'une page et une fiche par relecteur.
// Usage : node review-pack.mjs <sad/<slug>/state.yaml>
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, today } from './lib/common.mjs';

const statePath = process.argv[2];
if (!statePath) fail('Usage : node review-pack.mjs <state.yaml>', 2);
const s = loadState(statePath);
const version = String(s.governance?.version ?? '');
const outDir = join(dirname(statePath), 'review', `v${version}`);
const name = s.initiative?.name ?? '';
const ok = x => ['validé', 'accepté'].includes(x?.status);
const drivers = arr(s.drivers).filter(ok), adrs = arr(s.decisions).filter(x => x.status === 'accepté');
const threats = arr(s.threats).filter(ok), nrs = arr(s.nfr_responses).filter(ok);
const openZones = arr(s.shadow_zones).filter(z => z.status === 'ouverte');
const spikes = arr(s.hypotheses).filter(h => h.status === 'à vérifier' && h.validation === 'spike');
const top = drivers.filter(d => d.importance === 'haute');

const syn = [`# Synthèse pour la revue d'architecture — ${name} (v${version})`, '', `Préparée le ${today()}. Le SAD complet et les ADR accompagnent cette synthèse. La revue porte sur les décisions et leurs compromis.`, ''];
syn.push(`**Contexte** : ${txt(s.context_mode)} — **PRD** : v${txt(s.source_prd?.version)}`, '');
syn.push('## Moteurs principaux', '', table(['ID', 'Type', 'Mesure', 'Servi par'], top.map(d => [d.id, d.kind, d.scenario?.measure,
  [...adrs.filter(a => arr(a.drivers).includes(d.id)).map(a => a.id), ...nrs.filter(r => arr(r.drivers).includes(d.id)).map(r => r.id)].join(', ') || '**rien**'])));
syn.push('## Décisions et ce qu\'elles sacrifient', '', table(['ADR', 'Décision', 'Option retenue', 'Conséquences négatives', 'Décidé par'],
  adrs.map(a => [a.id, a.title, a.outcome, arr(a.consequences?.bad).join(' ; '), a.decided_by])));
const accepted = threats.filter(t => t.treatment === 'accepter');
syn.push('## Menaces acceptées', '', table(['ID', 'Menace', 'Accepté par'], accepted.map(t => [t.id, t.description, t.accepted_by])));
syn.push('## Hypothèses encore à prouver', '', list(spikes.map(h => `${h.id} — ${h.text}${h.spike ? ` (spike : ${h.spike})` : ''}`)));
const toPrd = arr(s.governance?.change_requests).filter(c => ['prd', 'brd'].includes(c.target));
if (toPrd.length) syn.push('## Demandes de changement vers l\'amont', '', list(toPrd.map(c => `${c.id} → ${c.target} : ${txt(c.description)}`)));
// Grille par pilier (references/architecture-review.md) : preuves déjà présentes dans l'état.
const PILLARS = [
  ['fiabilite', 'Fiabilité', ['disponibilite'], ['test_restauration', 'test_endurance'], ['D']],
  ['securite', 'Sécurité', ['securite', 'conformite'], ['test_securite'], ['S', 'T', 'R', 'I', 'E']],
  ['couts', 'Optimisation des coûts', ['cout'], [], []],
  ['exploitation', 'Excellence opérationnelle', ['observabilite', 'maintenabilite', 'evolutivite'], ['monitoring', 'fitness_function'], []],
  ['performance', 'Efficacité des performances', ['performance', 'scalabilite'], ['test_charge'], []],
];
const reviewed = new Map(arr(s.architecture_review).map(r => [r.pillar, r]));
syn.push('## Grille par pilier', '', 'Preuves rassemblées depuis l\'état ; l\'appréciation revient aux relecteurs.', '', table(['Pilier', 'Moteurs', 'ADR', 'Vérifications', 'Menaces', 'Appréciation'],
  PILLARS.map(([key, label, kinds, methods, strides]) => {
    const ds = drivers.filter(d => kinds.includes(d.kind));
    const as = adrs.filter(a => arr(a.drivers).some(id => ds.some(d => d.id === id)));
    const vs = nrs.filter(r => methods.includes(r.verification?.method) || arr(r.drivers).some(id => ds.some(d => d.id === id)));
    const ts = threats.filter(t => strides.includes(t.stride));
    const rv = reviewed.get(key);
    return [label, ds.map(d => d.id).join(', ') || '**aucun**', as.map(a => a.id).join(', ') || '—', vs.map(r => r.id).join(', ') || '—', ts.length || '—', rv ? `${rv.assessment} (${txt(rv.reviewer)})` : 'à apprécier'];
  })));
syn.push('## Points à trancher', '', list(openZones.map(z => `${z.id} — ${z.question}${z.blocking ? ' **(bloquant)**' : ''}`)));
writeOut(join(outDir, 'synthese.md'), syn.join('\n'));

const FOCUS = {
  approbateur: 'Vérifiez que les décisions servent les moteurs principaux et que leurs conséquences négatives sont acceptables.',
  relecteur: 'Vérifiez que les éléments, contrats, vérifications et menaces de votre domaine sont justes, faisables et complets.',
};
const reviewers = arr(s.governance?.reviewers).filter(r => r.role !== 'informé');
if (!reviewers.length) console.warn('Avertissement : aucun relecteur ni approbateur déclaré dans governance.reviewers.');
for (const r of reviewers) {
  const who = r.who ?? 'relecteur';
  const slug = String(who).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const same = v => v && String(v).toLowerCase() === String(who).toLowerCase();
  const zones = openZones.filter(z => same(z.ask_to));
  const owned = arr(s.elements).filter(e => ok(e) && same(e.owner));
  const arbitrations = openZones.filter(z => same(z.arbiter));
  const f = [`# Revue d'architecture — ${name} (v${version})`, '', `**Pour** : ${who} — rôle dans la revue : **${r.role}**`, '', FOCUS[r.role] ?? FOCUS.relecteur, ''];
  if (owned.length) f.push('## Éléments dont votre équipe est responsable', '', table(['ID', 'Élément', 'Technologie', 'FR allouées'], owned.map(e => [e.id, e.name, e.technology, arr(e.frs).join(', ')])));
  if (arbitrations.length) f.push('## Arbitrages attendus de vous', '', list(arbitrations.map(z => `${z.id} — ${z.question}`)));
  f.push('## Questions qui vous sont adressées', '', list(zones.map(z => `${z.id} — ${z.question}`)));
  if (r.role === 'approbateur') f.push('## Votre décision', '', 'Indiquez : **approuvé**, **approuvé avec réserves** (précisez-les) ou **refusé** (précisez pourquoi).', '');
  f.push('## Vos commentaires', '', 'Indiquez la référence concernée (ADR, élément, NFR, menace, section) pour chaque commentaire.', '', '| Référence | Commentaire |', '|---|---|', '| | |', '| | |', '| | |', '');
  writeOut(join(outDir, `relecteur-${slug}.md`), f.join('\n'));
}
console.log(`Dossier de revue généré : ${outDir} (synthèse + ${reviewers.length} fiche(s))`);
