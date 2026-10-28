#!/usr/bin/env node
// Génère, à partir de sad/<slug>/state.yaml (source de vérité) :
//   sad.md                    le dossier d'architecture, avec les vues C4 en Mermaid
//   adr/ADR-xxx-<titre>.md    un fichier MADR v4 par décision
//   contracts/API-xx.*.yaml   un squelette OpenAPI ou AsyncAPI par interface
// Tous ces fichiers sont écrasés à chaque génération.
// Usage : node render-sad.mjs <state.yaml> [--include-proposed]
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, today, humanReviewFooter } from './lib/common.mjs';
import { checkSad, coverage } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
const includeProposed = args.includes('--include-proposed');
if (!statePath) fail('Usage : node render-sad.mjs <state.yaml> [--include-proposed]', 2);
const s = loadState(statePath);
const root = dirname(statePath);

const DONE = ['validé', 'accepté'];
const kept = x => x && (DONE.includes(x.status) || (includeProposed && x.status === 'proposé'));
const mark = x => (x?.status === 'proposé' ? ' *(proposé)*' : '');
const pick = key => arr(s[key]).filter(kept);
const brown = s.context_mode === 'brownfield';
const ref = s.prd_ref ?? {};
// Libellés d'affichage des valeurs codées sans accent dans l'état.
const LABEL = {
  disponibilite: 'disponibilité', securite: 'sécurité', conformite: 'conformité', cout: 'coût', scalabilite: 'scalabilité',
  maintenabilite: 'maintenabilité', evolutivite: 'évolutivité', interoperabilite: 'interopérabilité', utilisabilite: 'utilisabilité',
  observabilite: 'observabilité', attenuer: 'atténuer', eviter: 'éviter', transferer: 'transférer', sante: 'santé',
  test_charge: 'test de charge', test_endurance: 'test d\'endurance', fitness_function: 'fitness function', test_securite: 'test de sécurité',
  analyse_statique: 'analyse statique', test_restauration: 'test de restauration', integration: 'intégration',
  customer_supplier: 'client-fournisseur', shared_kernel: 'noyau partagé', anticorruption_layer: 'couche anticorruption',
  open_host_service: 'service hôte ouvert', published_language: 'langage publié', separate_ways: 'chemins séparés', conformist: 'conformiste',
  existant_conservé: 'existant conservé', existant_modifié: 'existant modifié', existant_remplacé: 'existant remplacé', existant_retiré: 'existant retiré',
};
const lab = v => (v === undefined || v === null || v === '' ? v : LABEL[v] ?? v);
const slugify = t => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const drivers = pick('drivers'), contexts = pick('contexts'), elements = pick('elements'), relations = pick('relations');
const nrs = pick('nfr_responses'), dats = pick('data_entities'), apis = pick('interfaces'), threats = pick('threats');
const adrsAll = arr(s.decisions).filter(a => a.status !== 'proposé' || includeProposed);
const els = new Map(elements.map(e => [e.id, e]));
const elName = id => els.get(id)?.name ?? txt(id);

// ── Vues C4 (Mermaid flowchart, conventions C4) ─────────────────────────────
const KIND_LABEL = { person: 'Personne', system: 'Système', container: 'Conteneur', component: 'Composant' };
// Une personne sans cycle de vie explicite est un rôle qui existe déjà : présente dans les deux états, jamais signalée.
const lifecycleOf = e => e.lifecycle || (brown && e.kind === 'person' ? 'existant_conservé' : 'nouveau');
const inState = (e, st) => {
  const lc = lifecycleOf(e);
  if (st === 'actuel') return lc.startsWith('existant');
  return !['existant_retiré', 'existant_remplacé'].includes(lc);
};
const relInState = (r, st) => {
  const lc = r.lifecycle || 'nouveau';
  return st === 'actuel' ? lc.startsWith('existant') : !['existant_retiré', 'existant_remplacé'].includes(lc);
};
const nid = id => `n_${String(id).replace(/[^A-Za-z0-9]/g, '_')}`;
const esc = t => String(t ?? '').replace(/"/g, '#quot;').replace(/\r?\n/g, ' ');
const nodeLabel = e => {
  const type = e.kind === 'system' && e.external ? 'Système externe' : (KIND_LABEL[e.kind] ?? e.kind);
  const head = `<b>${esc(e.name)}</b>`;
  const kindLine = `[${type}${e.technology ? ` : ${esc(e.technology)}` : ''}]`;
  return `${head}<br/>${kindLine}${e.description ? `<br/><small>${esc(e.description)}</small>` : ''}`;
};
const nodeDecl = e => {
  const l = nodeLabel(e);
  if (e.kind === 'person') return `${nid(e.id)}(["${l}"])`;
  if (e.subtype === 'datastore') return `${nid(e.id)}[("${l}")]`;
  if (e.subtype === 'queue') return `${nid(e.id)}[["${l}"]]`;
  return `${nid(e.id)}["${l}"]`;
};
const kindClass = e => (e.kind === 'system' ? (e.external ? 'c4ext' : 'c4sys') : `c4${e.kind}`);

// Remonte un élément jusqu'au premier ancêtre visible dans la vue.
function lift(id, visible) {
  let cur = els.get(id);
  while (cur) {
    if (visible.has(cur.id)) return cur.id;
    cur = els.get(cur.parent);
  }
  return null;
}

function renderView({ title, visible, boundary, st }) {
  const lines = ['```mermaid', 'flowchart TB'];
  const vis = new Set([...visible].filter(id => els.has(id)));
  const inside = boundary ? [...vis].filter(id => els.get(id).parent === boundary) : [];
  for (const id of vis) if (!inside.includes(id)) lines.push(`  ${nodeDecl(els.get(id))}`);
  if (boundary) {
    const b = els.get(boundary);
    lines.push(`  subgraph b_${nid(boundary)}["${esc(b.name)} [${KIND_LABEL[b.kind] ?? b.kind}]"]`);
    for (const id of inside) lines.push(`    ${nodeDecl(els.get(id))}`);
    lines.push('  end');
    lines.push(`  style b_${nid(boundary)} fill:none,stroke:#888,stroke-dasharray:6 4`);
  }
  const seen = new Set();
  for (const r of relations.filter(r => relInState(r, st))) {
    const a = lift(r.from, vis), b = lift(r.to, vis);
    if (!a || !b || a === b) continue;
    const key = `${a}>${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const label = [r.description, r.technology ? `[${r.technology}]` : ''].filter(Boolean).join(' ');
    lines.push(`  ${nid(a)} ${r.style === 'async' ? '-.->' : '-->'}${label ? `|"${esc(label)}"|` : ''} ${nid(b)}`);
  }
  lines.push('  classDef c4person fill:#08427b,color:#fff,stroke:#052e56');
  lines.push('  classDef c4sys fill:#1168bd,color:#fff,stroke:#0b4884');
  lines.push('  classDef c4ext fill:#8a8a8a,color:#fff,stroke:#6b6b6b');
  lines.push('  classDef c4container fill:#438dd5,color:#fff,stroke:#2e6295');
  lines.push('  classDef c4component fill:#85bbf0,color:#000,stroke:#5d82a8');
  lines.push('  classDef lcNew stroke:#2e7d32,stroke-width:4px');
  lines.push('  classDef lcMod stroke:#ef6c00,stroke-width:3px,stroke-dasharray:5 3');
  for (const id of vis) {
    const e = els.get(id);
    lines.push(`  class ${nid(id)} ${kindClass(e)}`);
    if (brown && st === 'cible') {
      if (lifecycleOf(e) === 'nouveau') lines.push(`  class ${nid(id)} lcNew`);
      else if (e.lifecycle === 'existant_modifié') lines.push(`  class ${nid(id)} lcMod`);
    }
  }
  lines.push('```');
  return `**${title}**\n\n${lines.join('\n')}\n`;
}

const states = brown ? ['actuel', 'cible'] : ['cible'];
const stLabel = st => (brown ? (st === 'actuel' ? ' — état actuel' : ' — état cible') : '');
function c4Views() {
  const outV = [];
  for (const st of states) {
    const inSt = elements.filter(e => inState(e, st));
    const top = new Set(inSt.filter(e => e.kind === 'person' || e.kind === 'system').map(e => e.id));
    if (top.size) outV.push(['1. Contexte', renderView({ title: `Niveau 1 : contexte${stLabel(st)}`, visible: top, st })]);
  }
  for (const st of states) {
    const inSt = elements.filter(e => inState(e, st));
    for (const sys of inSt.filter(e => e.kind === 'system' && !e.external)) {
      const cts = inSt.filter(e => e.kind === 'container' && e.parent === sys.id);
      if (!cts.length) continue;
      const vis = new Set([...inSt.filter(e => e.kind === 'person' || (e.kind === 'system' && e.id !== sys.id)).map(e => e.id), ...cts.map(e => e.id)]);
      outV.push(['2. Conteneurs', renderView({ title: `Niveau 2 : conteneurs de ${sys.name}${stLabel(st)}`, visible: vis, boundary: sys.id, st })]);
    }
  }
  for (const st of states) {
    const inSt = elements.filter(e => inState(e, st));
    for (const ct of inSt.filter(e => e.kind === 'container')) {
      const cps = inSt.filter(e => e.kind === 'component' && e.parent === ct.id);
      if (!cps.length) continue;
      const vis = new Set([
        ...inSt.filter(e => e.kind === 'person' || (e.kind === 'system' && e.id !== ct.parent)).map(e => e.id),
        ...inSt.filter(e => e.kind === 'container' && e.parent === ct.parent && e.id !== ct.id).map(e => e.id),
        ...cps.map(e => e.id),
      ]);
      outV.push(['3. Composants', renderView({ title: `Niveau 3 : composants de ${ct.name}${stLabel(st)}`, visible: vis, boundary: ct.id, st })]);
    }
  }
  return outV;
}

// ── sad.md ───────────────────────────────────────────────────────────────────
const out = [];
const h = (n, t) => out.push(`${'#'.repeat(n)} ${t}\n`);
const p = t => out.push(`${t}\n`);
const lvl = t => ({ faible: 1, moyenne: 2, moyen: 2, forte: 3, fort: 3 }[t] ?? 0);
const threatLevel = t => { const v = lvl(t.likelihood) * lvl(t.impact); return v >= 6 ? 'élevé' : v >= 3 ? 'moyen' : v ? 'faible' : '—'; };
const adrFile = a => `adr/${a.id}-${slugify(a.title)}.md`;

h(1, `SAD — ${txt(s.initiative?.name)}`);
p(`**Version** : ${txt(s.governance?.version)} — **Statut** : ${txt(s.governance?.status)} — **Contexte** : ${txt(s.context_mode)} — **PRD** : v${txt(s.source_prd?.version)}\n`);
p(`> **Copie de travail** — régénérée depuis \`state.yaml\` le ${today()}, et réécrite à chaque génération. Ne la modifie pas directement : toute correction passe par l'état. Les versions figées, s'il y en a, sont dans \`versions/\`.\n`);
if (includeProposed) p('> **Brouillon de travail** : inclut les éléments au statut *proposé*.');
const labels = { context: 'Contexte et périmètre', drivers: 'Moteurs architecturaux', domain: 'Domaine', views: 'Vues C4', decisions: 'Décisions', quality: 'Réponses aux NFR', data_interfaces: 'Données et interfaces', security: 'Sécurité', existing: 'Existant', risks: 'Hypothèses et risques' };
h(2, 'Statut du document');
p(table(['Section', 'Statut'], Object.entries(labels).filter(([k]) => brown || k !== 'existing').map(([k, l]) => [l, s.sad_sections?.[k] ?? 'à rédiger'])));

// 1. Contexte
h(2, '1. Contexte et périmètre');
p(`**Problème** : ${txt(ref.problem)}\n`);
p(`**Vision** : ${txt(ref.vision)}\n`);
if (brown) p(`**Existant concerné** : ${txt(s.existing?.scope)}\n`);
h(3, 'Contraintes');
p(table(['ID', 'Contrainte', 'Origine'], [
  ...arr(ref.constraints).map(c => [c.id, c.statement, `PRD — ${txt(c.imposed_by)}`]),
  ...arr(s.constraints).filter(kept).map(c => [c.id + mark(c), c.statement, c.origin]),
]));

// 2. Moteurs
h(2, '2. Moteurs architecturaux');
const rank = d => -(lvl(d.importance === 'haute' ? 'fort' : d.importance === 'moyenne' ? 'moyen' : 'faible') * 10 + lvl(d.difficulty === 'haute' ? 'fort' : d.difficulty === 'moyenne' ? 'moyen' : 'faible'));
const sortedDrivers = [...drivers].sort((a, b) => rank(a) - rank(b));
p(table(['ID', 'Type', 'Importance', 'Difficulté', 'Origine', 'Mesure'], sortedDrivers.map(d => [d.id + mark(d), lab(d.kind), d.importance, d.difficulty, arr(d.origin).join(', '), d.scenario?.measure])));
for (const d of sortedDrivers) {
  const sc = d.scenario ?? {};
  h(3, `${d.id} — ${txt(lab(d.kind))}`);
  p(table(['Source', 'Stimulus', 'Environnement', 'Artefact', 'Réponse', 'Mesure'], [[sc.source, sc.stimulus, sc.environment, sc.artifact, sc.response, sc.measure]]));
}

// 3. Domaine
h(2, '3. Domaine');
p(table(['ID', 'Contexte', 'Responsabilité', 'Agrégats', 'Règles garanties'], contexts.map(c => [c.id + mark(c), c.name, c.responsibility,
  arr(c.aggregates).map(a => a.name).join(', '), arr(c.aggregates).flatMap(a => arr(a.invariants)).join(', ')])));
const cmap = arr(s.context_map);
if (cmap.length) {
  h(3, 'Carte des contextes');
  const cname = id => contexts.find(c => c.id === id)?.name ?? id;
  p(['```mermaid', 'flowchart LR', ...[...new Set(cmap.flatMap(m => [m.upstream, m.downstream]))].map(id => `  ${nid(id)}["${esc(cname(id))}"]`),
    ...cmap.map(m => `  ${nid(m.upstream)} -->|"${esc(lab(m.pattern))}"| ${nid(m.downstream)}`), '```'].join('\n') + '\n');
  p('_Les flèches vont du contexte amont vers le contexte aval._\n');
}

// 4. Vues C4
h(2, '4. Vues C4');
if (brown) p('_En vue cible, trait vert épais : nouvel élément ; trait orange pointillé : élément existant modifié. Les éléments remplacés ou retirés n\'apparaissent qu\'en vue actuelle._\n');
let lastSection = '';
for (const [section, body] of c4Views()) { if (section !== lastSection) { h(3, section); lastSection = section; } p(body); }
h(3, 'Catalogue des éléments');
const kindOrder = { person: 0, system: 1, container: 2, component: 3 };
p(table(['ID', 'Type', 'Nom', 'Technologie', 'Parent', ...(brown ? ['Cycle de vie'] : []), 'Contextes', 'Équipe'],
  [...elements].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]).map(e => [e.id + mark(e), (e.kind === 'system' && e.external) ? 'système externe' : (KIND_LABEL[e.kind] ?? e.kind).toLowerCase(), e.name, e.technology,
    e.parent ? elName(e.parent) : '—', ...(brown ? [lab(lifecycleOf(e))] : []), arr(e.contexts).join(', '), e.owner])));

// 5. Décisions
h(2, '5. Décisions d\'architecture');
p(table(['ID', 'Décision', 'Statut', 'Option retenue', 'Règle', 'Moteurs', 'Décidé par'], adrsAll.map(a => [`[${a.id}](${adrFile(a)})${mark(a)}`, a.title, a.status, a.outcome, a.rule, arr(a.drivers).join(', '), a.decided_by])));

// 6. Allocation
h(2, '6. Allocation des exigences fonctionnelles');
const frs = arr(ref.functional_requirements);
p(table(['FR', 'Priorité', 'Release', 'Éléments'], frs.map(f => {
  const where = elements.filter(e => arr(e.frs).includes(f.id)).map(e => `${e.id} ${e.name}`);
  return [f.id, prLabel(f.priority), f.release, where.join(', ') || (f.priority === 'wont' ? 'n/a' : '**non allouée**')];
})));

// 7. NFR
h(2, '7. Réponses aux exigences non fonctionnelles');
const nfrIndex = new Map(arr(ref.nfrs).map(n => [n.id, n]));
p(table(['NFR', 'Cible', 'Tactiques', 'Éléments', 'ADR', 'Vérification', 'Étape'], [
  ...nrs.map(r => [`${r.nfr}${mark(r)}`, nfrIndex.get(r.nfr)?.target, arr(r.tactics).join(' ; '), arr(r.elements).map(elName).join(', '), arr(r.decisions).join(', '),
    `${txt(lab(r.verification?.method))} — ${txt(r.verification?.description)}`, lab(r.verification?.stage)]),
  ...arr(ref.nfrs).filter(n => !nrs.some(r => r.nfr === n.id)).map(n => [n.id, n.target, '**sans réponse**', '—', '—', '—', '—']),
]));

// 8. Données et interfaces
h(2, '8. Données et interfaces');
h(3, 'Données');
p(table(['ID', 'Donnée', 'Contexte', 'Source de vérité', 'Classification', 'Conservation'], dats.map(d => [d.id + mark(d), d.name, d.context, elName(d.store), lab(d.classification), d.retention])));
h(3, 'Interfaces');
for (const api of apis) {
  h(4, `${api.id} — ${txt(api.name)} (${txt(api.kind)})${mark(api)}`);
  p(`Fournisseur : ${elName(api.provider)} · Consommateurs : ${arr(api.consumers).map(elName).join(', ') || '—'}${brown ? ` · Cycle de vie : ${txt(api.lifecycle)}` : ''} · Squelette : \`contracts/${api.id}.${api.kind === 'asyncapi' ? 'asyncapi' : 'openapi'}.yaml\`\n`);
  p(table(['ID', 'Opération', 'But', 'FR', 'Données', 'Authentification'], arr(api.operations).map(o => [o.id, o.name, o.purpose, arr(o.frs).join(', '), arr(o.data).join(', '), o.auth])));
}

// 9. Sécurité
h(2, '9. Sécurité');
h(3, 'Frontières de confiance');
p(table(['ID', 'Frontière', 'Éléments'], arr(s.trust_boundaries).map(t => [t.id, t.name, arr(t.elements).map(elName).join(', ')])));
h(3, 'Menaces');
const strideNames = { S: 'Usurpation', T: 'Altération', R: 'Répudiation', I: 'Divulgation', D: 'Déni de service', E: 'Élévation de privilèges' };
p(table(['STRIDE', ...Object.keys(strideNames)], [['Nombre', ...Object.keys(strideNames).map(k => threats.filter(t => t.stride === k).length)]]));
const levelOrder = { élevé: 0, moyen: 1, faible: 2, '—': 3 };
const tgtName = id => els.get(id)?.name ?? (relations.find(r => r.id === id) ? `${id} (${elName(relations.find(r => r.id === id).from)} → ${elName(relations.find(r => r.id === id).to)})` : id);
if (arr(s.security_catalogs).length) p(`Référentiels de contrôles retenus : ${arr(s.security_catalogs).join(' ; ')}\n`);
p(table(['ID', 'Catégorie', 'Cible', 'Menace', 'Niveau', 'Traitement', 'Mesures', 'Contrôles', 'Accepté par'],
  [...threats].sort((a, b) => levelOrder[threatLevel(a)] - levelOrder[threatLevel(b)]).map(t => [t.id + mark(t), strideNames[t.stride] ?? t.stride, tgtName(t.target), t.description, threatLevel(t), lab(t.treatment), arr(t.mitigations).join(' ; '), arr(t.controls).join(', ') || '—', t.accepted_by])));

// 10. Existant
if (brown) {
  h(2, '10. Existant');
  const lcs = ['existant_conservé', 'existant_modifié', 'existant_remplacé', 'existant_retiré', 'nouveau'];
  p(table(['Cycle de vie', 'Éléments'], lcs.map(l => [lab(l), elements.filter(e => lifecycleOf(e) === l).map(e => e.name).join(', ') || '—'])));
  h(3, 'Dette technique concernée');
  p(table(['ID', 'Dette', 'Éléments', 'Impact', 'Preuves'], arr(s.tech_debt).map(d => [d.id, d.text, arr(d.elements).map(elName).join(', '), d.impact, arr(d.evidence).join(', ')])));
  h(3, 'Sources de l\'inventaire');
  p(table(['ID', 'Type', 'Référence'], arr(s.sources).map(x => [x.id, x.type, x.ref])));
}

// 11. Hypothèses et risques
h(2, `${brown ? '11' : '10'}. Hypothèses, spikes et risques`);
p(table(['ID', 'Hypothèse', 'Validation', 'Statut'], arr(s.hypotheses).filter(x => x.status !== 'infirmée').map(x => [x.id, x.text, x.validation === 'spike' ? `spike${x.spike ? ` : ${x.spike}` : ''}` : x.validation, x.status])));
const assumed = arr(s.shadow_zones).filter(z => z.status === 'assumée');
if (assumed.length) { h(3, 'Zones d\'ombre assumées'); p(table(['ID', 'Question', 'Raison'], assumed.map(z => [z.id, z.question, z.resolution]))); }
h(3, 'Risques');
p(table(['ID', 'Risque', 'Probabilité', 'Impact', 'Réponse'], arr(s.risks).filter(kept).map(r => [r.id + mark(r), r.text, r.likelihood, r.impact, r.response])));

// 12. Glossaire
h(2, `${brown ? '12' : '11'}. Glossaire`);
p(table(['Terme', 'Définition'], arr(s.glossary).map(g => [g.term, g.definition])));

// Annexe : vérification
h(2, 'Couverture');
p(table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], coverage(s, {}).map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason}` : `**non atteint** (manquent : ${c.missing.join(', ')})`])));
h(2, 'Annexe — Points de vérification');
const findings = checkSad(s);
p('_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._\n');
p(findings.length ? table(['Élément', 'Règle', 'Avertissement'], findings.map(f => [f.id, f.rule, f.message])) : '_Aucun avertissement._\n');
const waivers = [...drivers, ...elements, ...arr(s.decisions)].flatMap(x => arr(x.lint_waivers).map(w => [x.id, w.rule, w.reason]));
if (waivers.length) { h(3, 'Dérogations acceptées'); p(table(['Élément', 'Règle', 'Raison'], waivers)); }

writeOut(join(root, 'sad.md'), out.join('\n') + humanReviewFooter('dossier d’architecture'));

// ── ADR (MADR v4) ─────────────────────────────────────────────────────────────
const driverLabel = id => {
  const d = arr(s.drivers).find(x => x.id === id);
  if (d) return `${id} — ${txt(lab(d.kind))} : ${txt(d.scenario?.response)} (${txt(d.scenario?.measure)})`;
  const c = [...arr(ref.constraints), ...arr(s.constraints)].find(x => x.id === id) ?? arr(ref.business_rules).find(x => x.id === id) ?? arr(ref.nfrs).find(x => x.id === id);
  return c ? `${id} — ${txt(c.statement)}` : id;
};
for (const a of adrsAll) {
  const md = [
    '---',
    `status: ${txt(a.status)}`,
    `date: ${txt(a.date)}`,
    `decision-makers: ${txt(a.decided_by)}`,
    ...(a.supersedes ? [`supersedes: ${a.supersedes}`] : []),
    '---',
    '',
    `# ${a.id} — ${txt(a.title)}`,
    '',
    `> Généré à partir de \`state.yaml\` le ${today()} (structure MADR v4). Ne pas modifier ce fichier : un ADR accepté se remplace par un nouvel ADR.`,
    '',
    '## Contexte et énoncé du problème', '', txt(a.context), '',
    '## Moteurs de décision', '', list(arr(a.drivers).map(driverLabel)),
    '## Options envisagées', '', list(arr(a.options).map(o => o.name)),
    '## Résultat de la décision', '',
    a.outcome ? `Option retenue : « ${a.outcome} ».` : '_Décision non encore rendue._', '',
    ...(a.outcome ? [`Justification : ${txt(a.justification)}`, ''] : []),
    '### Conséquences', '',
    list([...arr(a.consequences?.good).map(c => `Positive : ${c}`), ...arr(a.consequences?.bad).map(c => `Négative : ${c}`)]),
    '### Règle', '', `**Empêche** : ${txt(a.prevents)}`, '', `**Règle** : ${txt(a.rule)}`, '',
    '### Confirmation', '', txt(a.confirmation), '',
    '## Avantages et inconvénients des options', '',
    ...arr(a.options).flatMap(o => [`### ${txt(o.name)}`, '', ...(o.description ? [o.description, ''] : []),
      list([...arr(o.pros).map(x => `Avantage : ${x}`), ...arr(o.cons).map(x => `Inconvénient : ${x}`)])]),
    '## Informations complémentaires', '',
    `Éléments concernés : ${arr(a.elements).map(id => `${id} ${elName(id)}`).join(', ') || '—'}`, '',
  ];
  writeOut(join(root, adrFile(a)), md.join('\n'));
}

// ── Squelettes de contrats ────────────────────────────────────────────────────
const METHOD = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S*)$/i;
for (const api of apis) {
  const header = `# Squelette généré à partir de state.yaml le ${today()} (${api.id}). À compléter à l'implémentation ;\n# les extensions x-requirements et x-data préservent la traçabilité vers le PRD et le SAD.\n`;
  if (api.kind === 'asyncapi') {
    const doc = { asyncapi: '3.0.0', info: { title: txt(api.name), version: String(s.governance?.version ?? '0.1'), description: `Fournisseur : ${elName(api.provider)}` }, channels: {}, operations: {} };
    for (const o of arr(api.operations)) {
      const ch = String(o.name ?? o.id).replace(/[^A-Za-z0-9_.-]/g, '_');
      doc.channels[ch] = { address: String(o.name ?? o.id), messages: { [ch]: { name: String(o.name ?? o.id), summary: o.purpose ?? '' } } };
      doc.operations[o.id] = { action: 'send', channel: { $ref: `#/channels/${ch}` }, summary: o.purpose ?? '', 'x-requirements': arr(o.frs), 'x-data': arr(o.data) };
    }
    writeOut(join(root, 'contracts', `${api.id}.asyncapi.yaml`), header + yaml.dump(doc, { lineWidth: 120 }));
  } else if (api.kind === 'openapi') {
    const doc = { openapi: '3.1.0', info: { title: txt(api.name), version: String(s.governance?.version ?? '0.1'), description: `Fournisseur : ${elName(api.provider)}` }, paths: {} };
    const unmapped = [];
    for (const o of arr(api.operations)) {
      const m = String(o.name ?? '').match(METHOD);
      if (!m) { unmapped.push({ id: o.id, name: o.name }); continue; }
      const [, method, path] = m;
      doc.paths[path] ??= {};
      doc.paths[path][method.toLowerCase()] = {
        operationId: o.id, summary: o.purpose ?? '', 'x-requirements': arr(o.frs), 'x-data': arr(o.data),
        ...(o.auth ? { description: `Authentification : ${o.auth}` } : {}),
        responses: { default: { description: 'À définir à l\'implémentation' } },
      };
    }
    if (unmapped.length) doc['x-unmapped-operations'] = unmapped;
    writeOut(join(root, 'contracts', `${api.id}.openapi.yaml`), header + yaml.dump(doc, { lineWidth: 120 }));
  }
}

console.log(`SAD généré : ${join(root, 'sad.md')} (${drivers.length} moteur(s), ${elements.length} élément(s), ${adrsAll.length} ADR, ${apis.length} interface(s), ${threats.length} menace(s), ${findings.length} avertissement(s))`);
