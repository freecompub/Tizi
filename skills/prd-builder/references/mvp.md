# Releases et MVP

Une release est une tranche horizontale de la story map. La première (MVP) est la plus petite tranche qui permet d'apprendre quelque chose d'important tout en apportant une valeur réelle.

## Critères d'un MVP

Une tranche est un MVP si les six critères tiennent :

1. **Hypothèse explicite** : elle teste l'hypothèse la plus risquée du produit (`learning_goal`). Une tranche qui ne teste rien est une release, pas un MVP.
2. **Valeur de bout en bout** : un vrai utilisateur peut accomplir au moins un parcours complet (`value`), même étroit.
3. **Périmètre minimal** : chaque tâche incluse est nécessaire à la valeur ou au test de l'hypothèse.
4. **Signal mesurable** : on sait à l'avance ce qui dira si l'hypothèse tient (`signal`).
5. **Impact contenu** : pilote, cohorte limitée, option activable… un échec coûte peu (`containment`).
6. **Exclusions délibérées** : chaque capacité écartée est listée avec sa raison.

Si le critère 1 ou 3 échoue, propose de redécouper avant de spécifier.

**Une tâche gardée malgré le critère 3 est une décision de périmètre, et elle a un décideur.** Au
deuxième dossier réel, une tâche ne servait ni la valeur de bout en bout ni le test de l'hypothèse, et
a été maintenue dans le MVP « sous réserve » parce qu'elle touchait 135 familles sur 150 — la réserve
écrite dans un champ libre de la release, que rien ne lit et qu'aucun point d'étape n'affiche. Ce
n'est pas une note : c'est une **zone d'ombre** `perimetre_non_tranche`, adressée au décideur du
périmètre (`decision_rights`), qui dit la tâche, le critère qu'elle manque et ce qui plaide pour
qu'elle reste. Tant qu'elle est ouverte, le MVP est proposé, pas arrêté.

## Découpage

- Commence par la « colonne vertébrale » : la version la plus simple de chaque activité nécessaire au parcours principal.
- Repousse en release suivante les variantes, les cas rares, les optimisations et les confort d'usage, sauf s'ils conditionnent l'hypothèse.
- Les exigences réglementaires et de sécurité indispensables ne se repoussent pas : elles font partie de la colonne vertébrale.

Références : E. Ries, *The Lean Startup* ; J. Patton, *User Story Mapping* ; M. Cagan, *Inspired*.
