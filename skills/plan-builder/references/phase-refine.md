# Phase Refine

**But** : rendre chaque story prête par un example mapping. Une story prête a ses règles, un exemple au moins par règle, aucune question ouverte, et ses spikes terminés. La préparation est **calculée** par `render-plan.mjs`, jamais déclarée.

Suis `references/example-mapping.md`.

## Déroulé, story par story

Commence par le walking skeleton, puis suis l'ordre de la story map.

1. **Prépare la séance** : la story (jaune), les règles déjà connues en amont (bleues : les `RG` de ses FR, les FR elles-mêmes en EARS), les critères `AC` du PRD comme premiers exemples (verts), les zones d'ombre ouvertes (rouges). Propose de faire la séance avec au moins une personne du métier, une du développement et une du test.
2. **Pendant la séance** (l'utilisateur te rapporte le résultat, ou tu l'animes avec lui) : pour chaque règle, des exemples concrets avec des valeurs ; chaque doute devient une carte rouge, enregistrée comme zone `question_story`.
3. **Après** : enregistre `example_map` et les exemples `EX-xxx` (Given / When / Then). Relie chaque exemple à l'`AC` qu'il illustre, quand il y en a un. Fais aussi convenir **comment la story sera démontrée en revue** (`demo`) : la question révèle souvent un manque, par exemple des données réalistes à préparer.
4. **Ce qui remonte en amont** :
   - une règle qui n'existe ni dans les `RG` ni dans les FR → demande de changement au BRD ou au PRD ; la story reste non prête tant que la règle n'est pas tranchée ;
   - un exemple qui change le comportement observable décrit par un `AC` → demande de changement au PRD ;
   - un exemple qui contredit un ADR ou un contrat → demande de changement à la conception.
5. **Lis les signaux** :
   - plus de règles que `settings.max_rules_per_story` → propose de scinder la story (`split_from`) ;
   - beaucoup de cartes rouges → la story n'est pas comprise : elle ne part pas, et les questions sont adressées à qui peut y répondre ;
   - une règle sans exemple → on ne saura pas la tester.
6. Régénère le plan : la colonne « prête » se met à jour.

## Fin de la phase

**Propose** le passage à Schedule quand assez de stories sont prêtes pour remplir la prochaine itération (sprint) ou le prochain réapprovisionnement (flux). Les autres restent en Refine pour la suite. Si l'utilisateur accepte, passe `phase: schedule`.
