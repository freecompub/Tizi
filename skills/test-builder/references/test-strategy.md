# Stratégie de test : qui teste quoi, et quand

## La forme

Beaucoup de tests unitaires, rapides et écrits avant le code ; des scénarios d'acceptation pour chaque exemple et critère convenus ; des tests de contrat aux frontières entre composants ; **peu** de tests de bout en bout, parce qu'ils sont lents et fragiles ; des sessions exploratoires pour ce que l'automatisation ne voit pas ; des tests non fonctionnels pour les qualités ; et le mutation testing pour juger la qualité des tests eux-mêmes plutôt que la seule couverture de code.

## Étape 5 ou étape 6

Le partage suit une règle simple :
- **étape 5** (`impl-builder`) : ce qui s'écrit avec le code d'une tâche et s'exécute à chaque PR ;
- **étape 6** (ici) : ce qui demande la release intégrée, un environnement complet, ou du jugement humain, et ce qui sert de preuve pour une version.

| Type | Étape 5 | Étape 6 | Source amont |
|---|---|---|---|
| Unitaires (TDD) | Écrits avant le code | Non-régression | Fiche de contexte |
| Acceptation (BDD) | Scénarios `EX`/`AC` de la tâche | Suite complète, matrice | Example mapping, PRD |
| Contrat et intégration | Contrats des opérations touchées | Intégration réelle entre composants (par exemple app iOS et API Next.js) | Contrats de la conception |
| Bout en bout | — | Parcours critiques | Parcours du PRD |
| Exploratoires | — | Sessions avec charte | Risques : menaces, zones d'ombre assumées, hypothèses |
| Non fonctionnels | SAST, dépendances, règles d'accessibilité automatiques | Charge, endurance, DAST, audit d'accessibilité, navigateurs et langues | Réponses aux NFR, mesures de sécurité |
| Mutation | Incrémental | Global | — |

## La traçabilité par étiquettes

Chaque test qui prouve une exigence porte son identifiant : étiquette Gherkin (`@EX-004 @AC-001`) ou identifiant dans le nom du test (`[NR-01] p95 de la transmission`). Les étiquettes sont posées à l'étape 5 ; la matrice de l'étape 6 les lit dans les rapports. Les identifiants reconnus : `AC`, `EX`, `NR`, `TH`, `PJ`, `FR`.

Les parcours de bout en bout portent l'identifiant du parcours du PRD (`@PJ-01`) ; les tests de sécurité celui de la menace (`@TH-001`) ; les tests de performance celui de la réponse à la NFR (`@NR-01`) quand ils produisent un rapport de tests, sinon le résultat est saisi dans `nfr_results`.
