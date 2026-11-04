# Phase Slice

**But** : découper la release visée en user stories rattachées à la story map du PRD, placer les spikes de la conception en tête, et repérer le walking skeleton.

## 1. Ingestion

1. Lance `node <chemin-du-skill>/scripts/ingest-handoffs.mjs plan/<slug>/state.yaml --prd <handoff PRD> --sad <handoff conception>`. Le script vérifie l'empreinte de chaque handoff et refuse un handoff altéré ; il relève les empreintes dans `refs.yaml` et signale si un handoff ne vient pas d'une baseline. N'utilise `--force` qu'à la demande explicite de l'utilisateur, en disant pourquoi c'est risqué.
2. Présente ce qui conditionne le plan : la release visée et ses FR, la story map, les éléments à construire et leurs équipes, les spikes, les contrats, les mesures de sécurité, les risques et zones d'ombre assumées en amont.
3. Fais choisir la cadence (`references/cadence.md`) et renseigne `settings`.

## 2. Stories (`US-xxx`)

1. Pour chaque tâche de la story map (`T-xx`) affectée à la release, propose une ou plusieurs stories. Une story :
   - a un **titre court**, qu'on peut prononcer dans une conversation, et en dessous **qui**, **quoi**, **pourquoi**. La forme « En tant que…, je veux… afin de… » est un bon démarreur de conversation, pas une obligation : ne force pas une story dans ce moule quand il ne convient pas ;
   - couvre au moins une FR de la release ; une FR peut être répartie sur plusieurs stories (par exemple cas nominal, puis cas d'erreur) ;
   - est **verticale** : elle traverse les couches nécessaires pour produire un résultat observable, plutôt qu'une couche technique seule ;
   - est assez petite pour tenir dans une itération (ou quelques jours de flux).
2. Chaque FR de la release doit être couverte par au moins une story ; une FR non couverte est une zone `fr_sans_story`.
3. Une story sans FR n'existe pas : si l'équipe en voit le besoin, c'est une demande de changement au PRD.
4. Propose une taille provisoire (S, M, L, XL). Une story XL se découpe avant Refine (`references/sizing-and-assignment.md`).

## 3. Spikes

Chaque spike du handoff de la conception devient une tâche `kind: spike` (`spike_of: H-xxx`), sans story. Les stories qui en dépendent le citent dans `depends_on`. Un spike est **borné dans le temps** (sa taille fixe la durée) et produit une réponse, pas du code de production.

## 4. Découper progressivement

Ne découpe pas toute la release d'un coup en petites stories : on s'y noie, et l'on perd la vue d'ensemble. Découpe juste à temps : assez pour la release et ses priorités maintenant, finement seulement pour ce qui part au prochain cycle. Un backlog encombré de petites stories se regroupe (titre de synthèse précis, les petites deviennent des puces).

Les petites corrections évidentes ne passent pas par ce découpage : elles entrent en **voie rapide** (`references/fast-lane.md`).

## 5. Walking skeleton

Propose la plus petite tranche de stories qui traverse tous les conteneurs de la conception de bout en bout (interface, API, stockage, intégrations). Marque-les `skeleton: true` : elles passent en premier, car elles valident la conception avant d'investir dans le détail.

## 6. Ouverture, milieu et fin de partie

Suis `references/development-strategy.md`. Fais classer chaque story par l'équipe : `ouverture` (le walking skeleton, le risqué, l'essentiel qui traverse tout), `milieu` (options, règles difficiles, performance), `fin` (affinage). Pour une story trop grosse, joue bon–mieux–meilleur et construis d'abord les versions « bon » sur toute la release.

## Fin de la phase

**Propose** le passage à Refine, sans le décider, quand :

- chaque FR de la release est couverte par une story validée ;
- le walking skeleton est désigné ;
- chaque spike dit quelle hypothèse il tranche ;
- chaque zone d'ombre est `levée` ou `assumée`, et chaque `assumée` est emportée par un risque ou une hypothèse qui la nomme : une zone encore `ouverte` à la porte est une question que plus personne ne posera ;
- aucun élément n'est resté `proposé` : ce que personne n'a tranché ne franchit pas la porte.

Lance `status.mjs` : il compte les conditions de cette porte qui **se calculent**, et nomme ce qui manque — identifiants compris. Celles qui se jugent n'y sont pas, et le compte dit « n tenues sur m mesurées » : ce n'est pas « la porte est franchie ». Présente-le, liste ce qui manque — puis **pose la question dans tous les cas**, avec l'outil : passer la phase, ou s'arrêter là. S'il manque des conditions, les deux options sont « s'arrêter là » et « continuer sur ce qui manque », jamais « passer la porte » (`references/questions.md`). Si l'utilisateur accepte, passe `phase: refine`.

**Et le passage lui-même s'écrit.** Dès que l'utilisateur a tranché, ajoute l'entrée à `phase_log` : la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte tel que `status.mjs` l'a dit, et chaque condition franchie par dérogation avec sa raison. Sans cette entrée, `status.mjs` affiche « passage sans trace » et le document rendu ne peut pas dire au relecteur quand la phase a été close ni par qui (S100, S101). L'état de la porte se recopie **tel quel** — « X condition(s) tenue(s) sur Y mesurée(s) » —, parce que le compte se relit : Y moins X donne le nombre de conditions non tenues, et `waived` doit en nommer exactement autant. Une de plus et une condition a été franchie sans que rien ne dise laquelle ni pourquoi ; une de moins et l'un des deux comptes est faux (S124).
