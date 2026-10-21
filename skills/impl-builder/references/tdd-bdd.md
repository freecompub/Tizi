# 2–3. Rouge, vert, refactoriser

La tâche se construit en **double boucle** : la boucle externe part des scénarios d'acceptation (BDD), la boucle interne avance test unitaire par test unitaire (TDD).

## Boucle externe : acceptation (BDD)

1. Pour chaque exemple `EX` et critère `AC` de la tâche, écris le scénario Gherkin avec ses **étiquettes** : `@EX-004 @AC-001`. Reprends les valeurs concrètes de l'example mapping : pas de « dossier invalide », mais « un dossier sans justificatif de domicile ».
2. Si la tâche touche une opération de contrat (`OP`), écris le test de contrat correspondant (contrat piloté par le consommateur, ou validation contre le schéma OpenAPI ou AsyncAPI du squelette de la conception).
3. Lance `run-tests.mjs --suite acceptance --expect red`. Un scénario qui passe déjà ne prouve rien tant qu'on ne l'a pas vu échouer.

## Boucle interne : unitaire (TDD)

Pour faire passer un scénario :

1. **Rouge** : écris un seul test unitaire, le plus petit qui rapproche du scénario ; lance `run-tests.mjs --suite unit --expect red`.
2. **Vert** : écris le minimum de code de production pour le faire passer. Le hook ne l'autorise que si la dernière exécution est rouge, et seulement dans le périmètre de la tâche.
3. **Refactoriser** : sur du vert, ouvre une refactorisation (`tdd-phase.mjs refactor`), améliore sans changer le comportement, relance les tests : ils doivent rester verts.
4. Recommence jusqu'à ce que le scénario passe, puis passe au scénario suivant.

Les tests guident le design : un test difficile à écrire signale souvent un couplage à revoir.

## Ce que le hook bloque, et pourquoi

| Message | Signification | Que faire |
|---|---|---|
| aucune tâche en cours | Rien ne borne le travail | `start-task.mjs` |
| compréhension non validée | On coderait sur une interprétation | Reformuler, questionner, faire valider |
| hors du périmètre | Le fichier n'appartient pas aux éléments de la tâche | Si c'est nécessaire, c'est une question pour le plan ou la conception |
| contrat non prévu | La tâche ne cite aucune opération | Question de conception : s'arrêter |
| dernière exécution verte | Du code sans test qui le réclame | Écrire le test suivant, ou ouvrir une refactorisation |

## Limites connues

Le hook ne peut pas juger si un test est **pertinent** : un test trivial qui échoue débloque l'écriture. La refactorisation peut aussi servir à ajouter du code sans test. Ces contournements ne passent pas la porte : le mutation testing révèle le code que les tests ne vérifient pas, et la revue humaine voit le reste.
