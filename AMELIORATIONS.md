# Améliorations — registre des pistes

Ce fichier tient ce qui est **évoqué mais pas encore tranché**, et l'état de ce qui l'a été. Les
constats d'audit, eux, vivent dans `evals/audit/` avec leur preuve : un constat est une chose
observée, une piste est une intention. Les deux ne se rangent pas au même endroit.

Chaque ligne dit son état : **faite** (avec sa date et sa branche), **ouverte** (vérifiée, avec sa
preuve), **à trancher** (la question n'a pas de réponse décidée). Une piste ne devient une issue
qu'une fois décidée — sinon l'issue ne dit pas ce qu'il faut faire.

Dernière vérification de ce registre : **25 octobre 2026**, en exécutant les scripts — depuis le
24 octobre, sur un dossier réel autant que sur les exemples.

Le premier dossier passé dans Tizi par quelqu'un d'autre que ses auteurs est
[`freecompub/TestTizi`, branche `brd/cadrage-association`](https://github.com/freecompub/TestTizi/tree/brd%2Fcadrage-association) :
cadrage d'une association de soutien scolaire, Assess clos et Discover à mi-chemin sur deux
initiatives, 20,1 M jetons. Les pistes marquées « premier dossier réel » ci-dessous en viennent, et
chacune a été rejouée sur ce dépôt avant d'être écrite ici.

Ce qui est affirmé sans avoir été observé ne vit pas ici mais dans `INCERTITUDES.md` : une piste est
une intention, une incertitude est un fait qu'on croit sans l'avoir vu.

## Faites

| Piste | Date | Où |
|---|---|---|
| Garde-fou TDD : mode hors tâche tracé (`derogation.mjs`), borné dans le temps | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Tâche fusionnée libérée à la fusion, message qui dit quoi faire | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Index des sessions : un fichier par session, aucun écrivain partagé | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| `defect.mjs` commun à `plan-builder` et `test-builder` | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Signature Ed25519 de la surface exécutable de la constitution, ancre de confiance hors du dépôt | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Garde-fou : « état d'implémentation introuvable » au lieu de « compréhension non validée » | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| `next-step.mjs` signale les signalements à trier et propose `tizi-bug` | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Export de backlog périmé par la sprint review : nommé dans `review/<IT-n>/sprint-review.md`, pas seulement sur la console | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| `--generer-cle` écrit la clé publique en `<chemin>.pub` au lieu de l'afficher seulement | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| Rapport d'audit de la CI (`.tizi/ci-audit.md`) ignoré par Git : lancer l'audit ne salit plus l'arbre | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| Règle des questions : trois formes (choix fermé, arbitrage, élicitation), outil de questions de l'hôte, limites et repli, dans les sept skills et dans les trois points d'entrée à choix fermés | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| S81 : source attribuée à une partie prenante jamais entendue, ou à personne — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| S56 : décideur d'opportunité absent des parties prenantes ; le nom se demande, l'environnement n'est pas une réponse — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| `council_runs` garde les questions du council (retenues, écartées avec leur raison, réservées), pas seulement leur nombre — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| Extrait de session : réponse rattachée à sa question, écritures au shell visibles, enveloppes de l'hôte écartées, troncature annoncée, questions en texte libre nettoyées et datées de leur tour | 25 octobre 2026 | `correctifs-premier-test` |
| Condensé cherché sur le disque et non dans le champ d'index, que le hook écrit après le commit du tour | 25 octobre 2026 | `correctifs-premier-test` |

## Ouvert

- **Faire passer Tizi par Tizi.** `node skills/test-builder/scripts/ci-audit.mjs .` relève **2 points
  bloquants sur le dépôt de Tizi** : porte de PR non rejouée sur `pull_request`, preuves de release non
  produites. Tizi échoue son propre audit de CI. C'est le constat nº 12 de l'audit du 23 octobre, et
  celui que cet audit jugeait le plus important : ce serait le premier cas réel.
- **Les 23 règles jamais exercées.** Sur les 89 règles du catalogue (`scripts/lib/rules.mjs` : 81 `S` et 8 `L`), 23 ne
  sont déclenchées par aucun test ni aucune référence figée : `L04 S01 S02 S03 S06 S10 S15 S21 S25 S26
  S33 S34 S35 S37 S38 S39 S42 S46 S47 S49 S59 S62 S64`. Une règle jamais vue passer est une règle dont
  on ne sait pas si elle fonctionne.
- **Commiter un résultat d'eval**, même mauvais. `evals/results/` est ignoré par Git : les mesures
  n'existent que chez leur auteur. La dernière passe de déclenchement (24 octobre, 1 passe) donne un
  rappel de **0,00 pour `impl-builder`** — il ne s'est déclenché ni sur « Implémente la tâche TK-002 du
  plan en TDD », ni sur « Écris un test unitaire pour la fonction manquants() ». À rejouer sur
  plusieurs passes avant de corriger la description, puis à commiter.

### Premier dossier réel — ce qui reste

- **Le plafond des lentilles se lit comme un quota.** `agents/*-lens-critic.md` dit « 8 questions au
  maximum […] Zéro est une réponse valide ». Les cinq lentilles du council ont rendu **exactement
  40 questions** — 5 × 8, le plafond saturé par toutes — dont une seule retenue. Le mot est le même que
  celui qu'on a corrigé côté orchestrateur le 24 octobre (« le plafond n'est jamais un quota ») ; la
  correction, non. Manque aussi, et ce n'est prescrit nulle part : l'obligation pour chaque question de
  **citer l'élément visé**, sans quoi on ne peut pas écarter un doublon sans relire tout le dossier.
- **La porte de synthèse n'est jamais montrée avant qu'il soit trop tard.** `synthesis_check` existe
  dans l'état (fidélité, couverture, robustesse, actionnabilité, alignement) et c'est exactement
  l'indicateur « prêt pour la définition » qui manque en Discover. Mais `S65` ne la regarde que dans
  `['define', 'govern']` (`rules.mjs`) : la porte est contrôlée à l'arrivée, jamais affichée comme
  distance à parcourir. Sur le dossier réel, les cinq dimensions sont vides après une heure et demie de
  cadrage, et rien ne le dit. `status.mjs` pourrait les afficher en Discover, et calculer `couverture`
  (7 parties prenantes, 0 entendue).
- **Il manque un mot au vocabulaire d'Assess : « découpée ».** `phase-assess.md` prescrit le découpage
  d'un programme en plusieurs opportunités, et n'offre que `aller_plus_loin | jeter | a_apprendre |
  reportee` pour l'enregistrer. Sur le dossier réel, l'initiative mère porte `decision: jeter` avec la
  vérité en commentaire YAML ; `next-step` affiche « opportunité jetée », `list-opportunities` affiche
  « jeter ». La vérité machine du dépôt dit qu'on a abandonné. Manque `decoupee` + `split_into`.
- **`review-checklist.mjs` est un script sans appelant dans cinq skills sur sept.** Prescrit seulement
  dans `prd-builder` et `sad-builder` (`phase-govern.md`), alors que `S80` sanctionne « points de
  relecture non traités avant la gouvernance » dans le catalogue commun : le BRD a une règle qui ferme
  une porte sans qu'aucune de ses phases ne dise d'ouvrir le dossier. Même famille que le council du
  plan, trouvé le 24 octobre. Et le domaine `donnees-sante` existe : le dossier réel collecte
  vaccinations et allergies de mineurs.
- **Les écritures au shell restent partiellement invisibles.** L'extrait lit maintenant la redirection
  et `tee`, et dit combien de commandes de shell ont été lancées. Un `sed -i`, un script qui écrit, un
  éditeur en ligne de commande : la cible n'est pas devinable sans interpréter le shell, et on ne
  l'interprète pas. Le compte dit où regarder, il ne dit pas quoi.
- **`sources.type` n'a pas de valeur pour l'échange de cadrage avec le demandeur.** La source la plus
  fréquente en pratique — la conversation qui ouvre l'initiative — est typée `autre`, avec un
  commentaire pour dire ce qu'elle est. Sur le dossier réel, c'est la source unique de tout le cadrage.

## À trancher

- **Le plancher de Node.** `package.json` annonce `engines: >=18`, et `adopt.mjs` génère
  `node --test --test-reporter=junit` pour les projets Node, reporter qui n'existe pas sur toutes les
  versions couvertes par cette borne. Deux issues possibles, pas trois : remonter le plancher à la
  version qui porte le reporter, ou générer une commande compatible 18. Tant que ce n'est pas tranché,
  la configuration proposée peut être inexécutable sur la version minimale annoncée (constat nº 16).

- **Ce qui rend une zone d'ombre bloquante, en début de Discover.** Le critère existe
  (`phase-discover.md` : « on ne peut pas formuler correctement les objectifs ou les exigences sans la
  lever ») et il est vrai par construction au début de la phase, puisqu'aucun objectif n'est encore
  formulable : sur le dossier réel, **18 bloquantes sur 25** et **15 sur 19**. Conséquence mesurée dans
  `ask-five.mjs` : le terme `blocking ? 100 : 0` est constant sur 90 % de l'ensemble, donc il n'informe
  plus — c'est le poids du type qui ordonne encore (scores 153 · 134 · 134 · 133 · 133). Deux
  corrections possibles, pas trois : resserrer le critère (une zone ne bloque que si elle peut changer
  le périmètre ou empêcher le passage en Define), ou retirer `blocking` du score et le garder comme
  porte de sortie de phase. Il faudrait un second dossier réel pour trancher — sur un seul, on ne sait
  pas si 72 % de bloquantes est un défaut du critère ou l'état normal d'un cadrage sans aucune partie
  prenante entendue.

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
      exigence sans source confirmée signalée — la moitié basse est faite par `S81` (source attribuée à
      qui n'a pas été entendu) ; reste la dérogation nommée, qui est une décision, pas un contrôle
- [ ] Hook qui protège les listes de contrôle de relecture contre l'écriture par un agent (S80 vérifie
      aujourd'hui après coup ; un hook refuserait avant)
- [x] Lancer l'audit indépendant (`evals/audit/tizi-auditor.md`) en contexte vierge et le comparer à
      l'audit mécanique — fait le 23 octobre, à refaire après chaque série de correctifs
