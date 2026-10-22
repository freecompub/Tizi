# 4–5. Vérifier et ouvrir la PR

## La porte

`node <chemin-du-skill>/scripts/pr-gate.mjs impl/<slug>/state.yaml --task TK-xxx` vérifie :

| Code | Vérification |
|---|---|
| C1 | La compréhension a été validée par un humain |
| C2 | Aucune question ouverte sur la tâche |
| C3 | Les suites unitaires et d'acceptation (et de contrat si la tâche touche une opération) sont vertes |
| C4 | Au moins un test a été vu en échec avant le premier vert (trace du TDD) |
| C5 | Chaque `EX` et `AC` de la tâche est référencé par un test |
| C6 | Le score de mutation atteint le seuil (si le mutation testing est configuré) |
| C7 | L'analyse de sécurité est propre (si elle est configurée) |
| C8 | La revue de code par agents est faite sur le diff actuel (si `review.required`) |
| C9 | Sur du code existant, l'existant est figé par des tests de caractérisation avant le premier test rouge |
| C10 | Les principes de la constitution du produit à contrôle automatique passent (si `.tizi/constitution.yaml` en compte) |

Lance d'abord `run-tests.mjs --suite mutation` (incrémental, sur le code modifié) et la suite de sécurité si elle existe. Un mutant survivant montre un comportement que les tests ne vérifient pas : ajoute le test qui le tue, ou explique à l'humain pourquoi ce mutant est sans importance.

## La PR

La porte génère `impl/<slug>/pr/TK-xxx.md` : la tâche, la story et son pourquoi, le résultat de la porte, la table des tests par identifiant, les ADR à respecter avec leur moyen de vérification, les mesures de sécurité, et la **checklist du relecteur**. Complète le résumé des changements. La PR cite l'identifiant de la tâche.

## La revue

La revue d'une PR d'agent est **toujours humaine**. Le relecteur suit la checklist et décide. Enregistre sa décision quand l'utilisateur la déclare, avec `node <chemin-du-skill>/scripts/record-pr.mjs impl/<slug>/state.yaml --task TK-xxx` et `--approuvee --par "<nom>"`, `--corrections --par "<nom>"` ou, une fois fusionnée, `--fusionnee`. L'heure de chaque décision sert à mesurer l'attente de relecture et les allers-retours. Les retours qui demandent du code repassent par le cycle rouge–vert, sur la même tâche.

Si la tâche ne peut pas avancer pour une raison extérieure (environnement, accès, données, réponse attendue), enregistre un blocage avec `block.mjs` au moment où il survient, et lève-le quand il cesse.
