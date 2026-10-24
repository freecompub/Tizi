# Améliorations — registre des pistes

Ce fichier tient ce qui est **évoqué mais pas encore tranché**, et l'état de ce qui l'a été. Les
constats d'audit, eux, vivent dans `evals/audit/` avec leur preuve : un constat est une chose
observée, une piste est une intention. Les deux ne se rangent pas au même endroit.

Chaque ligne dit son état : **fait** (avec la branche ou le commit), **ouvert** (vérifié, avec sa
preuve), **à trancher** (la question n'a pas de réponse décidée). Une piste ne devient une issue
qu'une fois décidée — sinon l'issue ne dit pas ce qu'il faut faire.

Dernière vérification de ce registre : **24 octobre 2026**, en exécutant les scripts.

## Fait

| Piste | Où |
|---|---|
| Garde-fou TDD : mode hors tâche tracé (`derogation.mjs`), borné dans le temps | `audit/correctifs-2026-10-23` |
| Tâche fusionnée libérée à la fusion, message qui dit quoi faire | `audit/correctifs-2026-10-23` |
| Index des sessions : un fichier par session, aucun écrivain partagé | `audit/correctifs-2026-10-23` |
| `defect.mjs` commun à `plan-builder` et `test-builder` | `audit/correctifs-2026-10-23` |
| Signature Ed25519 de la surface exécutable de la constitution, ancre de confiance hors du dépôt | `audit/correctifs-2026-10-23` |
| Garde-fou : « état d'implémentation introuvable » au lieu de « compréhension non validée » | `audit/correctifs-2026-10-23` |
| `next-step.mjs` signale les signalements à trier et propose `tizi-bug` | `audit/correctifs-2026-10-23` |
| Export de backlog périmé par la sprint review : nommé dans `review/<IT-n>/sprint-review.md`, pas seulement sur la console | `audit/correctifs-2026-10-24` |
| `--generer-cle` écrit la clé publique en `<chemin>.pub` au lieu de l'afficher seulement | `audit/correctifs-2026-10-24` |
| Rapport d'audit de la CI (`.tizi/ci-audit.md`) ignoré par Git : lancer l'audit ne salit plus l'arbre | `audit/correctifs-2026-10-24` |
| Posture des questions : les trois formes, dans les sept skills | `audit/correctifs-2026-10-24` |

## Ouvert

- **Faire passer Tizi par Tizi.** `node skills/test-builder/scripts/ci-audit.mjs .` relève **2 points
  bloquants sur le dépôt de Tizi** : porte de PR non rejouée sur `pull_request`, preuves de release non
  produites. Tizi échoue son propre audit de CI. C'est le constat nº 12 de l'audit du 23 octobre, et
  celui que cet audit jugeait le plus important : ce serait le premier cas réel.
- **Les 23 règles jamais exercées.** Sur les 86 règles du catalogue (`scripts/lib/rules.mjs`), 23 ne
  sont déclenchées par aucun test ni aucune référence figée : `L04 S01 S02 S03 S06 S10 S15 S21 S25 S26
  S33 S34 S35 S37 S38 S39 S42 S46 S47 S49 S59 S62 S64`. Une règle jamais vue passer est une règle dont
  on ne sait pas si elle fonctionne.
- **Commiter un résultat d'eval**, même mauvais. `evals/results/` est ignoré par Git : les mesures
  n'existent que chez leur auteur. La dernière passe de déclenchement (24 octobre, 1 passe) donne un
  rappel de **0,00 pour `impl-builder`** — il ne s'est déclenché ni sur « Implémente la tâche TK-002 du
  plan en TDD », ni sur « Écris un test unitaire pour la fonction manquants() ». À rejouer sur
  plusieurs passes avant de corriger la description, puis à commiter.

## À trancher

- **Le plancher de Node.** `package.json` annonce `engines: >=18`, et `adopt.mjs` génère
  `node --test --test-reporter=junit` pour les projets Node, reporter qui n'existe pas sur toutes les
  versions couvertes par cette borne. Deux issues possibles, pas trois : remonter le plancher à la
  version qui porte le reporter, ou générer une commande compatible 18. Tant que ce n'est pas tranché,
  la configuration proposée peut être inexécutable sur la version minimale annoncée (constat nº 16).
- **Points d'entrée et posture.** La posture des questions a été ajoutée aux skills. Elle n'a **pas**
  été ajoutée aux points d'entrée, parce que `entrypoints/entrypoints.yaml` l'interdit en propres
  termes : « Ces points d'entrée sont des coquilles : tout le savoir reste dans les skills. N'y ajoute
  aucune règle de méthode. » À trancher : garder l'invariant, ou l'assouplir et dire pourquoi.

## Pistes non tranchées

Chacune deviendra une issue à part une fois décidée.

- [ ] Commande `trace` : chaîne complète d'un identifiant, et mode « impact » pour une demande de
      changement ; lien règle métier → NFR
- [ ] Architecture de référence du produit, nourrie par chaque initiative livrée
- [ ] Référence du produit consolidée à chaque release ; notes de version générées ; documentation
      utilisateur dans la Definition of Done
- [ ] Grille de qualité ISO 29148 pour le BRD et le PRD (phase 2 du contrôle formel : le catalogue
      existant passe en mode bloquant, la grille s'y ajoute, et un autre modèle que le rédacteur
      l'applique)
- [ ] Parties prenantes : dérogation nommée pour une partie prenante à impliquer jamais entendue ;
      exigence sans source confirmée signalée
- [ ] Hook qui protège les listes de contrôle de relecture contre l'écriture par un agent (S80 vérifie
      aujourd'hui après coup ; un hook refuserait avant)
- [x] Lancer l'audit indépendant (`evals/audit/tizi-auditor.md`) en contexte vierge et le comparer à
      l'audit mécanique — fait le 23 octobre, à refaire après chaque série de correctifs
