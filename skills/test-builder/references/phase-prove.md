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
| R9 | Les preuves viennent d'un passage de CI réussi sur le commit candidat, et chaque rapport utilisé est celui de ce passage (même empreinte). Une preuve locale ou d'une autre version n'est pas probante. Désactivable seulement avec une raison écrite (`settings.ci.required: false`, `settings.ci.reason`) |
| R8 | Rien de réalisé sans être prouvé : aucune FR, mesure de sécurité, vérification de NFR ou comportement à préserver dont les tâches sont faites alors que la preuve manque |

Il écrit `qa/<slug>/matrix.md` (lisible) et `matrix.yaml` (pour l'archive).

## Réalisé et prouvé

La matrice croise deux faits, chacun calculé depuis sa seule source :
- **la réalisation** : de chaque FR à ses stories, puis à leurs tâches, et à l'état de chaque tâche (fusionnée dans l'implémentation, ou terminée dans le plan) ;
- **la preuve** : les tests qui portent l'identifiant et passent.

Elle les présente par activité de la story map, la vue que comprennent les parties prenantes, puis liste trois **écarts** :

| Écart | Effet |
|---|---|
| **Réalisé mais non prouvé** | Ferme la porte (R8) : écrire le test, retirer de la release, ou déroger par décision nommée |
| **Non réalisé** (non commencé, sans tâche, bloqué) | Ne ferme pas la porte, mais appelle une décision explicite : reporter, ou retenir la livraison |
| **Prouvé sans être prévu** | Un test vert renvoie à une exigence qu'aucune story de la release ne porte : étiquette erronée, ou travail hors plan |

Réalisé ne veut pas dire prouvé : une tâche fusionnée montre qu'un code existe, pas que le comportement convenu fonctionne. L'état d'implémentation est lu dans `impl/<slug>/state.yaml`, ou au chemin donné par `settings.impl_state`.

## Décider

Présente la porte et la matrice. Une exigence non prouvée se corrige (test manquant, test en échec) ou devient une **dérogation** (`waivers`) avec raison et approbateur déclarés par l'utilisateur ; elle devient un risque suivi de la release. L'approbation de la release n'est enregistrée (`approvals`) que si l'utilisateur la déclare.

## Archiver les preuves

`node <chemin-du-skill>/scripts/freeze-evidence.mjs qa/<slug>/state.yaml` copie la matrice et tous les rapports collectés dans `qa/<slug>/evidence/<candidate>/`, avec un manifeste des empreintes SHA-256 de chaque fichier. L'archive ne se modifie plus : une nouvelle version candidate a sa propre archive.

## La CI elle-même

`node <chemin-du-skill>/scripts/ci-audit.mjs .` vérifie que la CI du dépôt fait ce qu'elle doit : porte de PR rejouée sur chaque pull request et exigée avant fusion, preuves de release produites sur le commit lui-même, permissions déclarées et minimales, pas de `pull_request_target`, actions épinglées. Il lit la protection de la branche principale en lecture seule ; sans droit, il la déclare non vérifiable au lieu de conclure. Rapport dans `.tizi/ci-audit.md`. À lancer à l'adoption de Tizi, puis à chaque changement des workflows.
