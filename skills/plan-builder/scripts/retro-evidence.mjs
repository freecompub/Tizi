#!/usr/bin/env node
// Rassemble les preuves laissées par une itération ou une release, pour une rétrospective qui part des faits.
// Chaque fait cite sa source (fichier, journal, commit). Rien n'est interprété ici : les causes se discutent en équipe,
// à partir de ces faits, et une cause qu'on ne peut rattacher à aucun d'eux n'est pas un constat.
// Idée reprise de la rétrospective de BMAD-METHOD.
//
// Usage : node retro-evidence.mjs <plan/<slug>/state.yaml> (--iteration IT-n | --release REL-x)
//                                 [--impl impl/<slug>/state.yaml] [--qa qa/<slug>/state.yaml] [--repo <dossier git>]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { arr, txt, table, loadState, writeOut, fail, today, humanReviewFooter } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--iteration', '--release', '--impl', '--qa', '--repo'].includes(args[args.indexOf(a) - 1]));
const itId = opt('--iteration'), relId = opt('--release');
if (!statePath || (!itId && !relId)) fail('Usage : node retro-evidence.mjs <state.yaml> (--iteration IT-n | --release REL-x) [--impl …] [--qa …] [--repo …]', 2);
const plan = loadState(statePath);
const slug = dirname(statePath).split('/').pop();
const implPath = opt('--impl') || [`impl/${slug}/state.yaml`, join(dirname(dirname(dirname(statePath))), 'impl', slug, 'state.yaml')].find(existsSync) || '';
const qaPath = opt('--qa') || [`qa/${slug}/state.yaml`].find(existsSync) || '';
const repo = resolve(opt('--repo') || (implPath ? dirname(dirname(dirname(implPath))) : '.'));
const impl = implPath ? loadState(implPath) : null;
const qa = qaPath ? loadState(qaPath) : null;

const storiesIn = new Set(arr(plan.stories).filter(s => !relId || s.release === relId).map(s => s.id));
const tasks = arr(plan.tasks).filter(t => t.status !== 'abandonné' && (itId ? t.iteration === itId : storiesIn.has(t.story) || (!t.story && !t.iteration)));
const runsFile = join(repo, '.impl', 'runs.jsonl');
const runs = existsSync(runsFile) ? readFileSync(runsFile, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
const git = (...a) => { const r = spawnSync('git', a, { cwd: repo, encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
const isRepo = !!git('rev-parse', '--is-inside-work-tree');
const scope = itId ? `itération ${itId}` : `release ${relId}`;
const src = p => `\`${p}\``;

const rows = tasks.map(t => {
  const it = arr(impl?.tasks).find(x => x.id === t.id);
  const tr = runs.filter(r => r.task === t.id);
  const red = tr.filter(r => ['unit', 'acceptance', 'contract'].includes(r.suite) && r.failed).length;
  const green = tr.filter(r => ['unit', 'acceptance', 'contract'].includes(r.suite) && !r.failed).length;
  const mut = tr.filter(r => r.suite === 'mutation').pop();
  const reviewRes = it?.review?.report ? join(dirname(it.review.report), 'review-result.json') : '';
  const rv = reviewRes && existsSync(reviewRes) ? JSON.parse(readFileSync(reviewRes, 'utf8')) : null;
  const commits = isRepo ? git('log', '--all', '--oneline', `--grep=${t.id}`).split('\n').filter(Boolean) : [];
  return {
    id: t.id, title: t.title, size: t.size, assignee: t.assignee_type, plan: t.status, impl: it?.status ?? '—',
    questions: arr(it?.understanding?.questions).length, blocked: it?.status === 'bloquee' ? (it.blocked_reason || 'sans raison notée') : '',
    revalidated: !!(it?.understanding?.approved_digest), red, green, refactors: tr.filter(r => r.suite === 'refactor').length,
    mutation: mut?.score ?? null, gate: it?.gate?.result ?? '—', review: rv?.verdict ?? (it?.review?.verdict ?? '—'),
    refuted: rv?.counts?.refuted ?? 0, rejected: rv?.counts?.rejected ?? 0, commits: commits.length,
  };
});
const sum = k => rows.reduce((n, r) => n + (Number(r[k]) || 0), 0);
const md = [`# Preuves pour la rétrospective — ${txt(plan.initiative?.name)}, ${scope}`, '', `Rassemblées le ${today()}. Ce sont des faits, chacun avec sa source ; les causes se discutent en équipe à partir d'eux. Une cause qu'on ne peut rattacher à aucun fait n'est pas un constat.`, ''];
md.push('## Sources lues', '', `- Plan : ${src(statePath)}`, `- Implémentation : ${implPath ? src(implPath) : '_absente_'}`, `- Journal des exécutions de tests : ${runs.length ? src(runsFile) : '_absent_'}`, `- Vérification de release : ${qaPath ? src(qaPath) : '_absente_'}`, `- Historique git : ${isRepo ? src(repo) : '_pas de dépôt git_'}`, '');
md.push('## Tâches', '', table(['Tâche', 'Taille', 'Affectée à', 'Statut plan', 'Statut impl.', 'Questions en cours d\'impl.', 'Rouge / vert', 'Mutation', 'Porte de PR', 'Revue', 'Constats réfutés', 'Commits'],
  rows.map(r => [`${r.id} — ${txt(r.title)}`, r.size, r.assignee, r.plan, r.impl, r.questions, `${r.red} / ${r.green}`, r.mutation == null ? '—' : `${r.mutation} %`, r.gate, r.review, r.refuted, r.commits])));
md.push('## Faits saillants', '');
const facts = [];
const done = rows.filter(r => r.impl === 'fusionnee' || r.plan === 'terminé');
facts.push(`${done.length} tâche(s) sur ${rows.length} terminée(s) ou fusionnée(s) (${src(statePath)}${implPath ? `, ${src(implPath)}` : ''}).`);
const q = rows.filter(r => r.questions > 0);
if (q.length) facts.push(`${sum('questions')} question(s) sont apparues **pendant l'implémentation**, sur ${q.map(r => r.id).join(', ')} : autant de points que l'example mapping n'avait pas tranchés (${src(implPath)}).`);
const b = rows.filter(r => r.blocked);
if (b.length) facts.push(`Tâche(s) bloquée(s) : ${b.map(r => `${r.id} (${r.blocked})`).join(' ; ')} (${src(implPath)}).`);
const noRed = rows.filter(r => r.green && !r.red);
if (noRed.length) facts.push(`Aucun test vu en échec avant le vert pour ${noRed.map(r => r.id).join(', ')} : le TDD n'est pas tracé (${src(runsFile)}).`);
const lowMut = rows.filter(r => r.mutation != null && r.mutation < 70);
if (lowMut.length) facts.push(`Score de mutation sous 70 % : ${lowMut.map(r => `${r.id} ${r.mutation} %`).join(', ')} (${src(runsFile)}).`);
if (sum('refuted')) facts.push(`${sum('refuted')} constat(s) de revue réfuté(s) par la vérification adversariale : du bruit évité, mais à surveiller s'il grandit (rapports de revue).`);
const ga = qa ? arr(qa.approvals).find(a => a.decision === 'approuvé') : null;
if (qa) facts.push(`Vérification de release : ${ga ? `approuvée par ${ga.who} le ${txt(ga.date)}` : 'non approuvée'} ; ${arr(qa.exploratory).flatMap(x => arr(x.findings)).length} constat(s) exploratoire(s), ${arr(qa.waivers).length} dérogation(s) (${src(qaPath)}).`);
if (itId) { const it = arr(plan.iterations).find(i => i.id === itId); if (it?.review?.team?.grades) facts.push(`Notes de l'équipe : expérience ${it.review.team.grades.experience ?? '—'}, fonctionnelle ${it.review.team.grades.fonctionnelle ?? '—'}, code ${it.review.team.grades.code ?? '—'} (${src(statePath)}).`); }
md.push(...facts.map(f => `- ${f}`), '');
md.push('## Pour la discussion', '', 'Pour chaque fait saillant : qu\'est-ce qui l\'explique, d\'après les sources ? Qu\'essaie-t-on de différent au prochain cycle ? Une action par fait au plus, avec un responsable. Les actions décidées vont dans la revue de l\'itération (`process.try`).', '');
const out = join(dirname(statePath), 'review', itId || relId, 'preuves.md');
writeOut(out, md.join('\n') + humanReviewFooter('relevé de preuves'));
console.log(`Preuves rassemblées : ${out} — ${rows.length} tâche(s), ${facts.length} fait(s) saillant(s).`);
