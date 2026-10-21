#!/usr/bin/env node
// Prépare la revue de fin d'itération : une fiche pour la revue d'équipe et une pour la revue avec les parties prenantes.
// Les chiffres (vélocité, reste, part des agents, relecture humaine, progression de la release) sont calculés ;
// les notes de qualité et les décisions restent à l'équipe.
// Usage : node sprint-review.mjs <plan/<slug>/state.yaml> --iteration IT-n
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { arr, txt, table, list, loadState, writeOut, fail, today } from './lib/common.mjs';
import { iterationStats, capacitySuggestion, storyReadiness } from './lib/rules.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--iteration');
const itId = args.includes('--iteration') ? args[args.indexOf('--iteration') + 1] : '';
if (!statePath || !itId) fail('Usage : node sprint-review.mjs <state.yaml> --iteration IT-n', 2);
const s = loadState(statePath);
const root = dirname(statePath);
const refs = existsSync(join(root, 'refs.yaml')) ? loadState(join(root, 'refs.yaml')) : {};
const it = arr(s.iterations).find(i => i.id === itId);
if (!it) fail(`Itération ${itId} introuvable.`);
const st = iterationStats(s, itId);
const tasks = arr(s.tasks).filter(t => t.iteration === itId && t.status !== 'abandonné');
const stories = arr(s.stories).filter(x => x.status !== 'abandonné');
const storyOf = id => stories.find(x => x.id === id);
const release = s.settings?.release;

// ── Revue d'équipe ──
const t = [`# Revue d'équipe — ${itId} (${txt(it.goal)})`, '', `Préparée le ${today()}. À tenir entre ceux qui ont construit, avant la revue avec les parties prenantes.`, ''];
t.push('## Le produit', '', 'Essayer tout ce qui a été construit, puis noter de 1 à 5. Chaque constat devient une story (souvent en voie rapide).', '');
t.push(table(['Qualité', 'Note (1 à 5)', 'Pourquoi'], [['Expérience : simple, agréable, cohérente', '', ''], ['Fonctionnelle : fait ce qui était convenu, sans défaut', '', ''], ['Code : facile à maintenir, ou dette ajoutée ?', '', '']]));
t.push('## Le plan', '', 'Décider ensemble ce qui est réellement fini au sens de la Definition of Done. Les chiffres ci-dessous partent des statuts actuels.', '');
t.push(table(['Tâche', 'Story', 'Taille', 'Affectation', 'Statut'], tasks.map(x => [`${x.id} — ${txt(x.title)}`, x.story, x.size, x.assignee_type, x.status])));
t.push(table(['Prévu', 'Vélocité (fini)', 'Reste', 'Dont agents', 'Relecture humaine des tâches d\'agents', 'Capacité annoncée'], [[st.planned, st.velocity, st.overhang, st.agentVelocity, st.reviewLoad, it.capacity || s.settings?.sprint?.capacity || '—']]));
t.push('**Definition of Done**', '', list(arr(s.definition_of_done)));
t.push('## Le travail de découverte', '', 'Hypothèses testées ce cycle, résultats, ce qu\'on a appris.', '');
t.push('## La façon de travailler', '', `Changements essayés au cycle précédent : ${arr(arr(s.iterations)[arr(s.iterations).indexOf(it) - 1]?.review?.team?.process?.try).join(' ; ') || '—'}. Les garder ou les abandonner ? Choisir un ou deux changements à essayer, pas plus.`, '');
const sugg = capacitySuggestion(s);
if (sugg) t.push(`Capacité suggérée d'après ${sugg.basedOn.join(', ')} : ${sugg.velocity}, dont charge humaine ${sugg.humanLoad}.`, '');

// ── Revue avec les parties prenantes ──
const r = [`# Revue avec les parties prenantes — ${itId}`, '', `Préparée le ${today()}. Objectif de l'itération : ${txt(it.goal)}.`, ''];
r.push('## Ce qui a été construit', '', table(['Story', 'Démonstration prévue', 'Tâches finies'], [...new Set(tasks.map(x => x.story).filter(Boolean))].map(id => {
  const x = storyOf(id); const ts = tasks.filter(y => y.story === id);
  return [`${id} — ${txt(x?.title)}`, txt(x?.demo), `${ts.filter(y => y.status === 'terminé').length}/${ts.length}`];
})));
const actOf = mt => arr(refs.prd?.story_map).find(a => arr(a.tasks).some(t2 => t2.id === mt));
const relStories = stories.filter(x => x.lane !== 'rapide' && (!release || x.release === release));
const byAct = new Map();
for (const x of relStories) { const a = actOf(x.map_task); const k = a ? `${a.id} ${a.name}` : '—'; byAct.set(k, [...(byAct.get(k) ?? []), x]); }
r.push(`## Progression vers ${txt(release)}`, '', 'La progression se lit vers la solution viable, pas tâche par tâche. Une stratégie ouverture–milieu–fin montre d\'abord une esquisse complète, pas un coin fini.', '');
r.push(table(['Activité', 'Stories finies', 'Prêtes', 'En préparation'], [...byAct].map(([k, xs]) => [k, `${xs.filter(x => x.status === 'terminé').length}/${xs.length}`, xs.filter(x => x.status !== 'terminé' && storyReadiness(s, x, refs).ready).length, xs.filter(x => x.status !== 'terminé' && !storyReadiness(s, x, refs).ready).length])));
r.push('## Découverte', '', 'Hypothèses testées, résultats, retours d\'utilisateurs.', '');
r.push('## Retours', '', '| Qui | Retour | Suite (story, opportunité, rien) |', '|---|---|---|', '| | | |', '| | | |', '');
const out = join(root, 'review', itId);
writeOut(join(out, 'equipe.md'), t.join('\n'));
writeOut(join(out, 'parties-prenantes.md'), r.join('\n'));
console.log(`Revue préparée : ${out} — vélocité ${st.velocity}, reste ${st.overhang}, dont agents ${st.agentVelocity}, relecture ${st.reviewLoad}.`);
