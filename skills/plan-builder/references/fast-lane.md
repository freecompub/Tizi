# Voie rapide

Après une livraison, on découvre toujours des petites choses évidentes : un défaut, un libellé trompeur, une étape inutile. Les faire passer par une opportunité, une découverte et une demande de changement au PRD serait disproportionné. La voie rapide les fait entrer directement dans le backlog, avec une préparation allégée mais réelle.

Source : Jeff Patton, *User Story Mapping*, ch. 17 (« Don't sweat the small stuff »), reformulé.

## Ce qui y a droit

Une story passe en voie rapide (`lane: rapide`) seulement si **toutes** ces conditions sont remplies :

1. elle a une **origine observée** (`origin`) : un défaut signalé, un retour d'utilisateur, une observation, une métrique ;
2. elle est de taille **S ou M** ;
3. elle **n'introduit ni ne modifie aucune règle métier** et ne contredit aucun critère d'acceptation du PRD : elle corrige l'écart entre le produit et ce qui était convenu, ou améliore sans changer ce qui était convenu ;
4. aucune de ses tâches ne **modifie un contrat d'interface** (opération d'API ou événement) ;
5. elle ne touche pas à une **mesure de sécurité** ni à une donnée sensible.

Si l'une de ces conditions tombe, ce n'est pas une petite chose : la story suit le chemin normal, et un changement de comportement convenu passe par une demande de changement au PRD. `lint.mjs` signale une story de voie rapide qui ne respecte pas ces conditions (règle S60).

## Préparation allégée

Une story de voie rapide est prête quand elle a son origine, au moins un exemple (pour un défaut, la reproduction : étant donné, quand, alors attendu) et aucune question ouverte. Pas de rattachement à la story map ni à une FR. Elle passe quand même en atelier court avec un développeur et un testeur : la voie rapide raccourcit la préparation, pas la conversation.

## Corriger un défaut

Un défaut trié (`defect.mjs`, classement `defaut`) se corrige par une story en voie rapide :
- origine `{ type: defaut, ref: DEF-xxx }` ;
- rattachée à l'épopée de l'exigence que le défaut contredit (`attach_to: ACT-xx`), pour être regroupée et exportée avec elle (sinon S78) ;
- un exemple de reproduction : étant donné, quand, **alors attendu** — l'attendu recopié de l'exigence ;
- le lien enregistré dans le registre : `node scripts/defect.mjs <initiative> --corrige-par DEF-xxx US-yyy` (le script est aussi dans ce skill : la voie rapide n'exige pas que `test-builder` soit installé).

L'implémentation commence par le test de régression, étiqueté `@DEF-xxx` et avec l'identifiant de l'exigence, vu en échec. Le défaut est résolu quand ce test passe sur la version candidate ; personne ne le déclare résolu.

## Regrouper

Plusieurs petites choses dans la même zone du produit se regroupent en une story dont chacune est une puce. Un défaut mineur se règle souvent en même temps qu'un défaut majeur au même endroit.
