# Example mapping

L'example mapping est une technique de Matt Wynne (Cucumber, 2015), reformulée ici. Une courte séance par story (25 minutes environ), avec au moins trois regards : le métier, le développement, le test.

## Les quatre cartes

| Carte | Contenu | Dans l'état |
|---|---|---|
| Jaune | La story | `stories[]` |
| Bleue | Une règle que la story doit respecter | `example_map.rules[]`, avec `ref` vers une `RG`, une FR ou un `AC` amont |
| Verte | Un exemple concret d'une règle, avec des valeurs | `examples[]` (`EX-xxx`), Given / When / Then |
| Rouge | Une question sans réponse | zone d'ombre `question_story`, citée dans `example_map.questions` |

## Ce qui est déjà en amont

La séance ne part pas de zéro. Les règles viennent du BRD (`RG`) et du PRD (FR en EARS) ; les premiers exemples viennent des critères `AC` du PRD. La séance **retrouve** les règles qui s'appliquent à la story et **affine** les exemples à son échelle. Elle ne crée pas de règle : une règle absente de l'amont remonte en demande de changement.

## Story prête (Definition of Ready calculée)

`render-plan.mjs` calcule la préparation de chaque story. Elle est **prête** si et seulement si :

1. elle a au moins une FR et une tâche de story map ;
2. la séance a eu lieu (`example_map.session.date`) ;
3. elle a au moins une règle, et chaque règle a au moins un exemple ;
4. aucune zone d'ombre ouverte ne la concerne ;
5. aucune demande de changement en attente ne la concerne ;
6. chaque spike dont elle dépend est `terminé` ;
7. elle n'est pas XL.

Le nombre de règles au-delà de `settings.max_rules_per_story` n'empêche pas la préparation mais est signalé : la story est probablement à scinder.

Les critères écrits de `definition_of_ready` dans l'état restent lisibles par l'équipe ; ce sont les mêmes, en langage courant.

## Exemples

- Valeurs concrètes : « un dossier sans justificatif de domicile », pas « un dossier invalide ».
- Un exemple par cas : nominal, limite, refus.
- Les exemples deviennent les tests d'acceptation de la story (étape 6) ; la fiche de contexte de chaque tâche les reprend.
