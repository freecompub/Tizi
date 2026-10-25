#!/usr/bin/env node
// Les cinq questions qui comptent le plus, à poser maintenant. Classe les zones d'ombre ouvertes d'un document par
// impact (ce que la zone coûte si elle reste ouverte, puis nombre d'éléments touchés, puis ancienneté) et n'en
// présente que cinq.
// Poser vingt questions d'un coup noie celles qui comptent ; chaque réponse est ensuite réécrite dans l'état (résolution
// de la zone d'ombre et mise à jour des éléments touchés). Discipline reprise de la commande clarify de spec-kit.
// Usage : node ask-five.mjs <état.yaml> [--max 5] [--json]
import { arr, loadState, fail, table } from './lib/common.mjs';

// Ce que coûte la zone laissée ouverte, de 5 à 1. La table ne parlait que le vocabulaire du BRD :
// sur le PRD du deuxième dossier réel, quatorze types sur seize tombaient sur le défaut `?? 1`, si bien
// que `conflit_interets` pesait autant qu'un `attendu_implicite` et que `persona_non_fonde` — un persona
// sans aucune preuve, à la base du document — arrivait dernier. Le classement était ordonné par le
// nombre d'éléments touchés, pas par l'impact. L'échelle :
//   5  rien ne peut avancer : deux sources ou deux parties s'opposent, ou la suite contredit l'amont ;
//   4  une décision ou une mesure manque, et seul le décideur désigné peut la donner ;
//   3  le fondement n'est pas prouvé : on risque de construire sur du vide ;
//   2  une hypothèse ou une dépendance nommée, vérifiable plus tard sans tout reprendre ;
//   1  le reste (défaut), y compris les types propres à un document qui n'est pas encore couvert ici.
const WEIGHT = {
  // 5 — opposition ouverte
  contradiction: 5, conflit_interets: 5, conflit_amont: 5,
  // 4 — décision ou mesure manquante
  arbitre_inconnu: 4, perimetre_flou: 4, perimetre_non_tranche: 4, regle_absente_amont: 4, regle_non_couverte: 4,
  succes_non_mesurable: 4, objectif_non_mesurable: 4, driver_non_mesurable: 4, nfr_sans_reponse: 4,
  // 3 — fondement non prouvé
  probleme_flou: 3, solution_deguisee: 3, partie_prenante_non_entendue: 3, profil_manquant: 3,
  persona_non_fonde: 3, existant_non_prouve: 3, attendu_implicite: 3, frontiere_floue: 3,
  contrat_ambigu: 3, menace_non_traitee: 3, comportement_ambigu: 3, exigence_sans_origine: 3,
  br_non_couverte: 3, fr_non_allouee: 3, fr_sans_story: 3,
  // 2 — hypothèse ou dépendance nommée
  hypothese_non_verifiee: 2, hypothese_technique: 2, dependance_inconnue: 2, dependance_externe: 2,
  capacite_inconnue: 2, mesure_non_planifiee: 2, cas_limite: 2, etat_erreur: 2, nfr_non_mesurable: 2,
  question_story: 2,
};
export const rank = zones => zones.filter(z => z.status === 'ouverte').map(z => {
  const touched = arr(z.related).length + (z.origin ? 1 : 0);
  const reasons = [z.blocking && 'bloquante', WEIGHT[z.type] >= 4 && z.type.replace(/_/g, ' '), touched > 1 && `${touched} éléments touchés`].filter(Boolean);
  return { ...z, score: 10 * (WEIGHT[z.type] ?? 1) + touched, reasons };
}).sort((a, b) => b.score - a.score || String(a.raised ?? a.id).localeCompare(String(b.raised ?? b.id)));
// Le classement est exporté pour être vérifié ; le reste ne tourne qu'en ligne de commande. Sans cette
// garde, importer `rank` exécutait le préambule et tuait le processus sur le message d'usage.
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const statePath = args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--max');
  if (!statePath) fail('Usage : node ask-five.mjs <état.yaml> [--max 5] [--json]', 2);
  const max = Number(args.includes('--max') ? args[args.indexOf('--max') + 1] : 5);
  const s = loadState(statePath);
  const ranked = rank(arr(s.shadow_zones));
  const top = ranked.slice(0, max);
  if (args.includes('--json')) { console.log(JSON.stringify(top, null, 2)); process.exit(0); }
  if (!top.length) { console.log('Aucune zone d\'ombre ouverte.'); process.exit(0); }
  console.log(table(['#', 'Zone', 'Question', 'Pourquoi maintenant', 'À qui'], top.map((z, i) => [i + 1, z.id, z.question ?? z.text ?? '', z.reasons.join(', ') || 'à lever', z.ask_to ?? z.owner ?? '—'])));
  // Ce script CLASSE, il ne compose pas un message. Dire « pose-les » faisait lire la sélection comme
  // un lot à envoyer d'un coup : l'agent vidait les cinq questions dans un seul tour, et les réponses
  // arrivaient mélangées quand elles arrivaient. Le nombre posé à la fois est dit ici, où il sera lu.
  console.log(`\n${top.length} question(s) retenue(s) sur ${ranked.length} ouverte(s) : c'est une sélection, pas un lot à poser. Pose-en deux ou trois à la fois, dans cet ordre, et attends les réponses avant les suivantes ; une question ouverte se pose seule. Réécris chaque réponse dans l'état : résolution de la zone d'ombre et mise à jour des éléments touchés.`);
}
