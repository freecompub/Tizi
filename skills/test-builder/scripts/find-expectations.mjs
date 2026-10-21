#!/usr/bin/env node
// Aide au tri d'un signalement : « existe-t-il une attente écrite pour cette situation ? »
// Cherche, dans toute la spécification de l'initiative, les attentes les plus proches de l'observation du testeur :
// critères (AC), exigences fonctionnelles (FR), exemples (EX), règles métier (RG), comportements à préserver (PB),
// étapes de parcours (PJ). Pour chacune : son texte exact, son épopée (activité de la story map) et l'état de sa preuve.
// C'est une aide, pas un verdict : une attente formulée autrement peut échapper à la recherche par mots ; on peut
// alors parcourir par activité (--activite), parcours (--parcours) ou story (--story).
// Usage : node find-expectations.mjs <initiative> "<observation>" [--activite ACT-xx] [--parcours PJ-xx] [--story US-xxx] [--max 8] [--json]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { arr, loadState, fail, table } from './lib/common.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const pos = args.filter((a, i) => !a.startsWith('--') && !['--activite', '--parcours', '--story', '--max'].includes(args[i - 1]));
const [slug, query = ''] = pos;
if (!slug) fail('Usage : node find-expectations.mjs <initiative> "<observation>" [--activite …] [--parcours …] [--story …]', 2);
const planDir = join('plan', slug);
if (!existsSync(join(planDir, 'state.yaml'))) fail(`Plan introuvable : ${planDir}/state.yaml.`);
const plan = loadState(join(planDir, 'state.yaml'));
const refs = existsSync(join(planDir, 'refs.yaml')) ? loadState(join(planDir, 'refs.yaml')) : {};
const prd = refs.prd ?? {};
const matrix = existsSync(join('qa', slug, 'matrix.yaml')) ? loadState(join('qa', slug, 'matrix.yaml')) : null;

// Rattachements : FR et exemples → stories → tâche de story map → activité (l'épopée).
const actOfTask = mt => arr(prd.story_map).find(a => arr(a.tasks).some(t => t.id === mt));
const storiesOfFr = id => arr(plan.stories).filter(s => arr(s.frs).includes(id));
const actOfStory = s => actOfTask(s?.map_task) ?? arr(prd.story_map).find(a => a.id === s?.attach_to);
const frs = arr(prd.releases).flatMap(r => arr(r.functional_requirements));
const items = [];
for (const f of frs) {
  const sts = storiesOfFr(f.id); const act = actOfStory(sts[0]);
  items.push({ id: f.id, type: 'exigence', text: f.statement, stories: sts.map(s => s.id), activity: act?.id, rules: arr(f.business_rules) });
  for (const a of arr(f.acceptance)) items.push({ id: a.id, type: 'critère', text: [a.scenario, a.given && `étant donné ${a.given}`, a.when && `quand ${a.when}`, a.then && `alors ${a.then}`].filter(Boolean).join(', '), fr: f.id, stories: sts.map(s => s.id), activity: act?.id });
}
for (const e of arr(plan.examples).filter(e => e.status !== 'abandonné')) {
  const s = arr(plan.stories).find(x => x.id === e.story);
  items.push({ id: e.id, type: 'exemple', text: [e.title, e.given && `étant donné ${e.given}`, e.when && `quand ${e.when}`, e.then && `alors ${e.then}`].filter(Boolean).join(', '), stories: [e.story], activity: actOfStory(s)?.id });
}
for (const r of arr(prd.business_rules)) items.push({ id: r.id, type: 'règle', text: r.statement, stories: [], activity: frs.find(f => arr(f.business_rules).includes(r.id)) ? actOfStory(storiesOfFr(frs.find(f => arr(f.business_rules).includes(r.id)).id)[0])?.id : undefined });
for (const b of arr(prd.preserved_behaviors)) items.push({ id: b.id, type: 'à préserver', text: b.behavior, stories: arr(plan.tasks).filter(t => arr(t.preserves).includes(b.id)).map(t => t.story), activity: undefined });
for (const j of arr(prd.journeys)) items.push({ id: j.id, type: 'parcours', text: `${j.goal} : ${arr(j.steps).join(' → ')}`, stories: [], activity: undefined });

// Pertinence : mots significatifs partagés (sans accents ni mots-outils, pluriels ramenés), et paires de mots qui se suivent.
const STOP = new Set('le la les un une des du de d l et ou a au aux en dans sur pour par avec sans que qui quand est sont il elle on ne pas se sa son ses ce cette alors etant donne doit doivent systeme'.split(' '));
const norm = t => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, ' ').match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s|x)$/, '')) ?? [];
const q = norm(query); const qPairs = new Set(q.slice(1).map((w, i) => `${q[i]} ${w}`));
const score = it => { const w = norm(it.text); const set = new Set(w); const shared = [...new Set(q)].filter(x => set.has(x)).length; const pairs = w.slice(1).filter((x, i) => qPairs.has(`${w[i]} ${x}`)).length; return shared ? (shared + 2 * pairs) / Math.sqrt(set.size + 1) : 0; };
let candidates = items.filter(it => (!opt('--activite') || it.activity === opt('--activite')) && (!opt('--story') || arr(it.stories).includes(opt('--story'))) && (!opt('--parcours') || it.id === opt('--parcours') || arr(prd.journeys).find(j => j.id === opt('--parcours'))));
candidates = (q.length ? candidates.map(it => ({ ...it, score: score(it) })).filter(it => it.score > 0) : candidates.map(it => ({ ...it, score: 0 }))).sort((a, b) => b.score - a.score).slice(0, Number(opt('--max') || 8));
const proof = id => { const r = arr(matrix?.requirements).find(x => x.id === id); return r ? `${r.status}${arr(r.tests).length ? ` (${arr(r.tests).length} test(s))` : ''}` : '—'; };
if (args.includes('--json')) { console.log(JSON.stringify(candidates.map(c => ({ ...c, proof: proof(c.id) })), null, 2)); process.exit(0); }
if (!candidates.length) { console.log('Aucune attente écrite ne ressemble à cette observation. Parcourir par activité (--activite) ou par story (--story) ; si rien ne la couvre vraiment, c\'est une question à trancher par le PRD, pas un défaut.'); process.exit(0); }
console.log(table(['Attente', 'Type', 'Texte exact', 'Épopée', 'Stories', 'Preuve actuelle'], candidates.map(c => [c.id, c.type, c.text, c.activity ?? '—', arr(c.stories).join(', ') || '—', proof(c.id)])));
console.log('\nPour chaque attente proche : le comportement observé la contredit-il (défaut), y est-il conforme alors que l\'attente paraît fausse (changement), ou aucune ne couvre-t-elle la situation (question) ? Si une attente contredite est déjà « prouvée », le test était insuffisant.');
