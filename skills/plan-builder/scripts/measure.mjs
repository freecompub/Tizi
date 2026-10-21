#!/usr/bin/env node
// Mesure du réel, pour des tâches réalisées par des agents. Ce qui coûte n'est pas le codage, mais l'attention humaine,
// l'attente, les allers-retours et les blocages. Tout est calculé à partir de ce qui est déjà enregistré :
//   - le journal horodaté de chaque tâche (impl/<slug>/state.yaml, écrit par les scripts d'impl-builder) ;
//   - le registre des blocages (.tizi/blocages/<slug>.yaml, block.mjs) ;
//   - l'index des sessions (.tizi/sessions/index.yaml : tâches et tokens consommés).
// Usage : node measure.mjs <plan/<slug>/state.yaml> [--impl impl/<slug>/state.yaml] [--release REL-x]
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, txt, table, loadState, writeOut, fail, today, humanReviewFooter } from './lib/common.mjs';
import { riskSize, ATTENTION_DEFAULTS } from './lib/rules.mjs';
import { loadBlocks, hoursBetween, CAUSES } from './block.mjs';
import { loadIndex } from './lib/sessions.mjs';

const args = process.argv.slice(2);
const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
const statePath = args.find(a => !a.startsWith('--') && !['--impl', '--release'].includes(args[args.indexOf(a) - 1]));
if (!statePath) fail('Usage : node measure.mjs <plan/<slug>/state.yaml> [--impl …] [--release REL-x]', 2);
const plan = loadState(statePath);
const slug = dirname(statePath).split('/').pop();
const refs = existsSync(join(dirname(statePath), 'refs.yaml')) ? loadState(join(dirname(statePath), 'refs.yaml')) : {};
const implPath = opt('--impl') || `impl/${slug}/state.yaml`;
const impl = existsSync(implPath) ? loadState(implPath) : null;
if (!impl) fail(`État d'implémentation introuvable (${implPath}) : rien à mesurer.`);
const blocks = loadBlocks('.', slug);
const sessions = loadIndex('.').sessions ?? [];
const att = { ...ATTENTION_DEFAULTS, ...(plan.settings?.attention ?? {}) };
const now = new Date().toISOString();
const median = xs => { const v = xs.filter(x => x != null && !Number.isNaN(x)).sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : null; };
const h = x => (x == null ? '—' : `${x.toFixed(1)} h`);
const first = (tl, ev, pred = () => true) => tl.find(e => e.event === ev && pred(e))?.at;
const last = (tl, ev) => [...tl].reverse().find(e => e.event === ev)?.at;
const between = (a, b) => (a && b ? hoursBetween(a, b) : null);

const inScope = t => !opt('--release') || arr(plan.stories).find(x => x.id === t.story)?.release === opt('--release');
const rows = [];
for (const it of arr(impl.tasks)) {
  const pt = arr(plan.tasks).find(x => x.id === it.id) ?? { id: it.id };
  if (!inScope(pt)) continue;
  const tl = arr(it.timeline);
  if (!tl.length) continue;
  const taken = first(tl, 'prise'), validated = first(tl, 'compréhension_validée'), gateOk = first(tl, 'porte', e => e.ok);
  const approved = last(tl, 'pr_approuvée'), merged = first(tl, 'fusionnée');
  const risk = riskSize(pt, plan, refs);
  // Blocages : seulement la part qui chevauche la vie de la tâche (de la prise à la fusion), qu'ils portent sur la tâche
  // ou sur sa story. Un blocage de story antérieur à la prise est compté par story, pas attribué à chaque tâche.
  const lifeEnd = merged ?? now;
  const overlap = b => taken ? Math.max(0, hoursBetween(b.started > taken ? b.started : taken, (b.ended || now) < lifeEnd ? (b.ended || now) : lifeEnd)) * ((b.ended || now) > taken && b.started < lifeEnd ? 1 : 0) : 0;
  const mine = blocks.filter(b => b.on === it.id || (pt.story && b.on === pt.story));
  const blockedBy = {};
  for (const b of mine) { const o = overlap(b); if (o > 0) blockedBy[b.cause] = (blockedBy[b.cause] ?? 0) + o; }
  const redRuns = tl.filter(e => e.event === 'tests' && e.failed && !e.characterization).length;
  const gateKo = tl.filter(e => e.event === 'porte' && !e.ok).length;
  const corrections = tl.filter(e => e.event === 'corrections_demandées').length;
  const revalid = tl.filter(e => e.event === 'compréhension_revalidée').length;
  const agentReviews = tl.filter(e => e.event === 'revue_agents' && e.verdict !== 'prête pour la relecture humaine').length;
  const questions = arr(it.understanding?.questions).length;
  const humanReviews = tl.filter(e => ['pr_approuvée', 'corrections_demandées'].includes(e.event)).length;
  const attention = Math.round((1 + revalid) * att.validation + questions * att.question + humanReviews * att.revue);
  const sess = sessions.filter(x => arr(x.tasks).includes(it.id));
  const tokens = sess.length && sess.every(x => typeof x.tokens === 'object') ? Math.round(sess.reduce((n, x) => n + x.tokens.total / arr(x.tasks).length, 0)) : sess.length ? 'inconnu' : null;
  rows.push({
    id: it.id, title: pt.title ?? '', size: pt.size ?? '', risk: risk.size, existing: risk.factors.some(([n]) => n === 'code existant modifié'), status: it.status,
    total: between(taken, merged ?? now), open: !merged, understanding: between(taken, validated), build: between(validated, gateOk), waitReview: between(gateOk, approved), toMerge: between(approved, merged),
    redRuns, gateKo, corrections, revalid, agentReviews, questions, attention, blockedHours: Object.values(blockedBy).reduce((n, x) => n + x, 0), blockedBy, tokens, shared: sess.some(x => arr(x.tasks).length > 1),
  });
}
if (!rows.length) fail('Aucune tâche avec un journal : les mesures commencent avec les tâches prises par start-task.mjs.');

// Agrégats par taille de risque, et par type de code.
const groups = (key, labelOf) => [...new Set(rows.map(key))].map(k => {
  const g = rows.filter(r => key(r) === k);
  return { label: labelOf(k), n: g.length, total: median(g.filter(r => !r.open).map(r => r.total)), waitReview: median(g.map(r => r.waitReview)), rework: g.reduce((n, r) => n + r.redRuns + r.gateKo + r.corrections + r.revalid, 0) / g.length, attention: median(g.map(r => r.attention)), blocked: median(g.map(r => r.blockedHours)) };
});
const bySize = groups(r => r.risk, k => `risque ${k}`), byType = groups(r => (r.existing ? 'existant' : 'neuf'), k => (k === 'existant' ? 'code existant modifié' : 'code neuf'));
const causes = Object.entries(blocks.reduce((m, b) => { m[b.cause] = m[b.cause] ?? { n: 0, h: 0, open: 0 }; m[b.cause].n += 1; m[b.cause].h += hoursBetween(b.started, b.ended || now); if (!b.ended) m[b.cause].open += 1; return m; }, {})).sort((a, b) => b[1].h - a[1].h);
const calib = Object.fromEntries(['S', 'M', 'L', 'XL'].map(k => [k, rows.filter(r => r.risk === k)]).filter(([, g]) => g.length >= 3).map(([k, g]) => [k, median(g.map(r => r.attention))]));

const md = [`# Mesures du réel — ${txt(plan.initiative?.name)}${opt('--release') ? `, ${opt('--release')}` : ''}`, '', `Calculées le ${today()} depuis le journal des tâches, le registre des blocages et les sessions. Quand les agents réalisent les tâches, ce qui coûte est l'attention humaine, l'attente, les allers-retours et les blocages : c'est ce qui est mesuré ici.`, ''];
md.push('## Par tâche', '', table(['Tâche', 'Taille / risque', 'Durée totale', 'Compréhension', 'Réalisation', 'Attente de relecture', 'Allers-retours', 'Attention humaine', 'Bloquée', 'Tokens'],
  rows.map(r => [`${r.id} — ${txt(r.title)}${r.open ? ' (en cours)' : ''}`, `${r.size || '—'} / ${r.risk}`, h(r.total), h(r.understanding), h(r.build), h(r.waitReview), `${r.redRuns + r.gateKo + r.corrections + r.revalid} (${r.gateKo} porte(s) refusée(s), ${r.corrections} correction(s), ${r.revalid} revalidation(s))`, `${r.attention} min`, r.blockedHours ? `${r.blockedHours.toFixed(1)} h` : '—', r.tokens == null ? '—' : r.tokens === 'inconnu' ? 'inconnu' : `${r.tokens.toLocaleString('fr-FR')}${r.shared ? ' (session partagée)' : ''}`])), '');
md.push('## Par taille de risque', '', table(['Groupe', 'Tâches', 'Durée médiane (finies)', 'Attente de relecture médiane', 'Allers-retours moyens', 'Attention médiane', 'Blocage médian'], bySize.map(g => [g.label, g.n, h(g.total), h(g.waitReview), g.rework.toFixed(1), g.attention == null ? '—' : `${g.attention} min`, h(g.blocked)])), '');
md.push('## Code neuf ou existant', '', table(['Groupe', 'Tâches', 'Durée médiane (finies)', 'Attente de relecture médiane', 'Allers-retours moyens', 'Attention médiane', 'Blocage médian'], byType.map(g => [g.label, g.n, h(g.total), h(g.waitReview), g.rework.toFixed(1), g.attention == null ? '—' : `${g.attention} min`, h(g.blocked)])), '');
md.push('## Blocages par cause', '', causes.length ? table(['Cause', 'Blocages', 'Durée cumulée', 'Encore ouverts'], causes.map(([c, x]) => [CAUSES[c] ?? c, x.n, `${x.h.toFixed(1)} h`, x.open])) : '_Aucun blocage enregistré._', '');
const storyBlocks = [...new Set(blocks.filter(b => /^US-/.test(b.on)).map(b => b.on))].map(id => { const bs = blocks.filter(b => b.on === id); return [id, bs.length, bs.reduce((n, b) => n + hoursBetween(b.started, b.ended || now), 0), [...new Set(bs.map(b => b.cause))].join(', ')]; });
if (storyBlocks.length) md.push('## Blocages par story', '', 'Durée totale des blocages posés sur la story, y compris avant le démarrage de ses tâches.', '', table(['Story', 'Blocages', 'Durée cumulée', 'Causes'], storyBlocks.map(([id, n, hrs, c]) => [id, n, `${hrs.toFixed(1)} h`, c])), '');
md.push('## Calibration', '', Object.keys(calib).length ? `Attention humaine médiane mesurée par taille (au moins trois tâches) : à reprendre dans \`settings.attention_by_size\` du plan pour les charges prévues :\n\n\`\`\`yaml\nattention_by_size: ${JSON.stringify(calib).replace(/"/g, '')}\n\`\`\`` : '_Pas encore assez de tâches finies par taille (trois au moins) pour calibrer._', '');
const out = join(dirname(statePath), 'mesures');
writeOut(join(out, `mesures-${today()}.md`), md.join('\n') + humanReviewFooter('rapport de mesures'));
writeOut(join(out, 'mesures.yaml'), `# Dernières mesures — measure.mjs, ${today()}\n${yaml.dump({ computed: today(), tasks: rows, by_risk: bySize, by_type: byType, blockages: Object.fromEntries(causes), calibration: calib }, { lineWidth: 120 })}`);
console.log(`Mesures : ${rows.length} tâche(s), ${blocks.length} blocage(s) — ${join(out, `mesures-${today()}.md`)}`);
