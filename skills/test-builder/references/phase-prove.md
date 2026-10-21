# Phase Prove

**But** : établir la preuve, décider, archiver.

## La matrice et la porte

`node <chemin-du-skill>/scripts/release-matrix.mjs qa/<slug>/state.yaml` lit les rapports et calcule :

| Code | Condition de la porte |
|---|---|
| R1 | Toutes les suites collectées passent |
| R2 | Chaque exigence de la release (`EX`, `AC`, `NR`, `TH`) est prouvée par au moins un test qui passe, ou couverte par une dérogation nommée ; la part prouvée atteint `thresholds.requirements` |
| R3 | Chaque réponse à une NFR prévue en tests a une mesure qui atteint sa cible |
| R4 | Chaque parcours critique est couvert de bout en bout par un test qui passe |
| R5 | Les sessions exploratoires prévues sont faites, sans constat bloquant ouvert |
| R6 | Le score de mutation global atteint `thresholds.mutation` (si mesuré) |
| R7 | Les analyses de sécurité passent (si collectées) |

Il écrit `qa/<slug>/matrix.md` (lisible) et `matrix.yaml` (pour l'archive).

## Décider

Présente la porte et la matrice. Une exigence non prouvée se corrige (test manquant, test en échec) ou devient une **dérogation** (`waivers`) avec raison et approbateur déclarés par l'utilisateur ; elle devient un risque suivi de la release. L'approbation de la release n'est enregistrée (`approvals`) que si l'utilisateur la déclare.

## Archiver les preuves

`node <chemin-du-skill>/scripts/freeze-evidence.mjs qa/<slug>/state.yaml` copie la matrice et tous les rapports collectés dans `qa/<slug>/evidence/<candidate>/`, avec un manifeste des empreintes SHA-256 de chaque fichier. L'archive ne se modifie plus : une nouvelle version candidate a sa propre archive.
