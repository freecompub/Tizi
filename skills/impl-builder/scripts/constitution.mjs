#!/usr/bin/env node
// Constitution du produit (.tizi/constitution.yaml) : les quelques principes que toutes les initiatives respectent.
// Elle vit le temps du produit, au-dessus des initiatives : un BRD ou une conception peut PROPOSER un principe, seul
// son responsable l'accepte ; un écart ponctuel est une dérogation nommée ; changer un principe est un amendement tracé.
// Un principe sans moyen de vérification n'est pas un principe : il est refusé.
//
//   --verifier                       forme de la constitution (code 1 si un principe n'est pas vérifiable)
//   --rendre                         écrit .tizi/constitution.md, lisible
//   --proposer --texte "…" --type doit|ne_doit_pas --raison "…" --controle automatique|test|revue --par "<nom>"
//              [--commande "<cmd>"] [--initiative <slug>]           ajoute un principe candidat
//   --decider PC-xx --accepter|--refuser --par "<responsable>" [--responsable "<nom>"]
//   --amender PC-xx --texte "…" --raison "…" --par "<responsable>"  nouvelle version, ancienne conservée
//   --deroger PC-xx --initiative <slug> --element <ID> --raison "…" --par "<approbateur>"
//   --controler                      lance les contrôles automatiques (CI, porte de PR) ; code 1 si l'un échoue
// Usage : node constitution.mjs [racine] <action> …
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { arr, writeOut, fail, table, today } from './lib/common.mjs';

export const constitutionFile = root => join(root, '.tizi', 'constitution.yaml');
export const loadConstitution = root => (existsSync(constitutionFile(root)) ? (yaml.load(readFileSync(constitutionFile(root), 'utf8')) ?? {}) : null);
export const activePrinciples = c => arr(c?.principles).filter(p => p.status === 'actif');
export function checkConstitution(c) {
  const out = [];
  const act = activePrinciples(c);
  if (act.length > 10) out.push(`plus de dix principes actifs (${act.length}) : au-delà, plus personne ne les lit et ils se contredisent`);
  for (const p of arr(c?.principles).filter(x => x.status !== 'refusé')) {
    if (!/\b(doit|doivent|ne doit pas|ne doivent pas)\b/i.test(p.statement ?? '')) out.push(`${p.id} : l'énoncé ne dit pas ce qui est exigé (« doit », « ne doit pas »)`);
    if (!p.check?.type) out.push(`${p.id} : aucun moyen de vérification — un principe invérifiable est un slogan`);
    else if (p.check.type === 'automatique' && !p.check.command) out.push(`${p.id} : contrôle automatique sans commande`);
    if (p.status === 'actif' && !p.owner) out.push(`${p.id} : actif sans responsable`);
    if (!p.rationale) out.push(`${p.id} : sans raison`);
  }
  for (const w of arr(c?.waivers)) if (!w.approved_by || !w.reason) out.push(`dérogation à ${w.principle} sans raison ou sans approbateur`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
  const valued = ['--texte', '--type', '--raison', '--controle', '--par', '--commande', '--initiative', '--decider', '--responsable', '--amender', '--deroger', '--element'];
  const root = args.find((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1])) ?? '.';
  const c = loadConstitution(root) ?? { version: 0, principles: [], amendments: [], waivers: [] };
  const save = () => writeOut(constitutionFile(root), `# Constitution du produit — tenue par constitution.mjs. Les principes actifs s'appliquent à toutes les initiatives.\n${yaml.dump(c, { lineWidth: 120 })}`);
  const find = id => { const p = arr(c.principles).find(x => x.id === id); if (!p) fail(`${id} introuvable.`); return p; };
  const now = today();
  if (args.includes('--proposer')) {
    const need = ['--texte', '--type', '--raison', '--controle', '--par'].filter(k => !opt(k));
    if (need.length) fail(`Principe incomplet (manque : ${need.join(', ')}).`, 2);
    if (!['automatique', 'test', 'revue'].includes(opt('--controle'))) fail('Contrôle : automatique (une commande), test (des tests étiquetés @PC-xx) ou revue.', 2);
    if (opt('--controle') === 'automatique' && !opt('--commande')) fail('Un contrôle automatique a une commande (--commande).', 2);
    const id = `PC-${String(arr(c.principles).length + 1).padStart(2, '0')}`;
    c.principles = [...arr(c.principles), { id, statement: opt('--texte'), kind: opt('--type'), rationale: opt('--raison'), check: { type: opt('--controle'), ...(opt('--commande') ? { command: opt('--commande') } : {}) }, status: 'candidat', proposed_by: opt('--par'), proposed_at: now, ...(opt('--initiative') ? { source_initiative: opt('--initiative') } : {}), version: 1 }];
    save(); console.log(`${id} proposé comme principe candidat : « ${opt('--texte')} ». Seul le responsable de la constitution peut l'accepter.`);
  } else if (opt('--decider')) {
    const p = find(opt('--decider'));
    if (!opt('--par')) fail('Qui décide ? --par "<responsable>".', 2);
    if (args.includes('--accepter')) { Object.assign(p, { status: 'actif', owner: opt('--responsable') || opt('--par'), decided_by: opt('--par'), since: now }); c.version = (c.version ?? 0) + 1; }
    else if (args.includes('--refuser')) Object.assign(p, { status: 'refusé', decided_by: opt('--par'), decided_at: now });
    else fail('--accepter ou --refuser.', 2);
    save(); console.log(`${p.id} ${p.status === 'actif' ? 'accepté : il s\'applique désormais à toutes les initiatives' : 'refusé : la contrainte reste locale à son initiative'} (constitution v${c.version}).`);
  } else if (opt('--amender')) {
    const p = find(opt('--amender'));
    if (!opt('--texte') || !opt('--raison') || !opt('--par')) fail('Un amendement a un nouveau texte, une raison et son auteur (le responsable).', 2);
    if (p.owner && opt('--par') !== p.owner) fail(`Seul le responsable de ${p.id} (${p.owner}) peut l'amender.`);
    c.amendments = [...arr(c.amendments), { principle: p.id, from_version: p.version ?? 1, previous: p.statement, reason: opt('--raison'), by: opt('--par'), date: now }];
    Object.assign(p, { statement: opt('--texte'), version: (p.version ?? 1) + 1 }); c.version = (c.version ?? 0) + 1;
    save(); console.log(`${p.id} amendé (version ${p.version}, constitution v${c.version}). Les conceptions qui s'y réfèrent sont à revoir.`);
  } else if (opt('--deroger')) {
    const p = find(opt('--deroger'));
    const need = ['--initiative', '--element', '--raison', '--par'].filter(k => !opt(k));
    if (need.length) fail(`Dérogation incomplète (manque : ${need.join(', ')}). Un écart à un principe est une décision nommée.`, 2);
    c.waivers = [...arr(c.waivers), { principle: p.id, initiative: opt('--initiative'), element: opt('--element'), reason: opt('--raison'), approved_by: opt('--par'), date: now }];
    save(); console.log(`Dérogation à ${p.id} enregistrée pour ${opt('--element')} (${opt('--initiative')}), approuvée par ${opt('--par')}.`);
  } else if (args.includes('--controler')) {
    let ko = 0;
    for (const p of activePrinciples(c).filter(x => x.check?.type === 'automatique')) {
      const r = spawnSync(p.check.command, { shell: true, cwd: root, encoding: 'utf8' });
      console.log(`${r.status === 0 ? '✓' : '✗'} ${p.id} — ${p.statement}${r.status === 0 ? '' : `\n    ${(r.stdout + r.stderr).trim().split('\n').slice(0, 5).join('\n    ')}`}`);
      if (r.status !== 0) ko += 1;
    }
    if (!activePrinciples(c).some(x => x.check?.type === 'automatique')) console.log('Aucun principe à contrôle automatique.');
    process.exitCode = ko ? 1 : 0;
  } else if (args.includes('--rendre')) {
    const md = [`# Constitution du produit — version ${c.version ?? 0}`, '', 'Les principes actifs s\'appliquent à toutes les initiatives. Un écart est une dérogation nommée ; un changement est un amendement décidé par le responsable du principe.', '',
      table(['Principe', 'Énoncé', 'Raison', 'Vérification', 'Responsable'], activePrinciples(c).map(p => [`${p.id} (v${p.version ?? 1})`, p.statement, p.rationale, `${p.check?.type}${p.check?.command ? ` : \`${p.check.command}\`` : ''}`, p.owner])), ''];
    const cand = arr(c.principles).filter(p => p.status === 'candidat');
    if (cand.length) md.push('## Principes candidats', '', table(['Principe', 'Énoncé', 'Proposé par', 'Initiative'], cand.map(p => [p.id, p.statement, p.proposed_by, p.source_initiative ?? '—'])), '');
    if (arr(c.waivers).length) md.push('## Dérogations', '', table(['Principe', 'Initiative', 'Élément', 'Raison', 'Approuvée par', 'Date'], c.waivers.map(w => [w.principle, w.initiative, w.element, w.reason, w.approved_by, w.date])), '');
    if (arr(c.amendments).length) md.push('## Amendements', '', table(['Principe', 'Version précédente', 'Ancien texte', 'Raison', 'Par', 'Date'], c.amendments.map(a => [a.principle, a.from_version, a.previous, a.reason, a.by, a.date])), '');
    writeOut(join(root, '.tizi', 'constitution.md'), md.join('\n'));
    console.log(`Constitution rendue : ${join(root, '.tizi', 'constitution.md')}`);
  } else {
    const issues = checkConstitution(c);
    console.log(issues.length ? issues.map(x => `⚠ ${x}`).join('\n') : `Constitution conforme : ${activePrinciples(c).length} principe(s) actif(s), version ${c.version ?? 0}.`);
    process.exitCode = issues.some(x => /vérification|commande|responsable/.test(x)) ? 1 : 0;
  }
}
