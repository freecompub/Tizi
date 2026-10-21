# Tailles et affectation

## Tailles

| Taille | Repère | Poids (capacité) |
|---|---|---|
| S | Changement local, bien compris, sans nouvelle dépendance | 1 |
| M | Plusieurs fichiers d'un même élément, ou une nouvelle opération de contrat | 2 |
| L | Plusieurs éléments, ou une incertitude réelle | 3 |
| XL | Trop gros ou trop incertain pour une PR | 5 — à découper |

Les poids se règlent dans `settings.sizes`. Une taille est une estimation de l'équipe : tu proposes une taille de départ et tu dis pourquoi, l'équipe tranche.

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
