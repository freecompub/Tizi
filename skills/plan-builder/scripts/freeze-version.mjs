#!/usr/bin/env node
// Fige une version d'un document (BRD, PRD, SAD ou plan, selon le champ `document` de l'état) :
// copie immuable de state.yaml et du document généré dans versions/v<version>/,
// avec un changelog calculé par identifiants par rapport à la version figée précédente.
// Usage : node freeze-version.mjs <dossier>/state.yaml [--baseline]
// Script commun aux skills brd-builder, prd-builder, sad-builder et plan-builder.
import { existsSync, readdirSync, copyFileSync, chmodSync, cpSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { arr, loadState, writeOut, fail, cmpVersion, today, list } from './lib/common.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
const baseline = args.includes('--baseline');
if (!statePath) fail('Usage : node freeze-version.mjs <state.yaml> [--baseline]', 2);

const state = loadState(statePath);
const doc = ['prd', 'sad', 'plan'].includes(state.document) ? state.document : 'brd';
const version = String(state.governance?.version ?? '');
if (!/^\d+\.\d+$/.test(version)) fail(`governance.version invalide : « ${version} » (attendu : majeur.mineur, ex. 0.3)`);

const root = dirname(statePath);
const versionsDir = join(root, 'versions');
const target = join(versionsDir, `v${version}`);
if (existsSync(target)) fail(`La version ${version} est déjà figée (${target}). Incrémente governance.version.`);

// Avertissements (non bloquants : le contrôle formel relève d'une phase ultérieure).
const warnings = [];
if (baseline) {
  if (state.governance?.status !== 'baseline') warnings.push('governance.status n\'est pas « baseline ».');
  const approvers = arr(state.governance?.reviewers).filter(r => r.role === 'approbateur').map(r => r.stakeholder ?? r.who);
  const ok = new Set(arr(state.governance?.approvals).filter(a => String(a.version) === version && a.decision !== 'refusé').map(a => a.stakeholder ?? a.who));
  const missing = approvers.filter(a => !ok.has(a));
  if (approvers.length === 0) warnings.push('aucun approbateur déclaré.');
  if (missing.length) warnings.push(`approbation absente pour la version ${version} : ${missing.join(', ')}.`);
}

// Régénère le document pour que la copie corresponde exactement à l'état.
const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, `render-${doc}.mjs`), statePath], { stdio: 'inherit' });

// Version figée précédente.
const previous = existsSync(versionsDir)
  ? readdirSync(versionsDir).filter(d => /^v\d+\.\d+$/.test(d)).map(d => d.slice(1)).filter(v => cmpVersion(v, version) < 0).sort(cmpVersion).pop()
  : undefined;

// Changelog par identifiants.
const COLLECTIONS = {
  brd: [
    ['objectives', 'Objectifs'],
    ['business_requirements', 'Exigences métier'],
    ['business_rules', 'Règles métier'],
    ['decisions', 'Décisions'],
    ['risks', 'Risques'],
    ['candidate_needs', 'Besoins candidats'],
    ['hypotheses', 'Hypothèses'],
    ['shadow_zones', 'Zones d\'ombre'],
  ],
  prd: [
    ['goals', 'Objectifs produit'],
    ['personas', 'Personas'],
    ['journeys', 'Parcours'],
    ['releases', 'Releases'],
    ['functional_requirements', 'Exigences fonctionnelles'],
    ['business_rules', 'Règles métier'],
    ['acceptance_criteria', 'Critères d\'acceptation'],
    ['nfrs', 'Exigences non fonctionnelles'],
    ['constraints', 'Contraintes'],
    ['design_decisions', 'Décisions produit'],
    ['metrics', 'Métriques'],
    ['risks', 'Risques'],
    ['hypotheses', 'Hypothèses'],
    ['shadow_zones', 'Zones d\'ombre'],
  ],
  sad: [
    ['drivers', 'Moteurs architecturaux'],
    ['contexts', 'Contextes délimités'],
    ['elements', 'Éléments C4'],
    ['relations', 'Relations'],
    ['decisions', 'Décisions (ADR)'],
    ['nfr_responses', 'Réponses aux NFR'],
    ['data_entities', 'Données'],
    ['interfaces', 'Interfaces'],
    ['threats', 'Menaces'],
    ['tech_debt', 'Dette technique'],
    ['constraints', 'Contraintes'],
    ['risks', 'Risques'],
    ['hypotheses', 'Hypothèses'],
    ['shadow_zones', 'Zones d\'ombre'],
  ],
  plan: [
    ['stories', 'Stories'],
    ['examples', 'Exemples'],
    ['tasks', 'Tâches'],
    ['iterations', 'Itérations'],
    ['replenishments', 'Réapprovisionnements'],
    ['risks', 'Risques'],
    ['shadow_zones', 'Zones d\'ombre'],
  ],
}[doc];
const lines = [`# Changelog — v${version}`, '', `Figée le ${today()}${baseline ? ' — **baseline**' : ''}.`, ''];
if (!previous) {
  lines.push('Première version figée : pas de comparaison.', '');
} else {
  const prev = loadState(join(versionsDir, `v${previous}`, 'state.yaml'));
  lines.push(`Comparaison avec la v${previous}.`, '');
  let any = false;
  for (const [key, label] of COLLECTIONS) {
    const a = new Map(arr(prev[key]).map(x => [x.id, x]));
    const b = new Map(arr(state[key]).map(x => [x.id, x]));
    const added = [...b.keys()].filter(id => !a.has(id));
    const removed = [...a.keys()].filter(id => !b.has(id));
    const changed = [...b.keys()].filter(id => a.has(id) && JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)))
      .map(id => {
        const fields = Object.keys({ ...a.get(id), ...b.get(id) }).filter(f => JSON.stringify(a.get(id)[f]) !== JSON.stringify(b.get(id)[f]));
        return `${id} (${fields.join(', ')})`;
      });
    if (added.length + removed.length + changed.length === 0) continue;
    any = true;
    lines.push(`## ${label}`, '');
    if (added.length) lines.push(`**Ajoutés** : ${added.join(', ')}`, '');
    if (changed.length) lines.push('**Modifiés**', '', list(changed));
    if (removed.length) lines.push(`**Retirés** : ${removed.join(', ')}`, '');
  }
  if (!any) lines.push('Aucune différence sur les éléments identifiés.', '');
}
const decided = arr(state.governance?.comments).filter(c => c.decision && c.decision !== 'en_attente' && arr(c.changes).length);
if (decided.length) {
  lines.push('## Commentaires de revue intégrés', '', list(decided.map(c => `${c.id} (${c.author}) → ${arr(c.changes).join(', ')}`)));
}
if (warnings.length) lines.push('## Avertissements', '', list(warnings));

// Copie immuable.
writeOut(join(target, 'CHANGELOG.md'), lines.join('\n'));
for (const f of ['state.yaml', `${doc}.md`, ...(existsSync(join(root, 'refs.yaml')) ? ['refs.yaml'] : [])]) {
  copyFileSync(join(root, f), join(target, f));
}
// Documents générés à côté du document principal (ADR et contrats de la conception).
for (const d of ['adr', 'contracts', 'stories', 'tasks']) {
  if (existsSync(join(root, d))) cpSync(join(root, d), join(target, d), { recursive: true });
}
for (const f of ['state.yaml', `${doc}.md`, 'CHANGELOG.md']) {
  try { chmodSync(join(target, f), 0o444); } catch { /* lecture seule non supportée : ignoré */ }
}

console.log(`Version ${version} figée : ${target}${previous ? ` (comparée à v${previous})` : ''}`);
warnings.forEach(w => console.warn(`Avertissement : ${w}`));
