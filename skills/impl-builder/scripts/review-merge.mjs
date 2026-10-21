#!/usr/bin/env node
// Fusionne et contrôle les constats d'une revue de code multi-perspectives, puis rend le verdict.
//   - refuse une revue périmée (commit ou diff changé depuis review-context.mjs) ;
//   - rejette les constats sans emplacement, sans preuve ou de sévérité inconnue ;
//   - retire toute métadonnée de confiance ou de certitude et le signale ;
//   - exige une vérification adversariale (finding-verifier) pour chaque constat bloquant ou majeur ;
//   - écarte les constats réfutés, applique les rétrogradations, et rend le verdict.
// Usage : node review-merge.mjs <impl/<slug>/state.yaml> --task TK-xxx
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, table, loadState, writeOut, fail, today, humanReviewFooter } from './lib/common.mjs';
import { saveState } from './lib/impl.mjs';
import { currentDiff, reviewDir } from './lib/review.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--task');
const taskId = args.includes('--task') ? args[args.indexOf('--task') + 1] : '';
if (!statePath || !taskId) fail('Usage : node review-merge.mjs <state.yaml> --task TK-xxx', 2);
const dir = reviewDir(statePath, taskId);
if (!existsSync(join(dir, 'review-state.json'))) fail('Revue non préparée : lancer review-context.mjs.');
const rs = JSON.parse(readFileSync(join(dir, 'review-state.json'), 'utf8'));
const now = currentDiff(rs.base);
if (now.digest !== rs.diff_sha256) fail(`Revue périmée : le code a changé depuis sa préparation (commit ${String(now.head).slice(0, 10)}). Relancer review-context.mjs et la revue.`);

const SEV = ['bloquant', 'majeur', 'mineur'];
const CONF_KEY = /confian|confidence|certitude|certaint|probab|score|likelihood/i;
const CONF_TEXT = /\b(?:confiance|confidence|certitude|certainty)\b[^.\n]{0,30}(?:\d+\s*%|élevée|haute|faible|moyenne|high|medium|low)|\b\d{1,3}\s*%\s*(?:sûr|certain|confiden)/i;
const rejected = [], stripped = [];
const findings = [];
const fdir = join(dir, 'findings');
for (const f of existsSync(fdir) ? readdirSync(fdir).filter(x => /\.ya?ml$/.test(x)) : []) {
  let doc; try { doc = yaml.load(readFileSync(join(fdir, f), 'utf8')); } catch (e) { rejected.push({ file: f, reason: `illisible (${e.message.split('\n')[0]})` }); continue; }
  const perspective = doc?.perspective ?? f.replace(/\.ya?ml$/, '');
  for (const x of arr(doc?.findings)) {
    for (const k of Object.keys(x)) if (CONF_KEY.test(k)) { delete x[k]; stripped.push(`${perspective}/${x.id ?? '?'} : champ « ${k} »`); }
    for (const k of ['expected', 'observed', 'smallest_fix']) if (typeof x[k] === 'string' && CONF_TEXT.test(x[k])) { x[k] = x[k].replace(CONF_TEXT, '[mention de confiance retirée]'); stripped.push(`${perspective}/${x.id ?? '?'} : texte de « ${k} »`); }
    const missing = ['id', 'location', 'expected', 'observed', 'smallest_fix'].filter(k => !x[k]);
    if (missing.length || !SEV.includes(x.severity) || !arr(x.evidence).length) { rejected.push({ file: f, reason: `${x.id ?? '?'} : ${missing.length ? `manque ${missing.join(', ')}` : !SEV.includes(x.severity) ? `sévérité « ${x.severity} » inconnue` : 'aucune preuve'}` }); continue; }
    const file = String(x.location).split(':')[0];
    findings.push({ ...x, perspective, key: `${perspective}/${x.id}`, outsideDiff: !rs.files.includes(file) });
  }
}
// Vérifications adversariales.
const verif = new Map();
const vfile = join(dir, 'verifications.yaml');
if (existsSync(vfile)) for (const v of arr(yaml.load(readFileSync(vfile, 'utf8'))?.verifications)) verif.set(`${v.perspective}/${v.finding}`, v);
const kept = [], refuted = [], unverified = [];
for (const x of findings) {
  const v = verif.get(x.key);
  if (['bloquant', 'majeur'].includes(x.severity) && !v) { unverified.push(x); kept.push({ ...x, verdict: 'non vérifié' }); continue; }
  if (v?.verdict === 'RÉFUTÉ') { refuted.push({ ...x, verification: v }); continue; }
  kept.push({ ...x, verdict: v?.verdict ?? '—', severity: v?.verdict === 'RÉTROGRADÉ' && SEV.includes(v.severity) ? v.severity : x.severity, verification: v });
}
// Doublons : même emplacement, plusieurs perspectives.
const byLoc = new Map();
for (const x of kept) byLoc.set(`${x.location}|${x.expected}`, [...(byLoc.get(`${x.location}|${x.expected}`) ?? []), x]);
const merged = [...byLoc.values()].map(g => ({ ...g[0], perspectives: g.map(x => x.perspective) }));
const blocking = merged.filter(x => x.severity === 'bloquant' && x.verdict !== 'non vérifié');
const verdict = unverified.length ? 'vérification incomplète' : blocking.length ? 'corrections requises' : 'prête pour la relecture humaine';
const order = s => SEV.indexOf(s);
const md = [`# Revue de code — ${taskId}`, '', `Commit \`${rs.head}\` · base \`${rs.base}\` · perspectives : ${rs.perspectives.join(', ')} · fusionnée le ${today()}`, '', `**Verdict : ${verdict}.**`, ''];
md.push('## Constats retenus', '', merged.length ? table(['Sévérité', 'Emplacement', 'Attendu', 'Constaté', 'Correction', 'Perspectives', 'Vérification'],
  merged.sort((a, b) => order(a.severity) - order(b.severity)).map(x => [x.severity, `${x.location}${x.outsideDiff ? ' (hors diff)' : ''}`, x.expected, x.observed, x.smallest_fix, x.perspectives.join(', '), x.verdict])) : '_Aucun._', '');
if (refuted.length) md.push('## Constats réfutés par la vérification adversariale', '', table(['Constat', 'Emplacement', 'Preuve contraire', 'Raison'], refuted.map(x => [x.key, x.location, arr(x.verification.contradicting).join(', '), x.verification.rationale])), '');
if (unverified.length) md.push('## Constats graves non vérifiés', '', 'Chaque constat bloquant ou majeur doit passer par `finding-verifier` avant le verdict.', '', ...unverified.map(x => `- ${x.key} (${x.severity}) — ${x.location}`), '');
if (rejected.length) md.push('## Constats rejetés pour forme', '', ...rejected.map(r => `- ${r.file} : ${r.reason}`), '');
if (stripped.length) md.push('## Mentions de confiance retirées', '', 'Les revues ne portent aucun score de confiance : seules comptent les preuves et les manques de preuve nommés.', '', ...stripped.map(x => `- ${x}`), '');
writeOut(join(dir, 'review.md'), md.join('\n') + humanReviewFooter('rapport de revue'));
writeOut(join(dir, 'review-result.json'), `${JSON.stringify({ task: taskId, head: rs.head, diff_sha256: rs.diff_sha256, verdict, counts: { kept: merged.length, blocking: blocking.length, refuted: refuted.length, unverified: unverified.length, rejected: rejected.length, stripped: stripped.length } }, null, 2)}\n`);
const s = loadState(statePath);
const t = arr(s.tasks).find(x => x.id === taskId);
if (t) { t.review = { date: today(), head: rs.head, diff_sha256: rs.diff_sha256, verdict, report: join(dir, 'review.md') }; saveState(statePath, s); }
console.log(`Revue ${taskId} : ${verdict} — ${merged.length} constat(s) retenu(s) dont ${blocking.length} bloquant(s), ${refuted.length} réfuté(s), ${unverified.length} non vérifié(s), ${rejected.length} rejeté(s) pour forme, ${stripped.length} mention(s) de confiance retirée(s).`);
if (verdict !== 'prête pour la relecture humaine') process.exitCode = 1;
