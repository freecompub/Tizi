# Phase Schedule

**But** : découper les stories prêtes en tâches d'une PR, ordonner par les dépendances, estimer, affecter à un humain ou à un agent, puis remplir une itération ou la file « prêt » du flux.

## 1. Tâches (`TK-xxx`)

1. Pour chaque story prête, propose les tâches à partir des éléments C4 qu'elle touche (ceux qui portent ses FR dans la conception) et des contrats concernés. Une tâche :
   - correspond à **une PR** relisible : un changement cohérent, testé, qui laisse la branche principale déployable ;
   - cite les éléments, opérations, mesures de sécurité (`TH`) et vérifications (`NR`) qu'elle réalise ;
   - a un type : `dev`, `spike`, `securite`, `verification`, `migration`, `doc`.
2. Les mesures de sécurité et les vérifications de NFR du handoff de la conception, ainsi que les **exigences de transition** de la release (formation, conduite du changement, reprise de données…), doivent toutes trouver une tâche dans la release ; sinon, zone `mesure_non_planifiee`. Une tâche de transition a le type `transition` et cite ses `TR-xx`.
3. Une tâche XL se découpe (`references/sizing-and-assignment.md`).

## 2. Dépendances

1. Propose les dépendances (`depends_on`) à partir de la conception : le fournisseur d'un contrat avant son consommateur, le stockage avant ce qui l'utilise, le spike avant ce qui en dépend.
2. `render-plan.mjs` dessine le graphe et signale les cycles ; un cycle se casse en découpant une tâche.

## 3. Tailles et affectation

1. Fais estimer chaque tâche en S, M, L ou XL. L'équipe estime ; tu proposes une taille de départ en expliquant pourquoi.
2. Propose l'affectation `agent` ou `humain` selon les critères de `references/sizing-and-assignment.md`. Une tâche confiée à un agent doit avoir une fiche de contexte complète : `render-plan.mjs` la génère dans `tasks/TK-xxx.md`.

## 4. Itération ou flux

Suis `references/cadence.md`.

- **Sprint** : propose un objectif d'itération et un contenu dans la capacité (somme des poids de taille). Une tâche ne peut pas passer avant une tâche dont elle dépend, et les stories d'ouverture passent avant celles de milieu et de fin de partie. Après les premières revues, pars de la **capacité suggérée** (`render-plan.mjs`), qui compte la relecture humaine des tâches d'agents. Si tout ne rentre pas, ramène d'abord une story de « mieux » à « bon ».
- **Flux** : propose l'ordre de la file « prêt » et un réapprovisionnement de la taille convenue, sous la limite d'encours.

## Fin de la phase

**Propose** le passage à Govern quand l'itération ou le réapprovisionnement est rempli de tâches validées, ordonnées, estimées et affectées, sans cycle ni dépassement de capacité, et que `lint.mjs` a été lancé. Si l'utilisateur accepte, passe `phase: govern`.
