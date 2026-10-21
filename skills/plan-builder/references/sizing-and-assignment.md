# Tailles et affectation

## Tailles

| Taille | Repère | Poids (capacité) |
|---|---|---|
| S | Changement local, bien compris, sans nouvelle dépendance | 1 |
| M | Plusieurs fichiers d'un même élément, ou une nouvelle opération de contrat | 2 |
| L | Plusieurs éléments, ou une incertitude réelle | 3 |
| XL | Trop gros ou trop incertain pour une PR | 5 — à découper |

Les poids se règlent dans `settings.sizes`. Une taille est une estimation de l'équipe : tu proposes une taille de départ et tu dis pourquoi, l'équipe tranche.

## Quand les agents réalisent les tâches

Le temps de codage devient court et bon marché. Ce qui reste rare, et que la taille doit refléter, c'est :
- **l'attention humaine** : préparer la story, valider la compréhension, répondre aux questions, relire la PR ;
- **le risque d'allers-retours** : une tâche qui touche du code existant, plusieurs éléments ou des règles subtiles boucle davantage, et chaque boucle reprend de l'attention ;
- **l'attente** et les **blocages** (environnement, accès, données, réponses).

La taille se lit donc comme un **risque**. `render-plan.mjs` en calcule une à partir des données de la tâche (éléments, opérations de contrat, règles, code existant modifié, mesures de sécurité, comportements à préserver, spike) et la montre à côté de celle de l'équipe ; un écart de deux tailles ou plus est signalé (S74), à justifier dans un sens ou dans l'autre. Chaque tâche porte aussi une **attention humaine prévue**, en minutes, tirée de `settings.attention` puis, dès qu'il y a des mesures, de `settings.attention_by_size`. Avec `settings.attention_capacity`, la vérification signale une itération dont l'attention prévue dépasse ce que l'équipe peut donner (S75) : c'est la relecture qui limite le débit, pas les agents.

Ces chiffres se confrontent au réel par `measure.mjs` (phase Review), qui propose la calibration par taille.

**Découper une tâche ou une story XL** : par règle métier, par cas (nominal puis erreurs), par opération de contrat, par élément traversé, ou en isolant d'abord l'incertitude dans un spike.

## Agent ou humain

Propose `assignee_type: agent` seulement si toutes ces conditions sont remplies :

1. la taille ne dépasse pas `settings.agent_max_size` (M par défaut) ;
2. la story est prête : règles, exemples, aucune question ouverte ;
3. la tâche cite ses éléments et, le cas échéant, ses opérations de contrat ;
4. aucun ADR qu'elle touche n'est encore `proposé` ;
5. elle n'est pas un spike, et ne demande pas de décision d'architecture.

Sinon, `humain`. Une tâche de sécurité peut aller à un agent si ces conditions sont remplies, mais sa revue reste humaine. `lint.mjs` signale une affectation à un agent qui ne respecte pas ces conditions (règle S45).

## Fiche de contexte

Pour chaque tâche, `render-plan.mjs` génère `tasks/TK-xxx.md` : la story et ses FR, les critères `AC` et les exemples `EX`, les règles, les éléments et leur technologie, les opérations de contrat, les ADR à respecter (option retenue et moyen de confirmation), les mesures de sécurité, les vérifications de NFR, les dépendances et la Definition of Done. C'est ce que reçoit l'agent, ou ce que lit le développeur.
