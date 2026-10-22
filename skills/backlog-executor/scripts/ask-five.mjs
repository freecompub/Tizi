#!/usr/bin/env node
// Les cinq questions qui comptent le plus, à poser maintenant. Classe les zones d'ombre ouvertes d'un document par
// impact (bloquantes d'abord, puis par nature, nombre d'éléments touchés, ancienneté) et n'en présente que cinq.
// Poser vingt questions d'un coup noie celles qui comptent ; chaque réponse est ensuite réécrite dans l'état (résolution
// de la zone d'ombre et mise à jour des éléments touchés). Discipline reprise de la commande clarify de spec-kit.
// Usage : node ask-five.mjs <état.yaml> [--max 5] [--json]
import { arr, loadState, fail, table } from './lib/common.mjs';

const args = process.argv.slice(2);
const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--max');
if (!statePath) fail('Usage : node ask-five.mjs <état.yaml> [--max 5] [--json]', 2);
const max = Number(args.includes('--max') ? args[args.indexOf('--max') + 1] : 5);
const s = loadState(statePath);
const WEIGHT = { contradiction: 5, arbitre_inconnu: 4, regle_metier_manquante: 4, decision_manquante: 4, solution_deguisee: 3, probleme_flou: 3, perimetre_flou: 3, hypothese_non_verifiee: 2, mesure_non_planifiee: 2 };
export const rank = zones => zones.filter(z => z.status === 'ouverte').map(z => {
  const touched = arr(z.related).length + (z.origin ? 1 : 0);
  const reasons = [z.blocking && 'bloquante', WEIGHT[z.type] >= 4 && z.type.replace(/_/g, ' '), touched > 1 && `${touched} éléments touchés`].filter(Boolean);
  return { ...z, score: (z.blocking ? 100 : 0) + 10 * (WEIGHT[z.type] ?? 1) + touched, reasons };
}).sort((a, b) => b.score - a.score || String(a.raised ?? a.id).localeCompare(String(b.raised ?? b.id)));
const ranked = rank(arr(s.shadow_zones));
const top = ranked.slice(0, max);
if (args.includes('--json')) { console.log(JSON.stringify(top, null, 2)); process.exit(0); }
if (!top.length) { console.log('Aucune zone d\'ombre ouverte.'); process.exit(0); }
console.log(table(['#', 'Zone', 'Question', 'Pourquoi maintenant', 'À qui'], top.map((z, i) => [i + 1, z.id, z.question ?? z.text ?? '', z.reasons.join(', ') || 'à lever', z.ask_to ?? z.owner ?? '—'])));
console.log(`\n${top.length} question(s) sur ${ranked.length} ouverte(s). Pose-les, puis réécris chaque réponse dans l'état : résolution de la zone d'ombre et mise à jour des éléments touchés. Les suivantes viendront ensuite.`);
