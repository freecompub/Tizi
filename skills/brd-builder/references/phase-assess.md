# Phase Assess (évaluer l'opportunité)

**But** : décider, en une conversation courte, si une idée mérite qu'on investisse dans sa découverte. Ce n'est pas encore le cadrage du BRD : c'est la porte d'entrée. L'issue peut être de **jeter** l'idée, et c'est un bon résultat.

Source : Jeff Patton, *User Story Mapping*, ch. 11 et 13 (opportunités, Opportunity Canvas inspiré de Marty Cagan et du Business Model Canvas), reformulé.

## Pourquoi cette phase

Il y a toujours plus d'idées que de temps pour les construire. Une idée qui entre directement en découverte consomme des entretiens, des ateliers et des décisions avant que quiconque ait demandé si elle valait la peine. Si l'on ne jette pas plus d'idées qu'on n'en garde, on trie mal.

## Taille d'une opportunité

Une initiative du SDLC correspond à **une opportunité** de taille raisonnable : un nouveau produit, mais plus souvent une fonctionnalité ou une amélioration d'un produit existant. Si l'idée est un programme entier, propose de la découper en plusieurs opportunités, chacune suivant sa propre chaîne BRD → PRD → conception → plan. Une chaîne courte, qui livre et apprend, vaut mieux qu'une longue séquence de documents pour tout un produit.

## D'abord : la demande est-elle figée ou fluide ?

Note la demande initiale **mot pour mot** (`opportunity.request.verbatim`), puis classe-la avec l'utilisateur (approche reprise du design thinking de hve-core, méthode 1) :

- **figée** : elle nomme une solution précise dans un contexte précis (« un tableau de bord qualité pour l'atelier », « une appli pour les agents »). Elle masque souvent le vrai problème. Note la solution présumée (`presumed_solution`), reconnais le travail qu'elle reflète, puis remonte au problème : qu'est-ce qui motive cette demande ? que se passerait-il sans ? qu'a-t-on déjà essayé ?
- **fluide** : elle exprime une aspiration sans problème ni solution définis (« utiliser l'IA », « moderniser l'accueil »). Il faut d'abord la focaliser : quel résultat métier, mesuré comment, pour qui ?

En cas de doute, traite-la comme figée et cherche le problème qui la motive. Une demande figée bien remontée produit souvent un problème différent de la demande : c'est le signe que le cadrage a fonctionné.

## La conversation : le canevas d'opportunité

Remplis `opportunity.canvas` avec l'utilisateur, par lots de 2 à 3 questions. Ce n'est pas un formulaire : une réponse inconnue s'écrit comme hypothèse, et on avance.

| # | Case | Question |
|---|---|---|
| 1 | Problèmes ou idées de solution | Quel problème veut-on résoudre ? Si l'on part d'une idée de solution, quel problème résout-elle ? |
| 2 | Utilisateurs et clients | Qui a ce problème ? Qui achète, qui utilise ? Pas « tout le monde » |
| 3 | Solutions aujourd'hui | Comment font-ils aujourd'hui : outil concurrent, contournement, rien ? |
| 4 | Valeur pour l'utilisateur | Que feront-ils autrement, et qu'y gagneront-ils ? |
| 5 | Mesures côté utilisateur | Quel comportement observable dira qu'ils l'adoptent et y tiennent ? |
| 6 | Adoption | Comment le découvriront-ils et l'adopteront-ils ? |
| 7 | Problème de l'organisation | Quel problème de l'organisation cela résout-il ? Est-ce aligné avec la stratégie ? |
| 8 | Mesures côté organisation | Quels indicateurs bougeront si cela réussit ? |
| 9 | Budget | Combien est-on prêt à investir pour découvrir, construire et affiner ? Un ordre de grandeur suffit : jours, semaines, mois |

Lecture : de gauche à droite on va du présent vers le futur ; de haut en bas, des besoins des utilisateurs à ceux de l'organisation.

Note les **plus grandes hypothèses** dans `hypotheses` (`H-xxx`) : ce qui, si c'est faux, rend l'opportunité sans objet.

## La première source

L'échange qui ouvre l'initiative est une source : enregistre-le en `SRC-001`, type `cadrage`, au nom de
**la personne avec qui tu parles** — pas de celle dont elle rapporte les besoins. C'est fréquent qu'un
demandeur porte la demande d'un sponsor qu'il n'est pas : dans ce cas le demandeur est une partie
prenante à part entière, le sponsor reste `à interroger`, et tout ce qui vient de là est **rapporté**,
jamais observé. `lint.mjs` le signale (S81) si la source est attribuée à quelqu'un que l'état déclare
ne pas avoir entendu.

## La décision

Propose une décision avec sa raison, puis fais-la rendre par la personne habilitée (le sponsor ou le product owner). Tu ne décides pas.

| `decision` | Signification | Suite |
|---|---|---|
| `aller_plus_loin` | Le problème mérite une découverte | Passer en Discover. Ce n'est pas un engagement à construire |
| `jeter` | Pas assez d'espoir d'outcome, ou hors stratégie | Clore l'initiative (`phase: close`). Associer ceux qui portaient l'idée à la conversation |
| `a_apprendre` | Information insuffisante pour décider | Lister ce qu'il faut apprendre (`to_learn`) et qui s'en charge ; revenir ensuite |
| `reportee` | Pertinente, mais pas maintenant | Reste dans le portefeuille des opportunités |

Même quand l'idée est imposée (une feuille de route décidée ailleurs), tiens la conversation : la décision sera `aller_plus_loin`, mais le problème, les utilisateurs et le bénéfice attendu seront partagés. Si les décideurs ne sont pas disponibles, pose des hypothèses et soumets-les leur.

## Portefeuille d'opportunités

`scripts/list-opportunities.mjs` liste toutes les initiatives `brd/*/state.yaml` avec leur problème, leur budget, leur décision et leur phase. C'est le backlog d'opportunités.

## Fin de la phase

Quand la décision est `aller_plus_loin` et déclarée par l'utilisateur, passe `phase: discover`. Le canevas sert de point de départ au cadrage : ne repose pas les questions déjà répondues.
