#!/usr/bin/env node
// Où en est chaque initiative dans la chaîne du SDLC, et quelle est l'étape suivante ?
// Calculé à partir des états et des fichiers présents, sans interprétation : c'est la base du point d’entrée « tizi ».
// Usage : node next-step.mjs [racine du dépôt] [--initiative <slug>] [--json]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arr, loadState, table } from './lib/common.mjs';
import { sessionsFor } from './lib/sessions.mjs';

const args = process.argv.slice(2);
const root = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--initiative') ?? '.';
const only = args.includes('--initiative') ? args[args.indexOf('--initiative') + 1] : '';
const STEPS = [
  { doc: 'brd', entry: 'tizi-brd', label: '1. BRD' }, { doc: 'prd', entry: 'tizi-prd', label: '2. PRD' },
  { doc: 'sad', entry: 'tizi-sad', label: '3. Conception' }, { doc: 'plan', entry: 'tizi-plan', label: '4. Planification' },
  { doc: 'impl', entry: 'tizi-impl', label: '5. Implémentation' }, { doc: 'qa', entry: 'tizi-test', label: '6. Tests' },
];
const slugs = new Set();
for (const s of STEPS) if (existsSync(join(root, s.doc))) for (const d of readdirSync(join(root, s.doc))) if (existsSync(join(root, s.doc, d, 'state.yaml'))) slugs.add(d);
const load = (doc, slug) => { const p = join(root, doc, slug, 'state.yaml'); return existsSync(p) ? loadState(p) : null; };
const baseline = s => ['baseline', 'validé', 'approuvé'].includes(s?.governance?.status) || !!s?.governance?.version && s.governance.status !== 'brouillon';
const hasHandoff = (doc, slug) => existsSync(join(root, doc, slug, 'handoff')) && readdirSync(join(root, doc, slug, 'handoff')).length > 0;

function assess(slug) {
  const st = Object.fromEntries(STEPS.map(s => [s.doc, load(s.doc, slug)]));
  const reasons = [];
  const go = (entry, why) => ({ entry, why });
  let next;
  // On part de l'étape la plus avancée présente : une étape absente en amont n'a simplement pas été utilisée
  // (PRD autonome, conception seule en brownfield, plan repris d'ailleurs).
  const last = [...STEPS].reverse().find(s => st[s.doc])?.doc;
  const after = { brd: ['tizi-prd', 'BRD figé : démarrer le PRD'], prd: ['tizi-sad', 'PRD figé : démarrer la conception'], sad: ['tizi-plan', 'conception figée : démarrer la planification'] };
  if (st.brd?.phase === 'close') next = go(null, 'opportunité jetée : initiative close');
  else if (!last) next = go('tizi-brd', 'aucun document : commencer par l\'évaluation de l\'opportunité (ou un PRD autonome)');
  else if (['brd', 'prd', 'sad'].includes(last)) {
    const step = STEPS.find(x => x.doc === last);
    if (!baseline(st[last])) next = go(step.entry, `${step.label} en cours (phase ${st[last].phase ?? '?'})`);
    else if (!hasHandoff(last, slug)) next = go(step.entry, `${step.label} : version figée sans handoff, produire le handoff`);
    else next = go(...after[last]);
  } else {
    const plan = st.plan;
    const opsDir = t => join(root, 'plan', slug, 'exports', t);
    const approvedDigests = new Set(arr(plan?.governance?.backlog_approvals).map(a => a.digest ?? a.sha256));
    const pending = ['github', 'jira'].filter(t => existsSync(join(opsDir(t), 'operations.yaml.sha256')) && !existsSync(join(opsDir(t), 'journal.yaml'))
      && approvedDigests.has(readFileSync(join(opsDir(t), 'operations.yaml.sha256'), 'utf8').trim().split(/\s+/)[0]));
    if (plan && !baseline(plan)) next = go('tizi-plan', `planification en cours (phase ${plan.phase ?? '?'})`);
    else if (plan && !hasHandoff('plan', slug)) next = go('tizi-plan', 'plan figé sans handoff : produire le handoff vers l\'implémentation');
    else if (pending.length) next = go('tizi-backlog', `plan d'opérations approuvé (empreinte exacte) pour ${pending.join(', ')} : l'appliquer`);
    else if (!st.impl) next = go('tizi-impl', 'plan figé, handoff prêt : implémenter la première tâche prête');
    else {
      const tasks = arr(st.impl.tasks);
      const open = tasks.filter(t => t.status !== 'fusionnee');
      const blocked = tasks.filter(t => t.status === 'bloquee');
      if (blocked.length) reasons.push(`${blocked.length} tâche(s) bloquée(s) : ${blocked.map(t => t.id).join(', ')} — question pour le plan`);
      const it = arr(plan?.iterations).find(i => i.status === 'terminé' && !i.review?.team?.date);
      if (it) next = go('tizi-plan', `${it.id} terminée sans revue : faire la revue de fin d'itération`);
      else if (st.qa && arr(st.qa.approvals).some(a => a.decision === 'approuvé')) next = go('tizi-plan', 'release approuvée : mesurer les outcomes et préparer la suite');
      else if (st.qa) next = go('tizi-test', 'vérification de la release en cours');
      else if (open.length || !tasks.length) next = go('tizi-impl', open.length ? `${open.length} tâche(s) en cours ou à faire` : 'aucune tâche prise : prendre la première tâche prête');
      else next = go('tizi-test', 'tâches fusionnées : vérifier la release');
    }
  }
  const zo = Object.values(st).filter(Boolean).flatMap(s => arr(s.shadow_zones)).filter(z => z.status === 'ouverte' && z.blocking);
  if (zo.length) reasons.push(`${zo.length} zone(s) d'ombre bloquante(s)`);
  const sess = STEPS.flatMap(s => sessionsFor(`${s.doc}/${slug}`, root)).sort((a, b) => String(a.ended).localeCompare(String(b.ended))).at(-1);
  if (sess && !sess.condensed) reasons.push('dernière session sans condensé : le rédiger avant de reprendre');
  return { slug, progress: STEPS.map(s => (st[s.doc] ? (baseline(st[s.doc]) && s.doc !== 'impl' && s.doc !== 'qa' ? '✓' : '…') : (STEPS.findIndex(x => x.doc === s.doc) < STEPS.findIndex(x => x.doc === ([...STEPS].reverse().find(y => st[y.doc])?.doc)) ? '–' : '·'))).join(' '), next, notes: reasons };
}

const list = [...slugs].filter(s => !only || s === only).sort().map(assess);
if (args.includes('--json')) { console.log(JSON.stringify(list, null, 2)); process.exit(0); }
if (!list.length) { console.log('Aucune initiative dans ce dépôt. Pour commencer : tizi-brd (évaluer une opportunité), ou tizi-prd pour un PRD autonome.'); process.exit(0); }
console.log('Avancement (BRD · PRD · conception · plan · implémentation · tests) : ✓ figé, … en cours, – non utilisé, · à venir\n');
console.log(table(['Initiative', 'Avancement', 'Étape suivante', 'Pourquoi', 'À noter'], list.map(x => [x.slug, x.progress, x.next.entry ?? '—', x.next.why, x.notes.join(' ; ') || '—'])));
