#!/usr/bin/env node
// Génère, à partir de plan/<slug>/state.yaml (source de vérité) et refs.yaml (handoffs amont) :
//   plan.md               le plan : story map de la release, préparation, tâches, dépendances, sprint ou flux
//   stories/US-xxx.md     une fiche par story : example mapping, exemples, préparation
//   tasks/TK-xxx.md       une fiche de contexte par tâche, pour un humain ou un agent
// Tous ces fichiers sont écrasés à chaque génération.
// Usage : node render-plan.mjs <state.yaml> [--include-proposed]
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, prLabel, today, humanReviewFooter, approxTokens } from './lib/common.mjs';
import { checkPlan, storyReadiness, taskCycles, coverage, iterationStats, capacitySuggestion } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--'));
const includeProposed = args.includes('--include-proposed');
if (!statePath) fail('Usage : node render-plan.mjs <state.yaml> [--include-proposed]', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const refsPath = join(root, 'refs.yaml');
if (!existsSync(refsPath)) console.warn('Avertissement : refs.yaml absent. Lance ingest-handoffs.mjs : les fiches de contexte seront incomplètes.');
const refs = existsSync(refsPath) ? loadState(refsPath) : {};
const prd = refs.prd ?? {}, sad = refs.sad ?? {};

const settings = s.settings ?? {};
const flux = settings.cadence === 'flux';
const weights = settings.sizes ?? { S: 1, M: 2, L: 3, XL: 5 };
// Le plan montre aussi les éléments proposés (marqués) : il sert à préparer l'engagement de l'équipe.
const shown = x => x && x.status !== 'abandonné';
void includeProposed;
const mark = x => (x?.status === 'proposé' ? ' *(proposé)*' : '');
const stories = arr(s.stories).filter(shown), tasks = arr(s.tasks).filter(shown), examples = arr(s.examples).filter(shown);
const exById = new Map(examples.map(e => [e.id, e]));
const storyById = new Map(stories.map(x => [x.id, x]));
const readiness = new Map(stories.map(x => [x.id, storyReadiness(s, x, refs)]));
const readyLabel = id => (readiness.get(id)?.ready ? 'prête' : 'non prête');

// Index amont
const frIndex = new Map(arr(prd.releases).flatMap(r => arr(r.functional_requirements).map(f => [f.id, { ...f, release: r.id }])));
const rgIndex = new Map(arr(prd.business_rules).map(r => [r.id, r]));
const acIndex = new Map([...frIndex.values()].flatMap(f => arr(f.acceptance).map(a => [a.id, { ...a, fr: f.id }])));
const personaName = id => arr(prd.personas).find(p => p.id === id)?.name ?? txt(id);
const elIndex = new Map([...arr(sad.work_items), ...arr(sad.retired)].map(e => [e.id, e]));
const elName = id => elIndex.get(id)?.name ?? id;
const opIndex = new Map(arr(sad.interfaces).flatMap(api => arr(api.operations).map(o => [o.id, { ...o, api }])));
const nrIndex = new Map(arr(sad.verifications).map(v => [v.id, v]));
const thIndex = new Map(arr(sad.security_measures).map(m => [m.threat, m]));
const spikeIndex = new Map(arr(sad.spikes).map(h => [h.id, h]));
const ruleText = r => (r.ref ? `${r.ref} — ${txt(rgIndex.get(r.ref)?.statement ?? frIndex.get(r.ref)?.statement ?? acIndex.get(r.ref)?.scenario ?? r.text)}` : `${txt(r.text)} *(sans référence amont)*`);
const adrsFor = t => arr(sad.decisions).filter(a => arr(a.elements).some(e => arr(t.elements).includes(e)));
const gherkin = list_ => ['```gherkin', list_.map(e => [`Scénario: ${e.id} — ${txt(e.title)}`, `  Étant donné ${txt(e.given)}`, `  Quand ${txt(e.when)}`, `  Alors ${txt(e.then)}`].join('\n')).join('\n\n'), '```'].join('\n');

// ── plan.md ──────────────────────────────────────────────────────────────────
const out = [];
const h = (n, t) => out.push(`${'#'.repeat(n)} ${t}\n`);
const p = t => out.push(`${t}\n`);

h(1, `Plan — ${txt(s.initiative?.name)}`);
p(`**Version** : ${txt(s.governance?.version)} — **Statut** : ${txt(s.governance?.status)} — **Release** : ${txt(settings.release)} — **Cadence** : ${flux ? 'flux' : 'sprint'} — **PRD** : v${txt(prd.source?.prd_version)} — **Conception** : v${txt(sad.source?.sad_version)}\n`);
p(`> Document généré à partir de \`state.yaml\` et \`refs.yaml\` le ${today()}. Ne pas le modifier directement.`);

const nReady = stories.filter(x => readiness.get(x.id).ready).length;
const load = list_ => list_.reduce((n, t) => n + (weights[t.size] ?? 0), 0);
h(2, 'En bref');
p(table(['Stories', 'Prêtes', 'Tâches', 'Dont agent', 'Spikes ouverts', 'Questions ouvertes'], [[stories.length, nReady, tasks.filter(t => t.kind !== 'spike').length,
  tasks.filter(t => t.assignee_type === 'agent').length, tasks.filter(t => t.kind === 'spike' && t.status !== 'terminé').length,
  arr(s.shadow_zones).filter(z => z.status === 'ouverte').length]]));

// 1. Story map de la release
h(2, `1. Story map de ${txt(settings.release)}`);
const rows = [];
for (const act of arr(prd.story_map)) {
  for (const mt of arr(act.tasks).filter(t => !settings.release || t.release === settings.release)) {
    const us = stories.filter(x => x.map_task === mt.id);
    rows.push([`${act.id} ${txt(act.name)}`, `${mt.id} ${txt(mt.name)}`, us.map(x => `${x.id}${x.skeleton ? ' (squelette)' : ''} — ${readyLabel(x.id)}`).join(' ; ') || '**aucune story**']);
  }
}
p(table(['Activité', 'Tâche de la story map', 'Stories'], rows));
const releaseFrs = [...frIndex.values()].filter(f => f.release === settings.release && f.priority !== 'wont');
const uncovered = releaseFrs.filter(f => !stories.some(x => arr(x.frs).includes(f.id)));
if (uncovered.length) p(`**FR de la release sans story** : ${uncovered.map(f => f.id).join(', ')}\n`);

// 2. Préparation
h(2, '2. Préparation des stories (Definition of Ready calculée)');
const GAME = { ouverture: 'ouverture', milieu: 'milieu', fin: 'fin' };
p(table(['Story', 'Titre', 'Voie', 'FR ou origine', 'Temps', 'Taille', 'Règles', 'Exemples', 'Prête', 'Ce qui manque'], stories.map(x => {
  const r = readiness.get(x.id), rules = arr(x.example_map?.rules);
  const nEx = arr(s.examples).filter(e => e.story === x.id && e.status !== 'abandonné').length;
  return [`[${x.id}](stories/${x.id}.md)${mark(x)}`, `${txt(x.title)}${x.level ? ` (${x.level})` : ''}`, x.lane === 'rapide' ? 'rapide' : 'standard',
    x.lane === 'rapide' ? `${txt(x.origin?.type)} : ${txt(x.origin?.ref)}` : arr(x.frs).join(', '), GAME[x.game] ?? '—', x.size, rules.length, nEx, r.ready ? 'oui' : 'non', r.reasons.join(' ; ') || '—'];
})));

// 3. Tâches
h(2, '3. Tâches');
p(table(['Tâche', 'Type', 'Titre', 'Story', 'Éléments', 'Taille', 'Affectation', 'Dépend de', flux ? 'Rang' : 'Itération', 'Statut'],
  tasks.map(t => [`[${t.id}](tasks/${t.id}.md)${mark(t)}`, t.kind, t.title, t.story || (t.spike_of ? `spike ${t.spike_of}` : '—'), arr(t.elements).map(elName).join(', '),
    t.size, `${txt(t.assignee_type)}${t.assignee ? ` (${t.assignee})` : ''}`, arr(t.depends_on).join(', '), flux ? (t.order || '—') : txt(t.iteration), t.status])));

// 4. Dépendances
h(2, '4. Dépendances');
const withDeps = tasks.filter(t => arr(t.depends_on).length || tasks.some(x => arr(x.depends_on).includes(t.id)));
if (withDeps.length) {
  const nid = id => `t_${id.replace(/[^A-Za-z0-9]/g, '_')}`;
  const lines = ['```mermaid', 'flowchart LR'];
  for (const t of withDeps) lines.push(`  ${nid(t.id)}["${t.id} ${String(t.title ?? '').replace(/"/g, '#quot;')} (${txt(t.size)})"]`);
  for (const t of withDeps) for (const d of arr(t.depends_on)) if (tasks.some(x => x.id === d)) lines.push(`  ${nid(d)} --> ${nid(t.id)}`);
  lines.push('  classDef spike fill:#fff3e0,stroke:#ef6c00', '  classDef agent fill:#e8f5e9,stroke:#2e7d32');
  for (const t of withDeps) if (t.kind === 'spike') lines.push(`  class ${nid(t.id)} spike`); else if (t.assignee_type === 'agent') lines.push(`  class ${nid(t.id)} agent`);
  lines.push('```');
  p(lines.join('\n') + '\n');
  p('_Une flèche va de la tâche préalable vers celle qui en dépend. Orange : spike ; vert : tâche confiée à un agent._\n');
} else p('_Aucune dépendance déclarée._\n');
const cycles = taskCycles(tasks);
if (cycles.length) p(`**Dépendances circulaires** : ${cycles.map(c => c.join(' → ')).join(' ; ')}\n`);

// 5. Sprint ou flux
if (!flux) {
  h(2, '5. Itérations');
  for (const it of arr(s.iterations)) {
    const its = tasks.filter(t => t.iteration === it.id);
    const cap = it.capacity || settings.sprint?.capacity || 0;
    h(3, `${it.id}${mark(it)} — ${txt(it.goal)}`);
    p(`Du ${txt(it.start)} au ${txt(it.end)} · Charge ${load(its)} / capacité ${cap || '—'} · Engagement : ${it.commitment?.declared_by ? `déclaré par ${it.commitment.declared_by} le ${txt(it.commitment.date)}` : '**non déclaré**'} · Statut : ${txt(it.status)}\n`);
    p(list(its.map(t => `${t.status === 'terminé' ? '✓ ' : ''}${t.id} (${t.size}, ${txt(t.assignee_type)}) — ${txt(t.title)}`)));
    if (it.status === 'terminé' || it.review?.team?.date) {
      const st = iterationStats(s, it.id), g = it.review?.team?.grades ?? {};
      p(table(['Vélocité', 'Reste', 'Dont agents', 'Relecture humaine', 'Expérience', 'Fonctionnelle', 'Code'], [[st.velocity, st.overhang, st.agentVelocity, st.reviewLoad, g.experience || '—', g.fonctionnelle || '—', g.code || '—']]));
      const pr = it.review?.team?.process ?? {};
      if (arr(pr.keep).length + arr(pr.drop).length + arr(pr.try).length) p(`Processus — on garde : ${arr(pr.keep).join(' ; ') || '—'} · on arrête : ${arr(pr.drop).join(' ; ') || '—'} · on essaie : ${arr(pr.try).join(' ; ') || '—'}\n`);
      if (!it.review?.team?.date) p('_Revue d\'équipe non faite._\n');
    }
  }
  const sugg = capacitySuggestion(s);
  if (sugg) p(`**Capacité suggérée** pour la prochaine itération : ${sugg.velocity} (moyenne de ${sugg.basedOn.join(', ')}), dont charge humaine ${sugg.humanLoad} — réalisation humaine et relecture des ${sugg.agentVelocity} points produits par des agents (relecture : ${sugg.reviewLoad}). L'équipe fixe sa capacité ; ceci n'est qu'une proposition.\n`);
  const unplanned = tasks.filter(t => !t.iteration && t.status !== 'terminé');
  if (unplanned.length) { h(3, 'Hors itération'); p(list(unplanned.map(t => `${t.id} — ${txt(t.title)}`))); }
} else {
  h(2, '5. Flux');
  const wip = settings.flow?.wip_limit || 0;
  p(`Limite d'encours : ${wip || '**non définie**'} · En cours : ${tasks.filter(t => t.status === 'en_cours').length} · Lot de réapprovisionnement : ${settings.flow?.replenish_batch || '—'}\n`);
  h(3, 'File « prêt »');
  p(table(['Rang', 'Tâche', 'Taille', 'Affectation', 'Story prête'], tasks.filter(t => t.order > 0 && !['en_cours', 'terminé'].includes(t.status)).sort((a, b) => a.order - b.order)
    .map(t => [t.order, `${t.id} — ${txt(t.title)}`, t.size, t.assignee_type, t.story ? readyLabel(t.story) : 'n/a'])));
  h(3, 'Réapprovisionnements');
  p(table(['ID', 'Date', 'Tâches', 'Engagement'], arr(s.replenishments).map(r => [r.id + mark(r), r.date, arr(r.tasks).join(', '), r.commitment?.declared_by ? `${r.commitment.declared_by}, ${txt(r.commitment.date)}` : 'non déclaré'])));
}

// 6. Couverture de la conception
h(2, '6. Couverture de la conception');
const plannedRefs = new Set(tasks.flatMap(t => [...arr(t.threats), ...arr(t.verifications), t.spike_of].filter(Boolean)));
p(table(['Élément amont', 'Nature', 'Tâche'], [
  ...arr(sad.security_measures).map(m => [m.threat, `mesure de sécurité (${m.stride})`, tasks.filter(t => arr(t.threats).includes(m.threat)).map(t => t.id).join(', ') || '**non planifiée**']),
  ...arr(sad.verifications).filter(v => v.stage === 'tests').map(v => [v.id, `vérification ${v.nfr} (${v.method})`, tasks.filter(t => arr(t.verifications).includes(v.id)).map(t => t.id).join(', ') || '**non planifiée**']),
  ...arr(prd.transition_requirements).filter(t => !settings.release || !t.release || t.release === settings.release).map(t => [t.id, `transition (${String(t.kind ?? '').replace(/_/g, ' ')})`, tasks.filter(x => arr(x.transition).includes(t.id)).map(x => x.id).join(', ') || '**non planifiée**']),
  ...arr(sad.spikes).map(sp => [sp.id, 'spike', tasks.filter(t => t.spike_of === sp.id).map(t => t.id).join(', ') || (plannedRefs.has(sp.id) ? '' : '**non planifié**')]),
]));

// 6 bis. Releases : maturité et outcomes
h(2, '6 bis. Releases : maturité et outcomes');
const actName = id => arr(prd.story_map).find(a => a.id === id)?.name ?? id;
for (const r of arr(s.release_tracking)) {
  h(3, `${r.release} — ${txt(r.status)}${r.target_date ? ` (date visée : ${r.target_date})` : ''}`);
  if (arr(r.readiness).length) p(table(['Activité', 'Note', 'Remarque'], arr(r.readiness).map(x => [`${x.activity} ${txt(actName(x.activity))}`, x.grade, x.note])));
  p(table(['Métrique', 'Comment', 'Fenêtre', 'Responsable'], arr(r.measurement).map(m => [`${m.metric} ${txt(arr(prd.metrics).find(x => x.id === m.metric)?.name)}`, m.how, m.window, m.owner])));
  if (arr(r.observations).length) p(list(arr(r.observations).map(o => `${txt(o.date)} — ${txt(o.what)}${o.source ? ` (${o.source})` : ''}`)));
  p(`**Outcome** : ${txt(r.outcome)}${arr(r.learnings).length ? ` — enseignements : ${arr(r.learnings).join(' ; ')}` : ''}\n`);
}
if (!arr(s.release_tracking).length) p('_Aucun suivi de release enregistré._\n');

// 7. Zones d'ombre et risques
h(2, '7. Zones d\'ombre et risques');
p(table(['ID', 'Type', 'Question', 'Story', 'Adressée à', 'Bloquante'], arr(s.shadow_zones).filter(z => z.status === 'ouverte').map(z => [z.id, z.type, z.question, z.story, z.ask_to, z.blocking ? 'oui' : 'non'])));
p(table(['ID', 'Risque', 'Probabilité', 'Impact', 'Réponse'], arr(s.risks).map(r => [r.id, r.text, r.likelihood, r.impact, r.response])));

// 8. Definitions
h(2, '8. Definition of Ready et Definition of Done');
p('**Definition of Ready**\n'); p(list(arr(s.definition_of_ready)));
p('**Definition of Done**\n'); p(list(arr(s.definition_of_done)));

// Annexe
h(2, 'Couverture');
p(table(['Métrique', 'Couverts', 'Taux', 'Seuil', 'Statut'], coverage(s, refs).map(c => [c.label, `${c.covered}/${c.total}`, `${c.pct} %`, `${c.threshold} %`, c.met ? 'atteint' : c.waiver ? `dérogation : ${c.waiver.reason}` : `**non atteint** (manquent : ${c.missing.join(', ')})`])));
h(2, 'Annexe — Points de vérification');
const findings = checkPlan(s, refs);
p('_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._\n');
p(findings.length ? table(['Élément', 'Règle', 'Avertissement'], findings.map(f => [f.id, f.rule, f.message])) : '_Aucun avertissement._\n');
writeOut(join(root, 'plan.md'), out.join('\n') + humanReviewFooter('plan'));

// ── stories/US-xxx.md ────────────────────────────────────────────────────────
for (const x of stories) {
  const r = readiness.get(x.id), map = x.example_map ?? {};
  const md = [`# ${x.id} — ${txt(x.title)}`, '', `> Fiche générée à partir de \`state.yaml\` le ${today()}.`, ''];
  md.push(`**Qui** : ${txt(x.who ?? personaName(x.persona))} · **Quoi** : ${txt(x.what)} · **Pourquoi** : ${txt(x.why)}`, '');
  md.push(`**Voie** : ${x.lane === 'rapide' ? `rapide — origine : ${txt(x.origin?.type)} (${txt(x.origin?.ref)})` : 'standard'} · **Tâche de la story map** : ${txt(x.map_task)} · **Release** : ${txt(x.release)} · **Taille** : ${txt(x.size)} · **Temps** : ${txt(x.game)}${x.level ? ` · **Niveau** : ${x.level}` : ''}${x.skeleton ? ' · **Walking skeleton**' : ''}`, '');
  md.push(`**Démonstration en revue** : ${txt(x.demo)}`, '');
  md.push(`**Préparation** : ${r.ready ? 'prête' : `non prête — ${r.reasons.join(' ; ')}`}`, '');
  md.push('## Exigences', '', list(arr(x.frs).map(f => `${f} — ${txt(frIndex.get(f)?.statement)}`)));
  md.push('## Example mapping', '');
  md.push(`Séance : ${map.session?.date ? `${map.session.date}, avec ${arr(map.session.participants).join(', ') || '—'}` : '_pas encore faite_'}`, '');
  for (const rule of arr(map.rules)) {
    md.push(`### Règle : ${ruleText(rule)}`, '');
    const exs = arr(rule.examples).map(id => exById.get(id)).filter(Boolean);
    md.push(exs.length ? gherkin(exs) : '_Aucun exemple : la règle ne pourra pas être testée._', '');
  }
  const ruled = new Set(arr(map.rules).flatMap(r => arr(r.examples)));
  const free = examples.filter(e => e.story === x.id && !ruled.has(e.id));
  if (free.length) md.push(x.lane === 'rapide' ? '### Reproduction et résultat attendu' : '### Autres exemples', '', gherkin(free), '');
  const qs = arr(s.shadow_zones).filter(z => z.story === x.id || arr(map.questions).includes(z.id));
  md.push('## Questions', '', list(qs.map(z => `${z.id} (${z.status}) — ${z.question}${z.ask_to ? ` — à ${z.ask_to}` : ''}`)));
  md.push('## Tâches', '', list(tasks.filter(t => t.story === x.id).map(t => `${t.id} (${t.size}, ${txt(t.assignee_type)}) — ${txt(t.title)}`)));
  writeOut(join(root, 'stories', `${x.id}.md`), md.join('\n'));
}

const packSizes = [];
// ── tasks/TK-xxx.md : fiche de contexte ──────────────────────────────────────
for (const t of tasks) {
  const st = storyById.get(t.story);
  const md = [`# ${t.id} — ${txt(t.title)}`, '', `> Fiche de contexte générée le ${today()} à partir du plan v${txt(s.governance?.version)}, du PRD v${txt(prd.source?.prd_version)} et de la conception v${txt(sad.source?.sad_version)}. Ce qui n'est pas écrit ici n'est pas décidé : en cas de doute, s'arrêter et demander.`, ''];
  md.push(`**Type** : ${t.kind} · **Taille** : ${txt(t.size)} · **Affectation** : ${txt(t.assignee_type)}${t.assignee ? ` (${t.assignee})` : ''} · **Une PR** qui cite \`${t.id}\``, '');
  if (t.kind === 'spike') {
    const hyp = spikeIndex.get(t.spike_of);
    md.push('## Hypothèse à vérifier', '', `${txt(t.spike_of)} — ${txt(hyp?.text)}`, '', `Démarche prévue : ${txt(hyp?.spike)}`, '');
    md.push('Un spike produit une **réponse** (confirmée, infirmée, avec mesures), pas du code de production. La durée est bornée par la taille.', '');
  }
  if (st) {
    md.push('## Story', '', `${st.id} — ${txt(st.title)} (${readyLabel(st.id)})`, '', `Qui : ${txt(st.who)} · Quoi : ${txt(st.what)} · Pourquoi : ${txt(st.why)}`, '');
    if (st.lane === 'rapide') {
      md.push(`**Voie rapide** — origine : ${txt(st.origin?.type)} (${txt(st.origin?.ref)}). Corriger l'écart sans changer aucune règle métier, aucun critère d'acceptation convenu ni aucun contrat : si c'est nécessaire, s'arrêter et demander.`, '');
      const ex = examples.filter(e => e.story === st.id);
      if (ex.length) md.push(gherkin(ex), '');
    }
    md.push('## Exigences et critères d\'acceptation', '');
    for (const f of arr(st.frs)) {
      const fr = frIndex.get(f);
      md.push(`### ${f} — ${prLabel(fr?.priority)}`, '', txt(fr?.statement), '');
      const acs = arr(fr?.acceptance);
      if (acs.length) md.push(gherkin(acs.map(a => ({ id: a.id, title: a.scenario, given: a.given, when: a.when, then: a.then }))), '');
    }
    const rules = arr(st.example_map?.rules);
    if (rules.length) {
      md.push('## Règles et exemples de la story', '');
      for (const rule of rules) {
        md.push(`**${ruleText(rule)}**`, '');
        const exs = arr(rule.examples).map(id => exById.get(id)).filter(Boolean);
        if (exs.length) md.push(gherkin(exs), '');
      }
    }
  }
  if (arr(t.elements).length) md.push('## Éléments touchés', '', table(['ID', 'Élément', 'Type', 'Technologie', 'Cycle de vie', 'Équipe'], arr(t.elements).map(id => { const e = elIndex.get(id) ?? {}; return [id, e.name, e.kind, e.technology, e.lifecycle, e.owner]; })));
  if (arr(t.operations).length) md.push('## Contrats', '', table(['Opération', 'Interface', 'Type', 'Squelette'], arr(t.operations).map(id => { const o = opIndex.get(id); return [`${id} ${txt(o?.name)}`, o?.api?.name, o?.api?.kind, o ? `contracts/${o.api.id}.${o.api.kind === 'asyncapi' ? 'asyncapi' : 'openapi'}.yaml (conception)` : '—']; })));
  const adrs = adrsFor(t);
  if (adrs.length) md.push('## Décisions à respecter', '', table(['ADR', 'Règle', 'Empêche', 'Comment c\'est vérifié'], adrs.map(a => [a.id, a.rule || a.outcome, a.prevents, a.confirmation])));
  if (arr(t.threats).length) md.push('## Mesures de sécurité à réaliser', '', table(['Menace', 'STRIDE', 'Mesures'], arr(t.threats).map(id => { const m = thIndex.get(id); return [id, m?.stride, arr(m?.mitigations).join(' ; ')]; })));
  if (arr(t.verifications).length) md.push('## Vérifications à mettre en place', '', table(['Réponse', 'NFR', 'Méthode', 'Ce qui est vérifié'], arr(t.verifications).map(id => { const v = nrIndex.get(id); return [id, v?.nfr, v?.method, v?.description]; })));
  md.push('## Dépendances', '', list(arr(t.depends_on).map(d => { const dt = tasks.find(x => x.id === d); return `${d} — ${txt(dt?.title)} (${txt(dt?.status)})`; })));
  md.push('## Definition of Done', '', list(arr(s.definition_of_done)));
  const text = md.join('\n');
  const tokens = approxTokens(text);
  packSizes.push({ id: t.id, tokens });
  writeOut(join(root, 'tasks', `${t.id}.md`), text);
}
// Budget des fiches de contexte (S70) : au-delà, l'agent qui implémente perd en précision (dégradation du contexte).
const budget = settings.context_budget ?? { target: 1600, max: 3000 };
const over = packSizes.filter(x => x.tokens > budget.max);
if (over.length) console.warn(`⚠ [S70] fiche(s) de contexte au-delà du budget (${budget.max} tokens environ) : ${over.map(x => `${x.id} ≈ ${x.tokens}`).join(', ')}. Découper la tâche, ou alléger la story.`);

console.log(`Fiches de contexte : ${packSizes.map(x => `${x.id} ≈ ${x.tokens}`).join(', ') || 'aucune'} tokens (cible ${budget.target}, maximum ${budget.max}).`);
console.log(`Plan généré : ${join(root, 'plan.md')} (${stories.length} story(s) dont ${nReady} prête(s), ${tasks.length} tâche(s), ${findings.length} avertissement(s))`);
