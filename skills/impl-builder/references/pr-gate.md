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

Lance d'abord `run-tests.mjs --suite mutation` (incrémental, sur le code modifié) et la suite de sécurité si elle existe. Un mutant survivant montre un comportement que les tests ne vérifient pas : ajoute le test qui le tue, ou explique à l'humain pourquoi ce mutant est sans importance.

## La PR

La porte génère `impl/<slug>/pr/TK-xxx.md` : la tâche, la story et son pourquoi, le résultat de la porte, la table des tests par identifiant, les ADR à respecter avec leur moyen de vérification, les mesures de sécurité, et la **checklist du relecteur**. Complète le résumé des changements. La PR cite l'identifiant de la tâche.

## La revue

La revue d'une PR d'agent est **toujours humaine**. Le relecteur suit la checklist et décide. Quand l'utilisateur déclare l'approbation, renseigne `pr.approved_by` et la date, et passe la tâche en `en_revue`, puis en `fusionnee` une fois fusionnée. Les retours de revue qui demandent du code repassent par le cycle rouge–vert, sur la même tâche.
