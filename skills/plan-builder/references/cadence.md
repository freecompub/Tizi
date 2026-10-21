# Cadence : sprint ou flux

Choisie par projet dans `settings.cadence`. Le reste du plan (stories, préparation, tâches, dépendances) est identique.

## Sprint (`sprint`)

- Itérations à durée fixe (`settings.sprint.length_days`) avec un **objectif** en une phrase.
- **Capacité** : somme des poids de taille que l'équipe peut absorber (`iterations[].capacity`, par défaut `settings.sprint.capacity`). Le plan signale un dépassement (règle S48).
- Une tâche n'est placée dans une itération que si les tâches dont elle dépend sont dans la même itération (plus tôt dans l'ordre) ou dans une itération précédente.
- **Gate** : l'engagement de l'équipe sur le contenu de l'itération.

## Flux (`flux`)

- Pas d'itération : une file « prêt » ordonnée (`tasks[].order`) et une **limite d'encours** (`settings.flow.wip_limit`) sur les tâches `en_cours`.
- **Réapprovisionnement** (`RP-n`) : l'équipe tire les tâches suivantes dans la file, par lots de `settings.flow.replenish_batch`.
- Une tâche ne passe pas devant une tâche dont elle dépend dans la file.
- **Gate** : l'engagement de l'équipe sur chaque réapprovisionnement.

## Choisir

Le sprint convient quand le métier veut des rendez-vous réguliers et un objectif par période. Le flux convient au travail continu, à la maintenance, ou quand beaucoup de tâches vont à des agents et que le débit compte plus que la période.
