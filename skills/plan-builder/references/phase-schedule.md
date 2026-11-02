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

## 5. Council

Avant l'engagement, et une fois l'itération ou le réapprovisionnement rempli, **lance** un council en mode `planification` (`references/council.md`) : stories trop grosses, dépendances oubliées, tâches mal affectées à des agents, mesures non planifiées, capacité irréaliste. Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. Ses questions deviennent des zones d'ombre et se posent **comme les autres**, classées par impact : l'utilisateur n'a jamais à trier une liste de questions sur la méthode, et ni le council, ni ses lentilles, ni son mode n'apparaissent dans ce que tu lui écris.

C'est le dernier moment où une story trop grosse coûte encore peu : après l'engagement, elle coûte une itération.

## Retour ponctuel en arrière

Si une zone d'ombre bloquante apparaît (contradiction, valeur actuelle inconnue, profil manquant…) :

1. Enregistre-la et explique pourquoi elle bloque.
2. Propose un retour **ciblé sur cette seule zone d'ombre** : préparer l'entretien ou la question qui la lèvera, puis revenir à l'étape en cours. La phase ne change pas.
3. **Écris le retour dans `phase_log`**, avec `kind: retour` : la phase d'où l'on part, celle où l'on retourne, la date, qui a décidé, la zone d'ombre qui l'a provoqué et la raison. Un retour est un passage comme un autre, et il s'écrit dans le même journal que les portes — sinon le parcours réel d'un dossier qui a reculé se relit comme un parcours tout droit. `status.mjs` l'affiche sous la ligne des phases.

---

## Fin de la phase

**Propose** le passage à Govern, sans le décider, quand :

- le cycle porte des tâches, et chacune est validée, ordonnée, estimée et affectée ;
- aucune dépendance circulaire entre tâches, aucun dépassement de capacité ;
- l'engagement est déclaré par une personne nommée ;
- le council en mode planification a été passé, et ses questions enregistrées ;
- `lint.mjs` a été lancé ;
- chaque zone d'ombre est `levée` ou `assumée`, et chaque `assumée` est emportée par un risque ou une hypothèse qui la nomme : une zone encore `ouverte` à la porte est une question que plus personne ne posera ;
- aucun élément n'est resté `proposé` : ce que personne n'a tranché ne franchit pas la porte.

Lance `status.mjs` : il compte les conditions de cette porte qui **se calculent**, et nomme ce qui manque — identifiants compris. Celles qui se jugent n'y sont pas, et le compte dit « n tenues sur m mesurées » : ce n'est pas « la porte est franchie ». Présente-le, liste ce qui manque — puis **pose la question dans tous les cas**, avec l'outil : passer la phase, ou s'arrêter là. S'il manque des conditions, les deux options sont « s'arrêter là » et « continuer sur ce qui manque », jamais « passer la porte » (`references/questions.md`). Si l'utilisateur accepte, passe `phase: govern`.

**Et le passage lui-même s'écrit.** Dès que l'utilisateur a tranché, ajoute l'entrée à `phase_log` : la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte tel que `status.mjs` l'a dit, et chaque condition franchie par dérogation avec sa raison. Sans cette entrée, `status.mjs` affiche « passage sans trace » et le document rendu ne peut pas dire au relecteur quand la phase a été close ni par qui (S100, S101).
