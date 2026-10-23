#!/usr/bin/env node
// Registre des défauts d'une initiative (.tizi/defauts/<initiative>.yaml), versionné.
// Ce qu'un testeur remonte n'est pas toujours un défaut : le tri est obligatoire.
//   défaut       le comportement contredit une attente écrite (AC, EX, FR, RG, PB) : il la nomme, avec une sévérité ;
//   changement   conforme à l'écrit, mais l'écrit paraît faux : demande de changement, adressée à qui décide ;
//   question     rien ne le spécifie : zone d'ombre, à trancher par le PRD ;
//   doublon      d'un défaut existant ;  non_reproductible  sur la version indiquée.
// Un signalement non trié compte comme bloquant pour la porte de release (R10).
//
// Signaler : node defect.mjs <initiative> --signaler --titre "…" --observe "…" --version <candidate> --par "<nom>"
//                            [--etapes "a|b|c"] [--environnement "…"] [--donnees "…"]
// Trier    : node defect.mjs <initiative> --trier DEF-xxx --classement defaut --exigence AC-001 --attendu "…" --severite majeur
//            (changement : --decideur "<nom>" ; doublon : --doublon-de DEF-yyy)
// Corriger : node defect.mjs <initiative> --corrige-par DEF-xxx US-yyy
// Lister   : node defect.mjs <initiative> [--ouverts]
// La fermeture n'est pas déclarée : un défaut est résolu quand un test de régression étiqueté @DEF-xxx passe sur la
// version candidate (calculé par release-matrix.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, fail, table } from './lib/common.mjs';

export const CLASSES = ['defaut', 'changement', 'question', 'doublon', 'non_reproductible'];
export const SEVERITIES = ['bloquant', 'majeur', 'mineur'];
export const registerFile = (root, slug) => join(root, '.tizi', 'defauts', `${slug}.yaml`);
export const loadDefects = (root, slug) => (existsSync(registerFile(root, slug)) ? (yaml.load(readFileSync(registerFile(root, slug), 'utf8'))?.defauts ?? []) : []);
export const saveDefects = (root, slug, list) => writeOut(registerFile(root, slug), `# Défauts de l'initiative ${slug} — tenu par defect.mjs\n${yaml.dump({ defauts: list }, { lineWidth: 120 })}`);
// Un signalement compte pour la porte tant qu'il n'est pas trié, ou tant qu'un défaut bloquant ou majeur n'est pas résolu.
export const isOpen = d => !['doublon', 'non_reproductible', 'changement', 'question'].includes(d.classification) && d.status !== 'rejeté';

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
  const flags = ['--titre', '--observe', '--version', '--par', '--etapes', '--environnement', '--donnees', '--trier', '--classement', '--exigence', '--attendu', '--severite', '--decideur', '--doublon-de', '--corrige-par', '--source', '--racine'];
  const slug = args.find(a => !a.startsWith('--') && !flags.includes(args[args.indexOf(a) - 1]) && args[args.indexOf(a) - 2] !== '--corrige-par');
  const root = opt('--racine') || '.';
  if (!slug) fail('Usage : node defect.mjs <initiative> --signaler … | --trier DEF-xxx … | --corrige-par DEF-xxx US-yyy | [--ouverts]', 2);
  const list = loadDefects(root, slug);
  const now = new Date().toISOString();
  if (args.includes('--signaler')) {
    const need = ['--titre', '--observe', '--version', '--par'].filter(k => !opt(k));
    if (need.length) fail(`Signalement incomplet (manque : ${need.join(', ')}). Une observation sans version ni auteur n'est pas reproductible.`, 2);
    const id = `DEF-${String(list.length + 1).padStart(3, '0')}`;
    list.push({ id, title: opt('--titre'), observed: opt('--observe'), found_in: opt('--version'), reported_by: opt('--par'), reported_at: now,
      steps: opt('--etapes') ? opt('--etapes').split('|').map(x => x.trim()) : [], environment: opt('--environnement'), data: opt('--donnees'),
      classification: '', status: 'à_trier', ...(opt('--source') ? { source: opt('--source') } : {}) });
    saveDefects(root, slug, list);
    console.log(`${id} signalé : ${opt('--titre')} (version ${opt('--version')}). À trier : défaut, changement, question, doublon ou non reproductible.`);
  } else if (opt('--trier')) {
    const d = list.find(x => x.id === opt('--trier'));
    if (!d) fail(`${opt('--trier')} introuvable.`);
    const c = opt('--classement');
    if (!CLASSES.includes(c)) fail(`Classement attendu : ${CLASSES.join(', ')}.`, 2);
    if (c === 'defaut') {
      if (!opt('--exigence')) fail('Un défaut nomme l\'attente qu\'il contredit (--exigence AC-xxx, EX-xxx, FR-xxx, RG-xxx ou PB-xx). Sans attente écrite, c\'est une question.', 2);
      if (!SEVERITIES.includes(opt('--severite'))) fail(`Sévérité attendue : ${SEVERITIES.join(', ')}.`, 2);
      if (!opt('--attendu')) fail('Recopie le comportement attendu, tel qu\'il est écrit dans l\'exigence (--attendu "…").', 2);
      const dup = list.find(x => x.id !== d.id && x.requirement === opt('--exigence') && x.classification === 'defaut' && x.status !== 'rejeté');
      if (dup) console.warn(`Attention : ${dup.id} porte déjà sur ${opt('--exigence')} (« ${dup.title} »). Vérifier qu'il ne s'agit pas d'un doublon.`);
      Object.assign(d, { requirement: opt('--exigence'), expected: opt('--attendu'), severity: opt('--severite'), status: 'ouvert', regression_tag: `@${d.id}` });
    }
    if (c === 'changement') { if (!opt('--decideur')) fail('Une demande de changement est adressée à qui décide (--decideur, d\'après les droits de décision).', 2); Object.assign(d, { decider: opt('--decideur'), status: 'adressé', ...(opt('--exigence') ? { requirement: opt('--exigence') } : {}) }); }
    if (c === 'question') Object.assign(d, { status: 'à_trancher' });
    if (c === 'doublon') { if (!list.find(x => x.id === opt('--doublon-de'))) fail('Doublon de quel défaut ? --doublon-de DEF-xxx.', 2); Object.assign(d, { duplicate_of: opt('--doublon-de'), status: 'fermé' }); }
    if (c === 'non_reproductible') Object.assign(d, { status: 'fermé' });
    Object.assign(d, { classification: c, triaged_by: opt('--par') || '', triaged_at: now });
    saveDefects(root, slug, list);
    console.log(`${d.id} trié : ${c}${d.requirement ? ` sur ${d.requirement}` : ''}${d.severity ? `, ${d.severity}` : ''}${d.decider ? `, adressé à ${d.decider}` : ''}.${c === 'defaut' ? ` Correction : une story en voie rapide, rattachée par --corrige-par ; test de régression étiqueté ${d.regression_tag}.` : ''}`);
  } else if (opt('--corrige-par')) {
    const i = args.indexOf('--corrige-par');
    const d = list.find(x => x.id === args[i + 1]);
    if (!d) fail(`${args[i + 1]} introuvable.`);
    if (d.classification !== 'defaut') fail(`${d.id} n'est pas trié comme défaut.`);
    d.fix_story = args[i + 2];
    saveDefects(root, slug, list);
    console.log(`${d.id} corrigé par ${d.fix_story} (story en voie rapide). Il sera résolu quand un test étiqueté ${d.regression_tag} passera sur la version candidate.`);
  } else {
    const rows = list.filter(d => !args.includes('--ouverts') || (isOpen(d) && d.status !== 'fermé'));
    console.log(rows.length ? table(['ID', 'Titre', 'Tri', 'Exigence', 'Sévérité', 'Version', 'Statut', 'Correction'], rows.map(d => [d.id, d.title, d.classification || '**à trier**', d.requirement ?? '—', d.severity ?? '—', d.found_in, d.status, d.fix_story ?? '—'])) : 'Aucun défaut.');
  }
}
