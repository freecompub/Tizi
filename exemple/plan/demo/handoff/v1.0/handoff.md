# Handoff plan → implémentation — Dossiers complets (plan v1.0)

Généré le 2026-10-23. Les tâches sont dans l'ordre d'exécution : une tâche ne démarre que lorsque ses dépendances sont terminées. Chaque PR cite l'identifiant de sa tâche.

| Rang | Tâche | Type | Taille | Affectation | Dépend de | Attend hors engagement | Fiche de contexte |
|---|---|---|---|---|---|---|---|
| 1 | TK-002 — Contrôle de complétude du dossier | dev | M | agent | — | — | versions/v1.0/tasks/TK-002.md |
| 2 | TK-003 — Sessions courtes et MFA | securite | M | humain | TK-002 | — | versions/v1.0/tasks/TK-003.md |

## Tâches retenues (story non prête)

| Tâche | Story | Ce qui manque |
|---|---|---|
| TK-004 | US-002 | 1 règle(s) sans exemple ; 1 question(s) ouverte(s) |

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| FR de la release couvertes par une story | 2/2 | 100 % | 100 % | atteint |
| Mesures de sécurité planifiées | 1/1 | 100 % | 100 % | atteint |
| Vérifications de NFR (étape tests) planifiées | 1/1 | 100 % | 100 % | atteint |
| Stories prêtes | 2/5 | 40 % | 0 % | atteint |

Empreinte SHA-256 de handoff.yaml : `da538e93727b8cca40257aa4415aee8a657ba4a245b2acc2720fa83729f02157`. L'étape suivante la vérifie avec verify-handoff.mjs avant d'ingérer.
