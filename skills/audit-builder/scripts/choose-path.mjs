#!/usr/bin/env node
// Choix du chemin : quelles étapes de Tizi une initiative traverse-t-elle ?
// Six questions fermées, posées par le point d'entrée `tizi` ; le script en déduit le chemin et l'enregistre comme une
// décision, avec les réponses et qui l'a prise. Sauter une étape se décide aussi à un col : le point d'étape distingue
// ensuite une étape « non utilisée, décidée » d'une étape oubliée. Idée reprise du « plus petit chemin » de BMAD-METHOD.
//
// Usage : node choose-path.mjs <initiative> --par "<nom>" --evident oui|non --intention-floue oui|non --regle-metier oui|non
//                              --contrat-donnee oui|non --reglementaire oui|non --plusieurs-jours oui|non [--elargir] [--racine .]
// Lecture seule : node choose-path.mjs <initiative> --voir
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, fail, today } from './lib/common.mjs';

export const QUESTIONS = [
  ['evident', 'S\'agit-il d\'une modification évidente et sans risque (coquille, texte, configuration) ?'],
  ['reglementaire', 'Le changement touche-t-il une exigence réglementaire ou la sécurité des patients ou des utilisateurs ?'],
  ['intention-floue', 'L\'intention est-elle floue, ou défendue différemment par plusieurs personnes ?'],
  ['regle-metier', 'Le changement crée-t-il ou modifie-t-il une règle métier ?'],
  ['contrat-donnee', 'Touche-t-il un contrat d\'interface, une donnée sensible, ou crée-t-il un composant ?'],
  ['plusieurs-jours', 'Dépasse-t-il quelques jours de travail ?'],
];
const ALL = ['brd', 'prd', 'sad', 'plan', 'impl', 'qa'];

// Règles de décision, dans l'ordre : la première qui s'applique l'emporte. La question réglementaire passe avant
// tout le reste et impose la chaîne complète, sans exception.
export function decide(a) {
  if (a.reglementaire) return { path: 'complet', steps: ALL, reason: 'exigence réglementaire ou de sécurité : chaîne complète, sans exception' };
  if (a.evident) return { path: 'hors-tizi', steps: [], reason: 'modification évidente et sans risque : pas besoin de Tizi' };
  if (a['intention-floue']) return { path: 'complet', steps: ALL, reason: 'intention floue ou disputée : il faut un BRD pour la clarifier' };
  if (!a['regle-metier'] && !a['contrat-donnee'] && !a['plusieurs-jours']) return { path: 'voie-rapide', steps: ['plan', 'impl'], reason: 'petit changement sans règle métier ni contrat : une story en voie rapide, puis l\'implémentation' };
  const steps = [...(a['regle-metier'] ? ['prd'] : []), ...(a['contrat-donnee'] ? ['sad'] : []), 'plan', 'impl', 'qa'];
  return { path: 'court', steps, reason: [a['regle-metier'] && 'règle métier : un PRD', a['contrat-donnee'] && 'contrat, donnée sensible ou composant : une conception', a['plusieurs-jours'] && 'plusieurs jours : un plan avec stories'].filter(Boolean).join(' ; ') };
}
export const pathFile = (root, slug) => join(root, '.tizi', 'chemins', `${slug}.yaml`);
export const loadPath = (root, slug) => (existsSync(pathFile(root, slug)) ? yaml.load(readFileSync(pathFile(root, slug), 'utf8')) : null);

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
  const slug = args.find(a => !a.startsWith('--') && !QUESTIONS.some(([k]) => args[args.indexOf(a) - 1] === `--${k}`) && !['--par', '--racine'].includes(args[args.indexOf(a) - 1]));
  const root = opt('--racine') || '.';
  if (!slug) fail('Usage : node choose-path.mjs <initiative> --par "<nom>" --evident oui|non … (voir l\'en-tête du script)', 2);
  const current = loadPath(root, slug);
  if (args.includes('--voir')) { console.log(current ? yaml.dump(current) : `Aucun chemin décidé pour ${slug}.`); process.exit(0); }
  const answers = {};
  for (const [k, q] of QUESTIONS) {
    const v = opt(`--${k}`).toLowerCase();
    if (!['oui', 'non'].includes(v)) fail(`Réponse manquante ou invalide pour --${k} (oui ou non) : ${q}`, 2);
    answers[k] = v === 'oui';
  }
  // --par était déjà obligatoire, et ça n'a pas suffi : sur le premier dossier réel, les trois chemins
  // ont été enregistrés au nom pris dans la configuration Git. Un champ obligatoire se remplit avec ce
  // qui est sous la main ; il faut dire d'où vient la valeur.
  if (!opt('--par')) fail('Qui décide du chemin ? --par "<nom>" — le nom se demande à l\'utilisateur. Ni le nom Git, ni le nom de session, ni l\'agent : sur un chemin réglementaire, qui décide compte.', 2);
  if (current && !args.includes('--elargir')) fail(`Un chemin est déjà décidé pour ${slug} (${current.path}). Pour le changer : --elargir, avec les nouvelles réponses.`);
  const d = decide(answers);
  if (current && args.includes('--elargir')) {
    const lost = current.steps.filter(s => !d.steps.includes(s));
    if (lost.length) fail(`--elargir ne retire pas d'étape (${lost.join(', ')} disparaîtrait). Un chemin ne se rétrécit pas en cours de route.`);
  }
  const record = { initiative: slug, path: d.path, steps: d.steps, reason: d.reason, answers, decided_by: opt('--par'), date: today(),
    history: [...(current?.history ?? []), ...(current ? [{ path: current.path, steps: current.steps, decided_by: current.decided_by, date: current.date }] : [])] };
  writeOut(pathFile(root, slug), `# Chemin de l'initiative ${slug} — décision enregistrée par choose-path.mjs\n${yaml.dump(record, { lineWidth: 120 })}`);
  const label = { brd: 'BRD', prd: 'PRD', sad: 'conception', plan: 'plan', impl: 'implémentation', qa: 'vérification de release' };
  console.log(`Chemin « ${d.path} » pour ${slug} : ${d.steps.map(s => label[s]).join(' → ') || 'aucune étape'}.\nPourquoi : ${d.reason}.\nDécidé par ${record.decided_by} le ${record.date}${current ? ' (élargissement)' : ''}.`);
}
