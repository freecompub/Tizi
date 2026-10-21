#!/usr/bin/env node
// Sprint review d'une itération, en une séquence : mesures, fiches, preuves, puis un document en deux parties —
// la sprint review (le produit et l'adaptation du backlog) et la rétrospective (la façon de travailler). Rien n'est décidé ici : les décisions s'enregistrent dans
// iterations[].review quand l'équipe les déclare, et la vérification de forme signale celles qui manquent (S76, S77).
// Usage : node close-sprint.mjs <plan/<slug>/state.yaml> --iteration IT-n [--impl impl/<slug>/state.yaml]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, loadState, writeOut, fail, today, humanReviewFooter } from './lib/common.mjs';
import { riskSize, plannedAttention, SIZE_ORDER } from './lib/rules.mjs';
import { loadBlocks, hoursBetween, CAUSES } from './block.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--iteration', '--impl'].includes(args[args.indexOf(a) - 1]));
const itId = opt('--iteration');
if (!statePath || !itId) fail('Usage : node close-sprint.mjs <plan/<slug>/state.yaml> --iteration IT-n [--impl …]', 2);
const plan = loadState(statePath);
const slug = dirname(statePath).split('/').pop();
const it = arr(plan.iterations).find(i => i.id === itId);
if (!it) fail(`Itération ${itId} introuvable.`);
const refs = existsSync(join(dirname(statePath), 'refs.yaml')) ? loadState(join(dirname(statePath), 'refs.yaml')) : {};
const implPath = opt('--impl') || `impl/${slug}/state.yaml`;
const run = (script, extra) => spawnSync(process.execPath, [join(HERE, script), statePath, ...extra], { encoding: 'utf8' });

// 0. Report des fusions dans le plan : une tâche dont la fusion est enregistrée dans l'implémentation est terminée.
// C'est un fait, pas une décision ; il est signalé dans le document.
const synced = [];
if (existsSync(implPath)) {
  const implState = loadState(implPath);
  for (const t of arr(plan.tasks)) if (!['terminé', 'abandonné'].includes(t.status) && arr(implState.tasks).find(x => x.id === t.id)?.status === 'fusionnee') { t.status = 'terminé'; synced.push(t.id); }
  if (synced.length) writeOut(statePath, `# État du plan — tâches fusionnées reportées par close-sprint.mjs le ${today()}\n${yaml.dump(plan, { lineWidth: 120 })}`);
}

// 1. Les trois préparations existantes.
const prepared = [];
const m = existsSync(implPath) ? run('measure.mjs', ['--impl', implPath]) : null;
prepared.push(m && m.status === 0 ? 'mesures' : 'mesures (pas d\'état d\'implémentation)');
if (run('sprint-review.mjs', ['--iteration', itId]).status === 0) prepared.push('fiches de revue');
if (run('retro-evidence.mjs', ['--iteration', itId, ...(existsSync(implPath) ? ['--impl', implPath] : [])]).status === 0) prepared.push('preuves');
const mesuresFile = join(dirname(statePath), 'mesures', 'mesures.yaml');
const measured = existsSync(mesuresFile) ? (yaml.load(readFileSync(mesuresFile, 'utf8'))?.tasks ?? []) : [];

// 2. Chiffres d'une itération, à partir des mesures.
const median = xs => { const v = xs.filter(x => x != null).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
const blocks = loadBlocks('.', slug);
const now = new Date().toISOString();
function stats(iter) {
  if (!iter) return null;
  const ids = arr(plan.tasks).filter(t => t.iteration === iter.id && t.status !== 'abandonné').map(t => t.id);
  const ms = measured.filter(x => ids.includes(x.id));
  const start = iter.start ? new Date(iter.start).toISOString() : null, end = iter.end ? new Date(`${String(iter.end).slice(0, 10)}T23:59:59Z`).toISOString() : now;
  const inWin = b => start ? Math.max(0, hoursBetween(b.started > start ? b.started : start, (b.ended || now) < end ? (b.ended || now) : end)) * ((b.ended || now) > start && b.started < end ? 1 : 0) : 0;
  const byCause = {};
  for (const b of blocks) { const h = inWin(b); if (h > 0) { byCause[b.cause] = byCause[b.cause] ?? { n: 0, h: 0 }; byCause[b.cause].n += 1; byCause[b.cause].h += h; } }
  return {
    planned: ids.length, merged: ms.filter(x => !x.open).length,
    waitReview: median(ms.map(x => x.waitReview)), rework: ms.length ? ms.reduce((n, x) => n + x.redRuns + x.gateKo + x.corrections + x.revalid, 0) / ms.length : null,
    attentionPlanned: arr(plan.tasks).filter(t => ids.includes(t.id)).reduce((n, t) => n + plannedAttention(t, plan.settings, riskSize(t, plan, refs)), 0),
    attentionUsed: ms.reduce((n, x) => n + (x.attention ?? 0), 0), byCause,
  };
}
const idx = arr(plan.iterations).indexOf(it);
const prev = idx > 0 ? arr(plan.iterations)[idx - 1] : null;
const cur = stats(it), before = stats(prev);
const f = (x, unit = '') => (x == null ? '—' : `${Math.round(x * 10) / 10}${unit}`);

// 3. Capacité suggérée, en débit et en attention, sur les dernières itérations revues et celle-ci.
const recent = [...arr(plan.iterations).slice(0, idx).filter(i => i.review?.team?.date).slice(-2), it].map(stats);
const cap = { throughput: Math.round(recent.reduce((n, x) => n + x.merged, 0) / recent.length * 10) / 10, attention: Math.round(recent.reduce((n, x) => n + x.attentionUsed, 0) / recent.length) };

// 4. Révision du backlog restant.
const unfinished = arr(plan.tasks).filter(t => t.iteration === itId && !['terminé', 'abandonné'].includes(t.status) && !measured.find(x => x.id === t.id && !x.open));
const remaining = arr(plan.tasks).filter(t => !['terminé', 'abandonné'].includes(t.status) && t.iteration !== itId);
const resize = remaining.map(t => ({ t, r: riskSize(t, plan, refs) })).filter(({ t, r }) => t.size && t.size !== r.size);
const calibration = existsSync(mesuresFile) ? yaml.load(readFileSync(mesuresFile, 'utf8'))?.calibration ?? {} : {};
const recurring = Object.entries(cur.byCause).filter(([, x]) => x.n >= 2 || x.h >= 24);
const tries = arr(prev?.review?.team?.process?.try);

// Lien vers la vue réalisé / prouvé de la vérification de release, si elle existe.
const matrixFile = [`qa/${slug}/matrix.yaml`].find(p => existsSync(p));
const matrix = matrixFile ? yaml.load(readFileSync(matrixFile, 'utf8')) : null;
const fr = arr(matrix?.functional);

const md = [`# Sprint review — ${itId}${it.goal ? ` — ${it.goal}` : ''}`, '', `Préparée le ${today()} : ${prepared.join(', ')}. Deux moments distincts : la **sprint review** regarde le produit et adapte le backlog, avec les parties prenantes ; la **rétrospective** regarde la façon de travailler, entre membres de l'équipe. Les fiches détaillées sont à côté : \`parties-prenantes.md\`, \`equipe.md\`, \`preuves.md\`.`, ''];

if (synced.length) md.push(`_Reporté dans le plan comme terminé, d'après les fusions enregistrées : ${synced.join(', ')}._`, '');
md.push('# Partie 1 — Sprint review (le produit, avec les parties prenantes)', '');
md.push('## Ce qui a été réalisé', '', `${cur.merged} tâche(s) fusionnée(s) sur ${cur.planned} planifiée(s). Chaque story se démontre comme convenu en atelier (champ « démonstration »).`, '');
if (fr.length) md.push('Réalisé et prouvé, d\'après la dernière vérification de release :', '', table(['FR', 'Réalisation', 'Preuve'], fr.map(x => [x.id, x.realization, x.proof])), '');
md.push('## Adapter le backlog — décisions à prendre', '');
md.push('**Tâches du sprint non finies** : pour chacune, continuer, découper ou reporter (à enregistrer dans `review.carryover`).', '', unfinished.length ? table(['Tâche', 'Taille', 'Statut', 'Décision'], unfinished.map(t => [`${t.id} — ${txt(t.title)}`, t.size, t.status, ''])) : '_Aucune._', '');
md.push('**Tailles à revoir** : la taille retenue diffère du risque calculé.', '', resize.length ? table(['Tâche', 'Taille retenue', 'Risque calculé', 'Facteurs'], resize.map(({ t, r }) => [`${t.id} — ${txt(t.title)}`, t.size, r.size, r.factors.map(([n, v]) => `${n} ${v}`).join(', ') || '—'])) : '_Aucune._', '');
md.push('## Prévoir la suite', '', `D'après ${recent.length} itération(s) : **${cap.throughput} tâche(s) fusionnée(s)** par itération, pour **${cap.attention} min** d'attention humaine consommée. Quand les agents codent, c'est l'attention et la relecture qui limitent le débit : planifier au plus ce débit, et fixer \`settings.attention_capacity\` d'après ce que l'équipe peut réellement donner. Pour une date de fin, \`forecast.mjs\` donne la probabilité à 85 %. L'équipe décide ; ce ne sont que des propositions.`, '');
if (Object.keys(calibration).length && !Object.keys(plan.settings?.attention_by_size ?? {}).length) md.push(`**Calibration disponible** : reprendre \`attention_by_size: ${JSON.stringify(calibration).replace(/"/g, '')}\` dans les réglages du plan.`, '');

md.push('# Partie 2 — Rétrospective (la façon de travailler, entre membres de l\'équipe)', '');
md.push('## Ce que le sprint a coûté', '', table(['', itId, prev ? prev.id : 'précédente'], [
  ['Tâches planifiées / fusionnées', `${cur.planned} / ${cur.merged}`, before ? `${before.planned} / ${before.merged}` : '—'],
  ['Attente de relecture médiane', f(cur.waitReview, ' h'), f(before?.waitReview, ' h')],
  ['Allers-retours moyens par tâche', f(cur.rework), f(before?.rework)],
  ['Attention humaine prévue / consommée', `${cur.attentionPlanned} / ${cur.attentionUsed} min`, before ? `${before.attentionPlanned} / ${before.attentionUsed} min` : '—'],
  ['Temps bloqué pendant le sprint', f(Object.values(cur.byCause).reduce((n, x) => n + x.h, 0), ' h'), before ? f(Object.values(before.byCause).reduce((n, x) => n + x.h, 0), ' h') : '—'],
]), '');
if (Object.keys(cur.byCause).length) md.push(table(['Cause de blocage', 'Blocages', 'Heures pendant le sprint'], Object.entries(cur.byCause).sort((a, b) => b[1].h - a[1].h).map(([c, x]) => [CAUSES[c] ?? c, x.n, f(x.h, ' h')])), '');
md.push('## Causes de blocage récurrentes', '', 'Chacune appelle une action et un responsable (à enregistrer dans `review.blockage_actions`), pas seulement un constat.', '', recurring.length ? table(['Cause', 'Blocages', 'Heures', 'Action', 'Responsable'], recurring.map(([c, x]) => [CAUSES[c] ?? c, x.n, f(x.h, ' h'), '', ''])) : '_Aucune._', '');
md.push('## Suivi des actions de la rétrospective précédente', '', tries.length ? `Pour chacune : faite ou non, et son effet dans les chiffres ci-dessus (à enregistrer dans \`review.actions_followup\`).\n\n${table(['Action essayée', 'Faite ?', 'Effet observé'], tries.map(a => [a, '', '']))}` : '_Aucune action n\'avait été décidée._', '');
md.push('## Ce qu\'on essaie au prochain sprint', '', 'Une ou deux actions au plus, chacune rattachée à un fait ci-dessus, avec un responsable (`review.team.process.try`). Elles seront suivies à la prochaine sprint review.', '');
md.push('---', '', 'Les décisions s\'enregistrent quand l\'équipe les déclare ; `lint.mjs` signale une tâche non finie sans décision (S76) et des actions précédentes sans suivi (S77).', '');
const out = join(dirname(statePath), 'review', itId, 'sprint-review.md');
writeOut(out, md.join('\n') + humanReviewFooter('document de sprint review'));
console.log(`Sprint review de ${itId} préparée : ${out} — ${unfinished.length} tâche(s) non finie(s), ${resize.length} taille(s) à revoir, ${recurring.length} cause(s) de blocage récurrente(s), ${tries.length} action(s) à suivre.`);
