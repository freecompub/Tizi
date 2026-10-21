#!/usr/bin/env node
// Registre des blocages d'une initiative : une story ou une tâche ne peut pas avancer, pour une cause typée.
// Versionné dans .tizi/blocages/<initiative>.yaml ; les durées sont comptées par measure.mjs (plan-builder).
//
// Ouvrir : node block.mjs <initiative> --sur US-xxx|TK-xxx --cause <cause> --note "…" --par "<nom>"
// Lever  : node block.mjs <initiative> --lever BL-xxx [--note "…"]
// Lister : node block.mjs <initiative> [--ouverts]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from './lib/vendor/js-yaml.mjs';
import { writeOut, fail, table } from './lib/common.mjs';

export const CAUSES = {
  environnement: 'environnement pas prêt ou en panne (poste, CI, serveur, simulateur)',
  acces: 'accès ou droits manquants (dépôt, outil, API, compte)',
  donnees: 'données de test absentes ou inutilisables',
  dependance: 'dépendance envers une autre tâche ou une autre équipe',
  question: 'question métier en attente de réponse',
  decision: 'décision attendue (produit, architecture, réglementaire)',
  relecture: 'attente d\'une relecture ou d\'une validation humaine',
  outil: 'agent ou outil d\'IA indisponible, quota atteint, panne',
  externe: 'fournisseur ou partenaire externe',
  autre: 'autre cause, à préciser dans la note',
};
export const registerFile = (root, slug) => join(root, '.tizi', 'blocages', `${slug}.yaml`);
export const loadBlocks = (root, slug) => (existsSync(registerFile(root, slug)) ? (yaml.load(readFileSync(registerFile(root, slug), 'utf8'))?.blocages ?? []) : []);
export const hoursBetween = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 36e5);

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : '');
  const slug = args.find(a => !a.startsWith('--') && !['--sur', '--cause', '--note', '--par', '--lever', '--racine'].includes(args[args.indexOf(a) - 1]));
  const root = opt('--racine') || '.';
  if (!slug) fail('Usage : node block.mjs <initiative> --sur US-xxx|TK-xxx --cause <cause> --note "…" --par "<nom>" | --lever BL-xxx | [--ouverts]', 2);
  const list = loadBlocks(root, slug);
  const save = () => writeOut(registerFile(root, slug), `# Blocages de l'initiative ${slug} — tenu par block.mjs\n${yaml.dump({ blocages: list }, { lineWidth: 120 })}`);
  const now = new Date().toISOString();
  if (opt('--sur')) {
    const target = opt('--sur'), cause = opt('--cause');
    if (!/^(US|TK)-/.test(target)) fail('--sur attend une story (US-xxx) ou une tâche (TK-xxx).', 2);
    if (!CAUSES[cause]) fail(`Cause inconnue « ${cause} ». Causes : ${Object.keys(CAUSES).join(', ')}.`, 2);
    if (!opt('--note')) fail('Décris le blocage en une phrase : --note "…".', 2);
    if (list.some(b => b.on === target && b.cause === cause && !b.ended)) fail(`${target} a déjà un blocage ouvert pour la cause « ${cause} ».`);
    const id = `BL-${String(list.length + 1).padStart(3, '0')}`;
    list.push({ id, on: target, cause, note: opt('--note'), started: now, ended: '', declared_by: opt('--par') || '' });
    save();
    console.log(`${id} ouvert sur ${target} : ${CAUSES[cause]} — ${opt('--note')}.`);
  } else if (opt('--lever')) {
    const b = list.find(x => x.id === opt('--lever'));
    if (!b) fail(`${opt('--lever')} introuvable.`);
    if (b.ended) fail(`${b.id} est déjà levé.`);
    b.ended = now; if (opt('--note')) b.resolution = opt('--note');
    save();
    console.log(`${b.id} levé sur ${b.on} après ${hoursBetween(b.started, b.ended).toFixed(1)} h (${b.cause}).`);
  } else {
    const rows = list.filter(b => !args.includes('--ouverts') || !b.ended);
    console.log(rows.length ? table(['ID', 'Sur', 'Cause', 'Note', 'Depuis', 'Durée (h)'], rows.map(b => [b.id, b.on, b.cause, b.note, b.started.slice(0, 16).replace('T', ' '), hoursBetween(b.started, b.ended || now).toFixed(1) + (b.ended ? '' : ' (ouvert)')])) : 'Aucun blocage.');
  }
}
