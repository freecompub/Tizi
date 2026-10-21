# Stratégie de développement : ouverture, milieu et fin de partie

Une release ne se construit pas brique après brique dans l'ordre où on la lit. Comme un peintre qui esquisse toute la composition avant d'affiner un détail, on construit d'abord une version qui traverse tout, puis on l'étoffe, puis on l'affine. On voit ainsi le produit fonctionner de bout en bout très tôt, on mesure l'avancement réel, et l'on peut s'arrêter à la date prévue avec un produit cohérent plutôt qu'avec un produit à moitié cuit.

Source : Jeff Patton, *User Story Mapping*, ch. 4 et 16 (stratégie en trois temps, Good–Better–Best), reformulé.

## Trois temps (`game`)

| Temps | Ce qu'on y met | Ce qu'on en apprend |
|---|---|---|
| `ouverture` | Les étapes essentielles qui traversent toute la release, le techniquement risqué, le walking skeleton. Pas d'options, pas de règles métier sophistiquées | Le produit marche de bout en bout ; les risques techniques sont exposés |
| `milieu` | Compléter : options, variantes, règles métier difficiles. Tester performance, montée en charge, utilisabilité | Les qualités difficiles à ajouter après coup |
| `fin` | Affiner : rendre efficace, agréable, intégrer les retours des utilisateurs | Ce qu'on ne voyait pas sur un prototype |

C'est **l'équipe** qui propose ce classement : elle voit le mieux où sont les risques. Le classement se fait story par story ; `lint.mjs` signale une story de milieu ou de fin planifiée avant des stories d'ouverture de la même release encore ouvertes (règle S61).

Les tranches ne sont pas des livraisons aux utilisateurs : ce sont des jalons internes, chacun avec ce qu'on veut en apprendre. Elles ne se calquent pas non plus sur les sprints.

## Amincir une story : bon, mieux, meilleur (`level`)

Pour une story trop grosse, demande avec l'équipe :

- **bon** : ce qui est à peine suffisant, que personne n'adorerait mais qui fonctionne ;
- **mieux** : ce qui le rendrait nettement plus utile ;
- **meilleur** : ce qui le rendrait remarquable. Ce ne sont pas des exigences : parfois une idée « meilleure » coûte presque rien.

Chaque niveau devient une story à part (`split_from` vers la story d'origine, `level`). Construis les versions « bon » sur toute la release avant de passer aux versions « mieux » : c'est la façon la plus sûre de tenir une date. Quand un sprint déborde, ramener une story de « mieux » à « bon » est le premier levier.
