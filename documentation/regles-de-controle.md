# Règles de contrôle, étape par étape

**Ce document est généré par `doc-regles.mjs`. Ne le modifie pas à la main.** Une liste de 138 règles écrite à la main dérive au premier changement du catalogue, et une liste qui dérive est pire qu'une absence de liste : on la croit. Les énoncés ci-dessous sont ceux du catalogue (`skills/*/scripts/lib/rules.mjs`), les conditions de porte celles de `lib/gates.mjs`, les seuils ceux de `COVERAGE_DEFAULTS`. Pour le régénérer : `node doc-regles.mjs`. Pour vérifier qu'il est à jour : `node doc-regles.mjs --verifier`.

Au total : **130 règles de structure** (`S00`–`S129`), **8 règles de rédaction** (`L01`–`L08`), **10 conditions** à la porte de PR, **10** à la porte de release, **6 garde-fous** d'export, et les conditions calculées des portes de phase des cinq documents à phases.

## Comment lire une règle

Une **règle de structure** (`Sxx`) porte sur la forme de l'état : un champ manquant, un renvoi mort, un compte qui ne concorde pas. Une **règle de rédaction** (`Lxx`) porte sur le texte d'un énoncé. Les deux sont des **avertissements** : elles ne bloquent jamais, elles informent l'auteur au moment où il écrit. Elles sont rendues par `lint.mjs`, comptées par `status.mjs`, et reprises dans le document généré.

Une **condition de porte** est autre chose : elle ne crie pas pendant le travail, elle se compte au moment de changer de phase. C'est pourquoi `S04` et `S05` — critère d'acceptation et priorité d'une exigence — sont dus à la porte de Define et pas pendant : les critères s'écrivent à l'étape 3 et les priorités s'arbitrent à l'étape 4, et un contrôle qui crie pendant le travail qu'il prescrit s'apprend à s'ignorer.

Une condition a **trois** états — tenue, en échec, **non mesurée** — et une condition non mesurée ne s'affiche jamais ✓ : une absence de mesure n'est pas une réussite. Ce qui ne se calcule pas n'est pas dans la porte : « le MVP satisfait les critères », « assez de stories sont prêtes », « les participants se reconnaîtraient dans la synthèse » restent dans les fichiers de phase et se tranchent avec l'utilisateur. Le compte affiché dit « n tenues sur m mesurées », jamais « la porte est franchie » — **le passage se décide avec l'utilisateur, jamais seul**.

**Toute règle se dérogue, et une dérogation porte sa raison.** Un avertissement se dérogue sur l'élément qu'il concerne (`lint_waivers: [{ rule, reason }]`) ou, s'il ne porte sur aucun élément — une collection, un fichier —, à la racine de l'état avec son `id`. Sans raison écrite, la dérogation ne compte pas : elle est signalée comme un silence. Un **seuil** se dérogue dans `waivers: [{ metric, reason, approved_by }]`, et là les deux sont exigés, parce que ce qui est en jeu est une approbation. Une règle dérogée ne disparaît pas : elle change de liste et part dans le dossier de revue.

## Règles de rédaction (`L01`–`L08`)

Elles portent sur le texte des énoncés, dans les cinq documents, selon le type d'élément : `BR` exigence métier, `FR` exigence fonctionnelle, `NFR` exigence non fonctionnelle, `RG` règle métier, `AC` critère d'acceptation, `OBJ` objectif métier, `GOAL` objectif produit, `AD` moteur architectural.

| Code | Porte sur | Énoncé du constat |
|---|---|---|
| `L01` | `BR`, `AC`, `FR`, `NFR`, `RG`, `OBJ`, `GOAL`, `AD`, `US` | terme non mesurable « … » : remplacer par un comportement observable ou une valeur cible |
| `L02` | `BR`, `AC`, `FR`, `NFR`, `RG`, `US` | points de suspension : l'énumération est incomplète, la rendre exhaustive ou la décrire en intention |
| `L03` | `BR`, `FR`, `RG` | « … » : l'énoncé contient peut-être plusieurs exigences, vérifier s'il faut le scinder |
| `L04` | `BR`, `FR`, `NFR`, `RG`, `AC` | l'énoncé commence par « … » : il ne se lit pas seul, remplacer par le sujet explicite |
| `L05` | `BC`, `BR`, `FR`, `RG` | « … » : une généralisation cache souvent des exceptions, vérifier les cas où ce n'est pas vrai |
| `L06` | `BR`, `OBJ` | « … » décrit un moyen, pas un besoin métier : remonter au besoin |
| `L07` | `FR`, `AC`, `US` | « … » décrit l'implémentation : reformuler en comportement observable (le choix relève de la conception) |
| `L08` | `BR`, `FR`, `RG` | aucun « doit / doivent / devra » : l'énoncé ne dit pas clairement ce qui est exigé |

## Étape 1 — Besoin métier (BRD)

Dossier `brd/<slug>/` · skill `brd-builder` · document `brd`

### Portes de phase

Phases, dans l'ordre : **Assess** → **Discover** → **Define** → **Govern**. `close` n'est pas une phase de plus : c'est un terme, pour une opportunité jetée ou découpée.

Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.

#### Sortie de Assess — vers Discover

- le canevas d'opportunité est rempli
- une décision d'opportunité est rendue, par une personne nommée

#### Sortie de Discover — vers Define

- le problème est formulé et confirmé par l'utilisateur
- au moins un signal de succès
- un council en mode couverture est passé
- chaque besoin candidat est sourcé
- chaque besoin candidat dit de qui il est le besoin
- un décideur pour le périmètre, les objectifs et les priorités
- aucune contradiction d'intérêts ouverte sans arbitre
- la porte de synthèse est déclarée

#### Sortie de Define — vers Govern

- toutes les sections du document sont validées
- chaque objectif porte une exigence
- chaque exigence porte un objectif
- chaque exigence validée a un critère d'acceptation
- chaque exigence validée a une priorité
- chaque exigence de transition a un type, ses parties prenantes et un critère
- aucun besoin candidat resté « confirmé »
- aucun élément resté « proposé » : tout a été tranché

#### Sortie de Govern

- des relecteurs sont nommés
- au moins une approbation
- une version de référence est figée

**À toutes les portes de cette étape, en plus :**
- aucune zone d'ombre bloquante ouverte
- chaque zone d'ombre est levée ou assumée
- chaque zone d'ombre assumée est emportée par un risque ou une hypothèse
- chaque zone d'ombre assumée dit pourquoi
- aucun avertissement ni corrigé ni dérogé (lint.mjs)

### Règles de structure de l'étape 1 (35)

Hors celles qui portent sur les quatre documents, listées plus bas. La dernière colonne dit quand une règle vaut aussi ailleurs — son énoncé y est souvent différent.

| Code | Objet | Ce que dit le constat | Portée |
|---|---|---|---|
| `S01` | objectif non mesurable | objectif sans indicateur ou sans cible | aussi étape 2 |
| `S02` | exigence sans objectif | exigence rattachée à aucun objectif | — |
| `S03` | exigence sans besoin sourcé | exigence sans besoin candidat sourcé | — |
| `S04` | exigence sans critère d'acceptation | exigence validée sans critère d'acceptation | aussi étape 2 |
| `S05` | priorité ou release manquante | exigence validée sans priorité | aussi étape 2 |
| `S10` | référence vers un élément abandonné | renvoie vers …, qui est … | aussi étape 2 |
| `S11` | règle métier sans source | règle métier sans source (texte, procédure ou personne qui la détient) | — |
| `S12` | règle sans niveau d'application | règle de comportement sans niveau d'application (stricte, dérogation autorisée, dérogation justifiée, indicative) | — |
| `S13` | règle sans responsable | règle métier sans responsable métier (qui peut la modifier ?) | — |
| `S14` | contradiction non qualifiée | contradiction non qualifiée (factuelle, vocabulaire, réglementaire ou intérêts) | — |
| `S15` | conflit d'intérêts sans arbitre | conflit d'intérêts sans arbitre : consulter decision_rights ou créer une zone arbitre_inconnu | aussi étape 2 |
| `S16` | arbitre partie au conflit | l'arbitre … est partie au conflit | aussi étape 2 |
| `S17` | décision sans décideur | décision validée sans décideur déclaré | aussi étape 2, 3 |
| `S18` | décision sans alternative | décision présentée avec moins de deux options : le décideur n'a pas eu de choix réel | — |
| `S19` | opposant puissant sans risque | partie prenante à fort pouvoir et influence négative sans risque associé | — |
| `S56` | opportunité non décidée | phase … sans décision « aller plus loin » sur l'opportunité (décision : …) · décision d'opportunité sans décideur déclaré · décideur « … » absent des parties prenantes : la décision d'opportunité revient au sponsor, qui se nomme (SH-xx) · opportunité découpée sans nommer les initiatives filles (split_into) : close se relit alors comme un abandon | — |
| `S63` | exigence à source unique | exigence fondée sur une seule source : un motif isolé n'est pas encore un besoin établi | — |
| `S64` | exigence sans source | exigence validée sans aucune source : c'est une hypothèse | — |
| `S65` | porte de synthèse | passage en Define sans porte de synthèse (cinq dimensions) · dimension « … » jugée faible sans décision de l'assumer | — |
| `S66` | exigence de transition incomplète | exigence de transition sans type (formation, conduite du changement, reprise de données…) · exigence de transition sans partie prenante concernée · exigence de transition sans critère d'achèvement | — |
| `S81` | source sans personne entendue | source de type « … » sans partie prenante : qui a parlé ? · source attribuée à …, que l'état déclare « … » : ce qui en vient est rapporté par un tiers, pas recueilli | aussi étape 2 |
| `S83` | aucun utilisateur direct entendu | des besoins recueillis, et aucun utilisateur direct entendu (`end_user`) : tout passe par des représentants… · utilisateur direct présent au cadrage mais jamais interrogé (…) : être dans la pièce au premier échange n'est pas avoir été entendu sur son travail | — |
| `S84` | exigence jamais relue par la source | exigence validée sur des sources dont la relecture est partie et pas encore revenue (`feedback: envoyé`) : la question vit, elle n'est pas encore tranchée · exigence validée sur des sources dites parties en relecture sans dire quand (`feedback_le` manque sur …) : « envoyé » sans date ne se vérifie pas, et c'est l'agent qui écrit le champ · exigence validée sur des sources dont aucune n'a été relue par la personne interrogée (`feedback`) : ce qui a été compris n'a jamais été vérifié auprès d'elle | aussi étape 2 |
| `S86` | provenance d'initiative incomplète ou hors énumération | provenance sans initiative d'origine (derived_from.initiative) : elle ne désigne personne · provenance sans la décision qui l'a produite (derived_from.decision) : DD-xx chez la mère, ou sa décision d'opportunité · provenance sans raison (derived_from.reason) : … \| autre:<libellé> · raison de provenance « … » hors énumération : … \| autre:<libellé> · « autre » sans libellé : dire qu'il y a une provenance sans dire laquelle passe pour rempli · provenance « … » hors énumération, et nommée : candidate à devenir une valeur de derived_from.reason · repris par « … » mais de statut … : un besoin qui part est hors_périmètre ici | — |
| `S87` | présent sans avoir parlé | présent… sur … sources et locuteur d'aucune, avec le statut « à interroger » : ce statut explique un silence hors de la salle, pas dedans — la personne était là chaque fois et personne ne lui a rien demandé. Interroge-la, ou dis pourquoi sa voix ne compte pas ici · présent… mais locuteur d'aucune source : être dans la pièce n'est pas avoir parlé, et le silence n'est pas un accord | aussi étape 2 |
| `S89` | droit de décision sans décideur ou confirmé par lui-même | domaine « … » déclaré sans décideur · « … » confirmé par son propre décideur : s'attribuer le droit de trancher n'est pas une confirmation, elle revient au sponsor · « … » attribué sans confirmation (confirmed_by) : l'attribution se valide par le sponsor, pas par celui qui en bénéficie · recours identique au décideur sur « … » : un recours vers soi-même n'en est pas un · personne ne tranche « … » : la fin de Discover en demande un décideur au moins pour le périmètre, les objectifs et les priorités | — |
| `S90` | décision rendue au nom de quelqu'un qu'on n'a pas entendu | … au nom de …, que l'état déclare « … » : elle est rapportée par un tiers, pas rendue | aussi étape 2 |
| `S91` | locuteur absent de la salle qu'il a fait parler | … est locuteur de cette source mais absent de « present » : on ne parle pas depuis l'extérieur de la pièce — « present » est la salle entière, silencieux ET locuteurs | aussi étape 2 |
| `S92` | quadrant d'implication affirmé au lieu d'être déduit | quadrant « … » affirmé alors que pouvoir (…) × impact (…) ne le donne pas : il se déduit, il ne s'affirme pas — laisse-le vide et pose la question · quadrant « … » alors que pouvoir … × impact … donne « … » · quadrant absent alors que pouvoir … × impact … le donne (« … ») : la gouvernance en tire un rôle de revue | — |
| `S93` | influence inconnue à fort pouvoir, sans attitude notée | fort pouvoir, influence inconnue et aucune attitude notée : le sens dans lequel elle pèsera est la seule appréciation qui ne se déduit pas — elle se demande, et son absence est une zone d'ombre | — |
| `S94` | représentation non déclarée, ou tenue pour une voix | déclarée représentée par elle-même : la représentation désigne quelqu'un d'autre · représentée par … et jamais entendue : une zone ouverte la nomme, mais aucune ne lui est adressée (`ask_to`) — une question sur quelqu'un n'est pas une question à quelqu'un · représentée par … et jamais entendue, sans qu'aucune zone ouverte ne lui soit adressée : une représentation dit qui répond pour elle, elle ne remplace pas sa voix · jamais entendue et aucune représentation déclarée, alors qu'une autre partie prenante se dit représentante d'un groupe : si c'est d'elle qu'il s'agit, dis-le en `represented_by` | aussi étape 2 |
| `S95` | besoin sans porteur, ou porté par une voix jamais entendue | ne dit pas de qui il est le besoin (`concerns`) : un besoin sans porteur se défend tout seul en revue · besoin de …, dont aucune source recueillie ne porte la voix : il est formulé pour quelqu'un qu'on n'a pas entendu | — |
| `S97` | hypothèse à vérifier sans moyen de vérification | à vérifier, sans dire comment (`verification`) : une hypothèse dont le moyen n'est pas écrit ne se priorise pas, et attend la session où quelqu'un y repense | — |
| `S110` | représentation sans la source où elle se dit | déclaré représentant de « … » sans dire où il le dit (`represents_source`) : une représentation se lit dans une source, sinon elle se déduit — et une déduction fausse fait parler quelqu'un au nom d'un groupe qui ne l'a pas mandaté · représentation de « … » appuyée sur …, où il n'est pas locuteur : ce qu'un tiers dit de lui ne le mandate pas — cite la source où il le dit lui-même | aussi étape 2 |
| `S113` | utilisateur direct qu'aucun besoin ne concerne | utilisateur direct qu'aucun besoin candidat ne concerne (`concerns`) : soit un besoin manque, soit l'usage direct n'en est pas un | — |

### Métriques de couverture et seuils par défaut

Mesurées sur l'état, affichées dans le document généré et dans le handoff. Un seuil se règle par projet dans `thresholds` ; non atteint, il se corrige ou s'assume par une dérogation nommée (`S54`, `S106`). Un seuil à **0** ne compare rien : c'est un renoncement, et il passe par la même dérogation (`S105`). Une métrique **indicative** se lit et ne se juge pas — seul le catalogue peut la déclarer telle, avec sa raison.

| Métrique | Mesure | Seuil par défaut |
|---|---|---|
| `br_objective` | Exigences métier rattachées à un objectif | 100 % |
| `br_acceptance` | Exigences métier avec critère d'acceptation | 100 % |
| `objective_br` | Objectifs servis par au moins une exigence | 100 % |

## Étape 2 — Produit (PRD)

Dossier `prd/<slug>/` · skill `prd-builder` · document `prd`

### Portes de phase

Phases, dans l'ordre : **Frame** → **Specify** → **Govern**.

Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.

#### Sortie de Frame — vers Specify

- la vision est écrite
- chaque objectif produit est mesurable
- chaque cible est arrêtée par une personne nommée
- chaque persona validé repose sur une preuve
- au moins un parcours validé
- chaque tâche de la story map est affectée à une release
- un décideur pour le périmètre et les priorités
- un council en mode cadrage est passé

#### Sortie de Specify — vers Govern

- un council en mode spécification est passé
- toutes les sections du document sont validées
- chaque exigence validée a une origine
- chaque exigence validée a un critère d'acceptation
- chaque exigence validée a une release et une priorité
- chaque NFR validée a une métrique, une cible et un moyen de mesure
- chaque règle métier est tranchée
- aucun élément resté « proposé » : tout a été tranché

#### Sortie de Govern

- des relecteurs sont nommés
- au moins une approbation
- une version de référence est figée

**À toutes les portes de cette étape, en plus :**
- aucune zone d'ombre bloquante ouverte
- chaque zone d'ombre est levée ou assumée
- chaque zone d'ombre assumée est emportée par un risque ou une hypothèse
- chaque zone d'ombre assumée dit pourquoi
- aucun avertissement ni corrigé ni dérogé (lint.mjs)

### Règles de structure de l'étape 2 (23)

Hors celles qui portent sur les quatre documents, listées plus bas. La dernière colonne dit quand une règle vaut aussi ailleurs — son énoncé y est souvent différent.

| Code | Objet | Ce que dit le constat | Portée |
|---|---|---|---|
| `S01` | objectif non mesurable | objectif produit sans KPI ou sans cible | aussi étape 1 |
| `S04` | exigence sans critère d'acceptation | exigence validée sans critère d'acceptation | aussi étape 1 |
| `S05` | priorité ou release manquante | exigence validée sans release ou sans priorité | aussi étape 1 |
| `S06` | exigence sans origine | exigence sans origine (BR, source ou décision produit) | — |
| `S07` | Must sans scénario d'erreur | exigence Must sans scénario d'erreur | — |
| `S08` | NFR incomplète | NFR incomplète : … manquant(s) | — |
| `S10` | référence vers un élément abandonné | renvoie vers …, qui est … | aussi étape 1 |
| `S15` | conflit d'intérêts sans arbitre | conflit d'intérêts sans parties nommées : on ne sait pas qui veut l'inverse de qui · conflit d'intérêts sans arbitre : consulter decision_rights ou créer une zone arbitre_inconnu | aussi étape 1 |
| `S16` | arbitre partie au conflit | l'arbitre … est partie au conflit | aussi étape 1 |
| `S17` | décision sans décideur | décision validée sans décideur déclaré · … « … » absent du registre des parties prenantes : il se nomme, et se prend dans decision_rights | aussi étape 1, 3 |
| `S20` | règle automatisée non couverte | règle à automatiser couverte par aucune exigence fonctionnelle | — |
| `S57` | hypothèse risquée non testée | hypothèse risquée assumée sans raison · hypothèse … à risque fort ni testée ni assumée avant la spécification · test sans critère de réussite écrit à l'avance | — |
| `S67` | exploration de concepts | un seul concept envisagé : ce n'est pas une exploration · plusieurs concepts retenus : la story map n'en suit qu'un · concept retenu ou écarté sans raison · concept retenu sans test de valeur ou d'usage (tested_by) · concept non évalué sur l'axe … | — |
| `S73` | comportement existant à préserver | produit existant sans comportement à préserver : qu'est-ce que ce changement ne doit pas casser ? · comportement à préserver sans preuve qu'il existe : c'est une hypothèse | — |
| `S81` | source sans personne entendue | source de type « … » sans partie prenante : qui a parlé ? · source attribuée à …, que l'état déclare « … » : ce qui en vient est rapporté par un tiers, pas recueilli | aussi étape 1 |
| `S82` | métrique et objectif désaccordés | métrique rattachée à aucun objectif produit (`goal`) : rien ne dit ce qu'elle sert à mesurer · cible vide alors que … a fixé la sienne : la même mesure porte deux valeurs, et le document n'en affiche qu'une · cible fixée alors que … n'a pas la sienne : c'est l'objectif qui porte l'engagement, la métrique le mesure | — |
| `S84` | exigence jamais relue par la source | exigence tirée de …, dont la relecture est partie le … et pas encore revenue : la question vit, elle n'est pas encore tranchée · exigence tirée de …, dite partie en relecture sans dire quand (`feedback_le`) : « envoyé » sans date ne se vérifie pas, et c'est l'agent qui écrit le champ · exigence tirée de …, que la personne interrogée n'a jamais relue (`feedback`) : ce qui a été compris n'a pas été vérifié auprès d'elle | aussi étape 1 |
| `S85` | motif EARS absent ou désaccordé | exigence sans motif EARS (`pattern`) : … (`references/ears.md`) · motif « … » inconnu : … · motif « … » déclaré, mais l'énoncé ne porte pas … : l'un des deux est faux · déclarée invariante, mais l'énoncé porte la forme … : un invariant n'a pas de condition | — |
| `S87` | présent sans avoir parlé | présent… sur … sources et locuteur d'aucune, avec le statut « à interroger » : ce statut explique un silence hors de la salle, pas dedans — la personne était là chaque fois et personne ne lui a rien demandé. Interroge-la, ou dis pourquoi sa voix ne compte pas ici · présent… mais locuteur d'aucune source : être dans la pièce n'est pas avoir parlé, et le silence n'est pas un accord | aussi étape 1 |
| `S90` | décision rendue au nom de quelqu'un qu'on n'a pas entendu | … au nom de …, que l'état déclare « … » : elle est rapportée par un tiers, pas rendue | aussi étape 1 |
| `S91` | locuteur absent de la salle qu'il a fait parler | … est locuteur de cette source mais absent de « present » : on ne parle pas depuis l'extérieur de la pièce — « present » est la salle entière, silencieux ET locuteurs | aussi étape 1 |
| `S94` | représentation non déclarée, ou tenue pour une voix | déclarée représentée par elle-même : la représentation désigne quelqu'un d'autre · représentée par … et jamais entendue : une zone ouverte la nomme, mais aucune ne lui est adressée (`ask_to`) — une question sur quelqu'un n'est pas une question à quelqu'un · représentée par … et jamais entendue, sans qu'aucune zone ouverte ne lui soit adressée : une représentation dit qui répond pour elle, elle ne remplace pas sa voix · jamais entendue et aucune représentation déclarée, alors qu'une autre partie prenante se dit représentante d'un groupe : si c'est d'elle qu'il s'agit, dis-le en `represented_by` | aussi étape 1 |
| `S110` | représentation sans la source où elle se dit | déclaré représentant de « … » sans dire où il le dit (`represents_source`) : une représentation se lit dans une source, sinon elle se déduit — et une déduction fausse fait parler quelqu'un au nom d'un groupe qui ne l'a pas mandaté · représentation de « … » appuyée sur …, où il n'est pas locuteur : ce qu'un tiers dit de lui ne le mandate pas — cite la source où il le dit lui-même | aussi étape 1 |

### Métriques de couverture et seuils par défaut

Mesurées sur l'état, affichées dans le document généré et dans le handoff. Un seuil se règle par projet dans `thresholds` ; non atteint, il se corrige ou s'assume par une dérogation nommée (`S54`, `S106`). Un seuil à **0** ne compare rien : c'est un renoncement, et il passe par la même dérogation (`S105`). Une métrique **indicative** se lit et ne se juge pas — seul le catalogue peut la déclarer telle, avec sa raison.

| Métrique | Mesure | Seuil par défaut |
|---|---|---|
| `fr_ac` | FR avec au moins un critère d'acceptation | 100 % |
| `fr_goal` | FR rattachées à un objectif produit | 100 % |
| `br_covered` | Exigences du BRD couvertes par une FR ou une NFR | 100 % |
| `must_error` | FR Must avec un scénario d'erreur | 100 % |

## Étape 3 — Conception (SAD)

Dossier `sad/<slug>/` · skill `sad-builder` · document `sad`

### Portes de phase

Phases, dans l'ordre : **Explore** → **Design** → **Govern**.

Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.

#### Sortie de Explore — vers Design

- un décideur pour l'architecture et l'acceptation du risque de sécurité
- en brownfield, chaque élément existant a une preuve
- chaque moteur validé a un scénario dont la mesure est chiffrée
- chaque règle métier automatisée est rattachée à un agrégat
- la vue de contexte est validée
- un council en mode exploration est passé

#### Sortie de Design — vers Govern

- chaque moteur validé est servi par un ADR accepté ou une réponse à une NFR
- chaque ADR accepté a deux options, des moteurs, un décideur et un moyen de confirmation
- chaque NFR a une réponse avec sa vérification
- chaque donnée a un propriétaire, une classification et une conservation
- chaque menace a un traitement
- chaque menace acceptée a un décideur
- toutes les sections du document sont validées
- un council en mode conception est passé
- aucun élément resté « proposé » : tout a été tranché

#### Sortie de Govern

- des relecteurs sont nommés
- au moins une approbation
- une version de référence est figée

**À toutes les portes de cette étape, en plus :**
- aucune zone d'ombre bloquante ouverte
- chaque zone d'ombre est levée ou assumée
- chaque zone d'ombre assumée est emportée par un risque ou une hypothèse
- chaque zone d'ombre assumée dit pourquoi
- aucun avertissement ni corrigé ni dérogé (lint.mjs)

### Règles de structure de l'étape 3 (19)

Hors celles qui portent sur les quatre documents, listées plus bas. La dernière colonne dit quand une règle vaut aussi ailleurs — son énoncé y est souvent différent.

| Code | Objet | Ce que dit le constat | Portée |
|---|---|---|---|
| `S17` | décision sans décideur | ADR accepté sans décideur déclaré | aussi étape 1, 2 |
| `S21` | moteur sans origine | moteur sans origine (NFR, contrainte, FR ou règle) | — |
| `S22` | scénario sans mesure | scénario de qualité sans mesure chiffrée | — |
| `S23` | ADR à option unique | ADR avec moins de deux options : ce n'est pas une décision | — |
| `S24` | ADR sans moteur | ADR sans moteur : on ne saura pas quand le remettre en cause | — |
| `S25` | ADR sans conséquence négative ou confirmation | ADR accepté sans conséquence négative : toute décision sacrifie quelque chose · ADR accepté sans moyen de confirmation | — |
| `S26` | FR non allouée | FR allouée à aucun conteneur ni composant | — |
| `S27` | NFR sans réponse ou vérification | NFR sans réponse de conception · réponse à une NFR sans méthode de vérification | — |
| `S28` | existant sans preuve | élément existant sans preuve (code, configuration, manifeste, document) · relation existante sans preuve | — |
| `S29` | opération sans FR | opération qui ne sert aucune FR | — |
| `S30` | donnée incomplète | donnée sans … | — |
| `S31` | donnée sensible sans menace I | donnée … sans menace de divulgation (I) examinée sur … | — |
| `S32` | menace non traitée | menace sans traitement décidé · menace acceptée sans décideur déclaré · menace à atténuer sans mesure | — |
| `S33` | nom d'élément dupliqué | nom « … » porté par plusieurs éléments (…) | — |
| `S34` | parent C4 incohérent | conteneur sans système interne parent · composant sans conteneur parent | — |
| `S35` | règle sans agrégat | règle automatisée garantie par aucun agrégat | — |
| `S36` | remplacé sans remplaçant | élément remplacé sans remplaçant désigné | — |
| `S55` | mesure de sécurité sans contrôle de référence | mesure sans contrôle de référence (…) | — |
| `S71` | ADR sans règle | ADR accepté sans divergence empêchée : que feraient différemment deux parties construites sans lui ? · ADR accepté sans règle vérifiable : la décision ne guidera ni un développeur ni un agent | — |

### Métriques de couverture et seuils par défaut

Mesurées sur l'état, affichées dans le document généré et dans le handoff. Un seuil se règle par projet dans `thresholds` ; non atteint, il se corrige ou s'assume par une dérogation nommée (`S54`, `S106`). Un seuil à **0** ne compare rien : c'est un renoncement, et il passe par la même dérogation (`S105`). Une métrique **indicative** se lit et ne se juge pas — seul le catalogue peut la déclarer telle, avec sa raison.

| Métrique | Mesure | Seuil par défaut |
|---|---|---|
| `fr_allocated` | FR allouées à un conteneur ou composant | 100 % |
| `nfr_response` | NFR avec une réponse de conception | 100 % |
| `driver_served` | Moteurs servis par un ADR accepté ou une réponse | 100 % |

## Étape 4 — Planification

Dossier `plan/<slug>/` · skill `plan-builder` · document `plan`

### Portes de phase

Phases, dans l'ordre : **Slice** → **Refine** → **Schedule** → **Govern** → **Review**. Refine, Schedule et Review se répètent à chaque cycle : le parcours réel se lit dans `phase_log`, pas dans le rang de la phase courante.

Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.

#### Sortie de Slice — vers Refine

- chaque exigence de la release est couverte par une story validée
- le walking skeleton est désigné
- chaque spike dit quelle hypothèse il tranche

#### Sortie de Refine — vers Schedule

- assez de stories sont prêtes pour remplir le prochain cycle
- chaque règle d'une story affinée a au moins un exemple
- aucune question d'example mapping restée ouverte

#### Sortie de Schedule — vers Govern

- le cycle porte des tâches
- chaque tâche du cycle est validée, estimée et affectée
- aucun cycle de dépendances entre tâches
- un engagement déclaré par une personne nommée
- un council en mode planification est passé
- aucun élément resté « proposé » : tout a été tranché

#### Sortie de Govern — vers Review

- des relecteurs sont nommés
- au moins une approbation
- une version de référence est figée

#### Sortie de Review

- une revue d'équipe est enregistrée pour le cycle clos
- chaque tâche non finie du cycle a une décision de report
- chaque constat de revue donne une story ou une action

**À toutes les portes de cette étape, en plus :**
- aucune zone d'ombre bloquante ouverte
- chaque zone d'ombre est levée ou assumée
- chaque zone d'ombre assumée est emportée par un risque ou une hypothèse
- chaque zone d'ombre assumée dit pourquoi
- aucun avertissement ni corrigé ni dérogé (lint.mjs)

### Règles de structure de l'étape 4 (28)

Hors celles qui portent sur les quatre documents, listées plus bas. La dernière colonne dit quand une règle vaut aussi ailleurs — son énoncé y est souvent différent.

| Code | Objet | Ce que dit le constat | Portée |
|---|---|---|---|
| `S37` | story sans FR | story sans FR (une petite correction peut passer en voie rapide) | — |
| `S38` | story hors story map | story rattachée à aucune tâche de la story map | — |
| `S39` | FR de la release sans story | FR de … couverte par aucune story | — |
| `S40` | tâche planifiée, story non prête | planifiée alors que sa story … n'est pas prête | — |
| `S41` | règle sans exemple | règle … sans exemple : on ne saura pas la tester | — |
| `S42` | story à scinder | … règles : la story est probablement à scinder | — |
| `S43` | taille XL | story XL : à découper · tâche XL : trop grosse pour une PR, à découper | — |
| `S44` | tâche sans story ou spike sans hypothèse | spike sans hypothèse de la conception (spike_of) · tâche sans story | — |
| `S45` | affectation agent non conforme | affectée à un agent alors que : … | — |
| `S46` | dépendances circulaires | dépendances circulaires : … | — |
| `S47` | tâche avant sa dépendance | passe avant … dont elle dépend dans la file · planifiée alors que …, dont elle dépend, n'est dans aucune itération · planifiée avant …, dont elle dépend | — |
| `S48` | capacité d'itération | itération sans capacité définie · charge … au-delà de la capacité … | — |
| `S49` | limite d'encours | limite d'encours non définie · … tâches en cours pour une limite de … | — |
| `S50` | exemple incomplet | exemple incomplet : … manquant(s) | — |
| `S51` | mesure, vérification ou spike non planifié | mesure de sécurité de la conception planifiée dans aucune tâche · vérification de NFR prévue en tests, planifiée dans aucune tâche · spike de la conception sans tâche · comportement existant à préserver sans test et sans tâche qui le protège (preserves) · exigence de transition (…) planifiée dans aucune tâche | — |
| `S52` | règle sans référence amont | règle « … » sans référence amont : demande de changement au BRD ou au PRD | — |
| `S58` | itération sans revue | itération … sans sprint review (/tizi-sprint-review) | — |
| `S59` | release sans mesure des outcomes | release livrée sans plan de mesure des outcomes · release livrée sans observation des utilisateurs ni conclusion sur l'outcome | — |
| `S60` | voie rapide non conforme | voie rapide non conforme : … ; suivre le chemin normal | — |
| `S61` | ordre ouverture, milieu, fin | story de … de partie planifiée avant des stories d'ouverture encore ouvertes (…) | — |
| `S62` | story sans titre court | story sans titre court | — |
| `S72` | collision entre tâches | collision possible : … et … touchent … sans dépendance entre elles ; les ordonner (depends_on) ou les fusionner | — |
| `S74` | taille et risque calculé | taille … retenue, taille de risque calculée … (…) : écart à justifier | — |
| `S75` | attention humaine dépassée | attention humaine prévue … min pour … min disponibles : la relecture limitera le débit, pas les agents | — |
| `S76` | tâche non finie sans décision | sprint review faite, mais aucune décision (continuer, découper, reporter) pour : … | — |
| `S77` | action de rétrospective sans suivi | actions essayées au sprint précédent sans suivi : … | — |
| `S78` | voie rapide sans épopée | story en voie rapide sans épopée (attach_to)… | — |
| `S129` | story sans qui, quoi ou pourquoi | ne dit nulle part … : la carte de la story l'imprime en « — », et une valeur écrite nulle part ne se priorise pas. Le titre reste court ; ces champs sont la place du reste | — |

### Métriques de couverture et seuils par défaut

Mesurées sur l'état, affichées dans le document généré et dans le handoff. Un seuil se règle par projet dans `thresholds` ; non atteint, il se corrige ou s'assume par une dérogation nommée (`S54`, `S106`). Un seuil à **0** ne compare rien : c'est un renoncement, et il passe par la même dérogation (`S105`). Une métrique **indicative** se lit et ne se juge pas — seul le catalogue peut la déclarer telle, avec sa raison.

| Métrique | Mesure | Seuil par défaut |
|---|---|---|
| `release_fr_story` | FR de la release couvertes par une story | 100 % |
| `security_planned` | Mesures de sécurité planifiées | 100 % |
| `verification_planned` | Vérifications de NFR (étape tests) planifiées | 100 % |
| `stories_ready` | Stories prêtes | _indicatif_ |

## Étape 5 — Implémentation

Dossier `impl/<slug>/` · skill `impl-builder` · document `impl`

### Porte de PR (10 conditions)

Calculée par `pr-gate.mjs` sur la tâche en cours. Chaque condition se lit dans les rapports et dans l'état ; aucune ne se déclare à la main. Une tâche ne se fusionne pas sur une porte fermée sans une dérogation nommée.

| Code | Condition |
|---|---|
| `C1` | Compréhension validée par un humain, et inchangée depuis |
| `C2` | Aucune question ouverte sur la tâche |
| `C3` | Suite … au vert |
| `C4` | TDD : au moins un test vu en échec avant le premier vert |
| `C5` | Chaque exemple et critère de la tâche est référencé par un test |
| `C6` | Score de mutation ≥ … % |
| `C7` | Analyse de sécurité sans constat bloquant |
| `C8` | Revue de code par agents sur le diff actuel, sans bloquant confirmé |
| `C9` | Existant figé par des tests de caractérisation avant toute modification |
| `C10` | Principes de la constitution à contrôle automatique respectés |

L'étape 5 n'a **pas** de phases : un lot de tâches n'a pas de phase commune, et chaque tâche porte son statut (`comprendre`, `rouge`, `vert`, `verification`, `en_revue`, `fusionnee`, `bloquee`). Le catalogue de règles ne la vérifie pas : un état d'implémentation se vérifie avec `pr-gate.mjs` et `trace-check.mjs`, et `S00` refuse de lui appliquer un catalogue qui n'est pas le sien — un rapport faux coûte plus cher qu'un refus.

## Étape 6 — Vérification de release

Dossier `qa/<slug>/` · skill `test-builder` · document `test` — trois noms pour une étape : le dossier dit `qa/`, le document dit `test`, le skill dit `test-builder`, et il n'y a pas de quatrième nom à chercher

### Portes de phase

Phases, dans l'ordre : **Prepare** → **Execute** → **Prove**.

Un passage de porte s'écrit dans `phase_log` — la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte au passage, et chaque condition franchie par dérogation avec sa raison (`S100`, `S101`). Un retour en arrière s'écrit dans le même journal, avec `kind: retour`, la zone d'ombre qui l'a provoqué et sa raison ; il ne tient pas lieu de porte.

#### Sortie de Prepare — vers Execute

- les parcours critiques sont choisis
- chaque session exploratoire a une charte
- les environnements de mesure sont déclarés

#### Sortie de Execute — vers Prove

- la version candidate est identifiée
- les rapports des suites sont rattachés
- chaque mesure de NFR dit sur quel environnement elle a été prise
- chaque session exploratoire menée est close

#### Sortie de Prove

- chaque exigence non prouvée est couverte par une dérogation nommée
- une décision de release est déclarée

### Porte de release (10 conditions)

Calculée par `release-matrix.mjs` depuis le plan figé et les rapports collectés. **Trois verdicts** : ouverte, fermée, et _incomplète_ — une condition « ? » n'est pas satisfaite, elle n'a pas été mesurée. L'approbation de la release reste une déclaration humaine, et aucune n'est déduite de la présence du rapport.

| Code | Condition |
|---|---|
| `R1` | Toutes les suites collectées passent |
| `R2` | Exigences prouvées (seuil … %) |
| `R3` | Mesures des NFR conformes |
| `R4` | Parcours critiques couverts de bout en bout |
| `R5` | Sessions exploratoires faites, sans constat bloquant ouvert |
| `R6` | Score de mutation ≥ … % |
| `R7` | Analyses de sécurité sans constat |
| `R8` | Rien de réalisé sans être prouvé |
| `R9` | Preuves issues de la CI sur le commit candidat |
| `R10` | Aucun défaut bloquant ou majeur ouvert, aucun signalement à trier |

Une exigence non prouvée se corrige, ou s'assume par une dérogation dans `waivers` — qui ne compte que si elle dit **pourquoi** et **qui l'a approuvée**. Le catalogue de règles ne vérifie pas cette étape (`S00`) : un état de tests se vérifie avec `release-matrix.mjs`.

## Règles de structure communes aux quatre documents (40)

Elles s'appliquent au BRD, au PRD, à la conception et au plan. Les étapes 5 et 6 ne reçoivent pas ce catalogue.

| Code | Objet | Ce que dit le constat |
|---|---|---|
| `S00` | document hors du catalogue | document « … » : ce catalogue vérifie …, et rien d'autre — un état d'implémentation se vérifie avec pr-gate.mjs et trace-check.mjs, un état de tests avec release-matrix.mjs |
| `S09` | référence inexistante | représentée par « … », qui n'est pas une partie prenante connue · représentation appuyée sur …, qui n'existe pas dans les sources · guide d'entretien pour …, qui n'est pas dans la cartographie · déclarée comme correction de …, qui n'existe pas dans les sources · `…` renvoie vers …, qui n'existe pas dans l'état · coordonnée dans `contacts.yaml` à un identifiant qui n'est pas une partie prenante de l'état : une coordonnée qui ne désigne personne ne sert à rien, et elle a pu être recopiée de travers · sollicitée sur …, qui n'est pas une zone d'ombre de l'état · source déclarée comme confirmation de …, qui n'existe pas |
| `S53` | handoff amont altéré | empreinte du handoff non relevée à l'ingestion (lancer verify-handoff.mjs et reporter sha256 dans l'état) · handoff ingéré introuvable · le handoff a changé depuis l'ingestion : relancer l'ingestion et faire le point sur les écarts |
| `S54` | seuil de couverture non atteint | … : … % pour un seuil de … % (manquent : …) ; corriger, ou déclarer une dérogation dans `waivers` avec sa raison et son approbateur |
| `S68` | espace réservé resté | espace réservé resté dans … : « … » |
| `S69` | chiffre sans source | chiffre « … » dans … sans source qui le fixe : généraliser, ou citer la source |
| `S70` | fiche de contexte trop longue | fiche de contexte à ≈ … tokens pour un budget de … : au-delà, l'agent qui implémente perd en précision. Découper la tâche, ou alléger la story |
| `S79` | constitution | principe inconnu de la constitution · la constitution compte … principe(s) actif(s) : dire lesquels s'appliquent à cette initiative (liste vide si aucun) · conception en gouvernance sans vérification de la constitution après conception · conflit avec un principe inconnu · conflit avec … sans résolution : corriger la conception, ou dérogation enregistrée (constitution.mjs --deroger), ou amendement |
| `S80` | liste de contrôle de relecture | … : coché sans relecteur nommé (« — <nom> » en fin de ligne) ; l'agent ne coche jamais · … : écarté sans relecteur ni raison (« — <nom> : raison ») · … point(s) de relecture non traité(s) avant la gouvernance |
| `S88` | valeur hors énumération ou « autre » sans libellé | … « … » hors énumération : … · … « … » sans libellé : un genre qu'on ne nomme pas passe pour renseigné · … « … » hors énumération, et nommé : candidat à devenir une valeur |
| `S96` | guide d'entretien pour quelqu'un qui est dans la salle | guide d'entretien pour …, qui a depuis parlé dans … source(s), et aucune ne vient de ce fichier : l'entretien s'est fait ailleurs, le guide n'a rien reçu et ne porte rien que les zones d'ombre n'aient. Retire-le, et réécris la prochaine action |
| `S98` | relecteur ou approbateur jamais entendu | … que l'état déclare « … » : une revue demande si le document est fidèle à ce qu'on a dit, et cette personne n'a rien dit. Interroge-la d'abord, ou passe-la en « informé » — sinon son silence devient une approbation |
| `S99` | cycle de revue sans échéance, ou retour non tranché | cycle de revue envoyé sans échéance : sans date, un cycle ne se clôt pas — il s'interrompt quand quelqu'un s'impatiente · … commentaire(s) de revue sans décision (…) alors que le document est approuvé ou figé : un retour qu'on n'a pas tranché n'est pas un retour qu'on a traité |
| `S100` | porte de phase franchie sans trace | la phase … est passée et rien ne dit comment : une porte s'écrit dans `phase_log` avec sa date, qui l'a décidée et la source qui le porte — sans quoi on découvre trois sessions plus tard qu'on a changé d'étape sans le savoir (passage vers …) |
| `S101` | passage de phase sans décideur, date ou source | porte franchie sans … : un passage de phase se décide avec l'utilisateur, jamais seul, et la décision se nomme · retour en arrière écrit sans … : un retour se décide comme une porte, et un journal qui ne dit pas pourquoi on a reculé ne se relit pas |
| `S102` | source de parole sans ce qui a été dit | … source(s) de parole sur … ne portent pas ce qui a été dit, ni dans `quote` ni dans un fichier (`path`) : … — une source dont le contenu n'est écrit nulle part ne se relit pas, et ce qu'elle disait ne survit qu'à la conversation |
| `S103` | confirmation non rattachée à ce qu'elle confirme | confirmé par …, qui ne figure pas dans ses sources : une confirmation qui ne rejoint pas ce qu'elle confirme le laisse à source unique et jamais relu |
| `S104` | document sortant parlant par adresses | … identifiant(s) que ce fichier ne glose nulle part : … — il part chez quelqu'un qui n'a jamais vu le dossier, et une adresse sans son énoncé lui demande de valider ce qu'il ne peut pas lire |
| `S105` | seuil qui éteint une mesure sans dérogation nommée | … : seuil à … %, qui ne compare rien — la mesure (… %) n'est pas jugée, et aucune dérogation nommée ne dit pourquoi. Un seuil à 0 est une mise hors périmètre : elle s'écrit dans `waivers` avec sa raison et son approbateur, ou le seuil remonte |
| `S106` | dérogation de seuil sans raison ou sans approbateur | dérogation de seuil sur « … » qui ne dit pas … : une dérogation nommée porte sa raison ET son approbateur, sinon c'est un silence qui éteint une mesure |
| `S107` | ancien nom de champ pour les seuils ou les dérogations | `…` est l'ancien nom : les seuils et les dérogations s'écrivent dans `…`, au niveau de l'état, pour les cinq documents. L'ancien nom reste lu — rien ne casse — mais deux noms pour la même chose finissent par porter deux valeurs différentes |
| `S108` | construit sur un handoff amont qui n'était pas une baseline | construit sur un handoff du … qui n'était pas une baseline (…) : « intègre » veut dire « non altéré », pas « approuvé ». Faire figer le document amont et régénérer son handoff, ou nommer la dérogation |
| `S109` | risque consigné sans être apprécié | risque consigné sans être apprécié (… vide…) : un risque sans vraisemblance ni ampleur ne se priorise pas — et vide ne veut pas dire faible, ça veut dire non apprécié · risque validé sans piste de traitement (`response`) : accepter un risque sans dire ce qu'on en fait le laisse à l'état d'inquiétude consignée |
| `S111` | relecture « sans objet » sur une parole, sans raison | relecture déclarée « sans objet » sur une source de type « … » sans dire pourquoi (`feedback_motif`) : c'est la seule valeur qui éteint S84 sans que personne n'ait rien relu |
| `S112` | correction d'une source non reliée ou laissée sans relecture | déclarée comme correction d'elle-même : une correction vient d'un autre échange · corrigée par …, et pourtant déclarée « sans objet » en relecture : une source dont on sait que ce qu'on en avait compris était faux est la première à faire relire |
| `S114` | coordonnée dans l'état versionné, ou canal annoncé sans coordonnée | `joignable_par` porte … : ce champ dit par quoi on la joint, pas avec quoi — l'état se commite et `freeze-version.mjs` en fige une copie sous `versions/`, d'où rien ne se reprend. La coordonnée va dans `contacts.yaml`, à côté de l'état, que `.gitignore` exclut · déclarée joignable par « … » et aucun `contacts.yaml` à côté de l'état : le canal est annoncé, la coordonnée n'existe nulle part — personne ne peut la joindre · déclarée joignable par « … », et `contacts.yaml` ne porte rien à son identifiant : le canal est annoncé, la coordonnée n'y est pas |
| `S115` | sollicitation déclarée sans sa date ou sans son canal | porte une date de sollicitation et le statut « … » : la date ne se lit que sur « sollicitée », ailleurs elle donne l'air d'une question en vol qui n'en est pas une · déclarée « sollicitée » sans dire quand (`sollicitee_le`, AAAA-MM-JJ) : c'est toi qui écris le champ, et une sollicitation qu'on ne peut pas vérifier est une case cochée — sans la date elle compte comme si personne ne lui avait jamais écrit · déclarée « sollicitée » sans dire par quoi (`joignable_par`) : une question partie sans canal ne se relance pas, et personne ne sait où aller chercher la réponse · sollicitée le … sans dire sur quoi (`sollicitee_zone`) : au tour suivant, rien ne permet de savoir si sa réponse portait sur la question posée — et c'est à elle qu'on finit par demander de le deviner · porte `sollicitee_zone: …` sans date de départ (`sollicitee_le`) : une question qu'on dit partie sans dire quand ne se relance pas et ne compte pour rien · sollicitée sur …, qui est adressée à … (`ask_to`) : on lui a posé la question de quelqu'un d'autre, et sa réponse sera consignée comme si elle valait pour l'autre · déclarée « interrogée » et écrite le …, et aucune source ne la porte comme locutrice : le statut dit qu'elle a parlé, le dossier ne garde rien de ce qu'elle a dit · écrite le …, et aucune de ses … source(s) ne porte de date : on ne peut pas savoir si elle a répondu depuis — donc ni relancer, ni enchaîner. Date la source qui vient d'elle |
| `S116` | indisponibilité déclarée sans dire laquelle | déclarée « non disponible » sans dire pourquoi (`indisponible_motif`) : le mot couvre quatre situations — elle n'a jamais répondu, elle a refusé, elle est absente, ou nous avons renoncé —, et seule la dernière est de notre faute. Les confondre efface celle qui nous concerne · porte un motif d'indisponibilité et le statut « … » : le motif ne se lit que sur « non disponible », ailleurs il donne l'air d'un renoncement qui n'a pas eu lieu · déclarée avoir refusé, et aucune source ne porte sa parole : un refus est ce qu'elle a dit, et ça se cite. Rapporté par un tiers, c'est une affirmation sur elle — consigne ses mots, ou dis que le refus est rapporté |
| `S117` | question laissée en vol au-delà du seuil, sans décision | question en vol depuis … jour(s), au-delà du seuil de … (`settings.relance.agir`) : ce n'est plus une question qui vit, c'est une question que personne ne suit, et la porte cessait de la compter. Trois issues, et c'est l'utilisateur qui tranche : attendre encore en le disant, relancer une fois (`reach-out.mjs --relance`), ou renoncer — `non disponible` avec son motif. Le premier seuil, celui qui dit seulement de le signaler, est à … jour(s) |
| `S118` | renvoi interne dans ce qu'on rend à la personne en relecture | … source(s) de parole recueillie sur … portent un renvoi interne dans `quote` ou `understood` (…) : `understood` est ce qu'on REND à la personne en relecture, pas une note à soi-même — elle n'a pas l'index sous les yeux et ne l'aura jamais. `review-sources.mjs --sh <id> --message` les nomme toutes, et refuse d'envoyer tant qu'elles sont là |
| `S119` | passage de `posee` sans sa date ou sans son canal | passage n° … de `posee` sans date lisible (`date`, AAAA-MM-JJ…) : une question dont on dit qu'elle est partie sans dire quand ne compte ni pour la répétition ni pour l'attente · passage n° … de `posee` sans dire par quoi (`canal`) : de vive voix ou par écrit n'engage ni la même attente ni la même trace — et sans le canal, rien ne distingue une question dite d'une question envoyée |
| `S120` | question reposée au-delà du seuil, et toujours sans réponse | posée … fois…, et toujours sans réponse : au-delà de … fois ce n'est plus une question qui vit, c'est un constat — la reposer use la personne sans rien produire. Deux issues, et c'est l'utilisateur qui tranche : l'assumer (`status: assumée` avec sa raison, portée par un risque ou une hypothèse), ou décider autrement |
| `S121` | zone résolue par une réponse sans dire quand la question est partie | … zone(s) sur … dont la résolution nomme une source ne disent pas quand la question est partie (`posee`) : …. Quelqu'un a répondu, donc quelqu'un a demandé — et rien ne dit quand, ni par quoi, ni combien de fois. C'est la seule chronologie que le dossier pourrait avoir : sans elle, on ne sait pas ce qui a été appris quand, ni depuis combien de temps une question attend |
| `S122` | entrée de la cartographie qui ne dit pas combien de personnes elle vaut | `personnes: …` n'est pas un nombre de personnes : un entier d'au moins 1, ou rien du tout · sans nom, et sans dire combien de personnes elle vaut (`personnes`) : une entrée qui ne désigne personne peut en valoir une ou cinq, et la couverture la compte pour une. Un nom, ou un effectif |
| `S123` | entrée collective dont le statut parle pour tout le monde | `entendues: …` n'est pas un nombre de personnes entendues : un entier d'au moins 0, ou rien du tout · vaut … personnes et se déclare « interrogée » sans dire combien d'entre elles ont parlé (`entendues`) : un statut ne se divise pas, et en avoir entendu une sur … n'est pas avoir entendu le groupe · … personne(s) entendue(s) pour un effectif de … : l'un des deux nombres est faux · … personne(s) entendue(s) et un statut qui dit le contraire (`…`) : dès qu'une seule a parlé, l'entrée est « interrogée » et `entendues` dit combien |
| `S124` | trace de porte dont le compte ne concorde pas avec ses dérogations | `gate` ne dit pas combien de conditions étaient tenues sur combien de mesurées (« … ») : recopie la ligne de `status.mjs`, « X condition(s) tenue(s) sur Y mesurée(s) », sinon la trace ne se relit pas — on ne sait plus si la porte en avait Y ou si le catalogue a bougé depuis · porte franchie sans dire ce que la porte disait au passage (`gate`) : la ligne de `status.mjs`, « X condition(s) tenue(s) sur Y mesurée(s) ». Sans elle, le journal dit qu'on est passé et rien ne dit à quel prix · `gate` annonce … condition(s) tenue(s) sur … mesurée(s) : on ne tient pas plus de conditions que la porte n'en mesure · `gate` annonce … condition(s) tenue(s) sur …, donc … non tenue(s), et `waived` en nomme … : …. Une condition non tenue se dérogue nommément, avec sa raison, ou elle n'est pas franchie |
| `S125` | sollicitation écrite inscrite sur la personne et pas sur la question | … porte `sollicitee_zone: …`…, et `posee` est vide : on a inscrit sur la personne ce qu'on n'a pas inscrit sur la question. Un passage par départ — `- { date: "AAAA-MM-JJ", canal: "…" }` —, sinon rien ne dit combien de fois celle-ci est partie, et une zone ouverte a l'air neuve |
| `S126` | contact parti sans que l'autorisation de l'utilisateur soit écrite | autorisation n° … de `contact_autorise` sans dire par quel outil (`outil`) : autoriser « un contact » n'autorise rien de précis — un courriel n'est pas un WhatsApp sur un numéro personnel · autorisation d'écrire par « … » sans date lisible (`le`, AAAA-MM-JJ…) : une autorisation qu'on ne peut pas situer dans le temps ne se vérifie pas, et une décision invérifiable est une case cochée · sollicitée par « … » sans que rien n'autorise de lui écrire par cet outil (`contact_autorise`) : l'option est celle de l'utilisateur, pas celle de la personne au bout, qui n'a rien choisi. Sa décision s'écrit — `- { outil: …, le: "AAAA-MM-JJ" }` — et par OUTIL, parce qu'autoriser un courriel n'autorise pas un message sur un numéro personnel |
| `S127` | contact disponible, question en attente, et rien n'est jamais parti | joignable par « … », sa coordonnée est dans `contacts.yaml`, … (…) — et aucune sollicitation n'est jamais partie. Tout ce qu'il faut pour écrire est là : `reach-out.mjs --sh …`. Si le script refuse, son refus nomme ce qui manque, et ce qui manque est une question à poser à l'utilisateur, pas une raison de renoncer |
| `S128` | identifiant cité dans une phrase qui ne mène nulle part, ou attribution qui contredit le registre | cite … dans son texte, et … n'existe pas dans l'état : un renvoi écrit dans la phrase se suit comme les autres, et celui-là ne mène nulle part · attribue … à « … » dans son texte, et … ne porte aucun locuteur (`stakeholders`) : le nom écrit à la main est la seule trace de qui a parlé, et rien ne le confirme · attribue … à « … » dans son texte, quand le registre donne … : la même parole est écrite deux fois, et les deux écritures se contredisent |

## Garde-fous de l'export (6)

Appliqués par `plan-operations.mjs` au contenu qui sort du dépôt vers un outil tiers (GitHub, Jira). Ils masquent ou signalent **avant** l'export : ce qui part ne revient pas. `G5` n'a pas de détecteur — il est tenu par construction, puisque seuls les éléments validés sont exportés.

| Code | Garde-fou | Ce que dit le constat |
|---|---|---|
| `G1` | secrets | secret probable masqué |
| `G2` | chemins locaux | chemin local masqué |
| `G3` | adresses électroniques | adresse électronique masquée |
| `G4` | références non résolues | référence non résolue ou marque TODO/TBD |
| `G5` | contenu non validé (exclu en amont : seuls les éléments validés sont exportés) | _tenu par construction_ |
| `G6` | longueurs maximales | tronqué à … caractères |

## Index des règles de structure

Chaque règle, les étapes où elle s'applique, et la fonction du catalogue qui l'émet. Les étapes sont déduites du graphe d'appel, pas d'une table tenue à la main.

| Code | Étapes | Objet | Émise par |
|---|---|---|---|
| `S00` | 1, 2, 3, 4 | document hors du catalogue | `checkState` |
| `S01` | 1, 2 | objectif non mesurable | `checkBrd`, `checkPrd` |
| `S02` | 1 | exigence sans objectif | `checkBrd` |
| `S03` | 1 | exigence sans besoin sourcé | `checkBrd` |
| `S04` | 1, 2 | exigence sans critère d'acceptation | `checkBrd`, `checkPrd` |
| `S05` | 1, 2 | priorité ou release manquante | `checkBrd`, `checkPrd` |
| `S06` | 2 | exigence sans origine | `checkPrd` |
| `S07` | 2 | Must sans scénario d'erreur | `checkPrd` |
| `S08` | 2 | NFR incomplète | `checkPrd` |
| `S09` | 1, 2, 3, 4 | référence inexistante | `checkPlan`, `checkPrd`, `checkRepresentation`, `checkSad`, `confirmationFindings`, `contactFindings`, `interviewFindings`, `relectureFindings`, `renvoiFindings`, `sollicitationFindings` |
| `S10` | 1, 2 | référence vers un élément abandonné | `deadRefs` |
| `S11` | 1 | règle métier sans source | `checkBrd` |
| `S12` | 1 | règle sans niveau d'application | `checkBrd` |
| `S13` | 1 | règle sans responsable | `checkBrd` |
| `S14` | 1 | contradiction non qualifiée | `checkBrd` |
| `S15` | 1, 2 | conflit d'intérêts sans arbitre | `checkBrd`, `checkPrd` |
| `S16` | 1, 2 | arbitre partie au conflit | `checkBrd`, `checkPrd` |
| `S17` | 1, 2, 3 | décision sans décideur | `checkBrd`, `checkPrd`, `checkSad` |
| `S18` | 1 | décision sans alternative | `checkBrd` |
| `S19` | 1 | opposant puissant sans risque | `checkBrd` |
| `S20` | 2 | règle automatisée non couverte | `checkPrd` |
| `S21` | 3 | moteur sans origine | `checkSad` |
| `S22` | 3 | scénario sans mesure | `checkSad` |
| `S23` | 3 | ADR à option unique | `checkSad` |
| `S24` | 3 | ADR sans moteur | `checkSad` |
| `S25` | 3 | ADR sans conséquence négative ou confirmation | `checkSad` |
| `S26` | 3 | FR non allouée | `checkSad` |
| `S27` | 3 | NFR sans réponse ou vérification | `checkSad` |
| `S28` | 3 | existant sans preuve | `checkSad` |
| `S29` | 3 | opération sans FR | `checkSad` |
| `S30` | 3 | donnée incomplète | `checkSad` |
| `S31` | 3 | donnée sensible sans menace I | `checkSad` |
| `S32` | 3 | menace non traitée | `checkSad` |
| `S33` | 3 | nom d'élément dupliqué | `checkSad` |
| `S34` | 3 | parent C4 incohérent | `checkSad` |
| `S35` | 3 | règle sans agrégat | `checkSad` |
| `S36` | 3 | remplacé sans remplaçant | `checkSad` |
| `S37` | 4 | story sans FR | `checkPlan` |
| `S38` | 4 | story hors story map | `checkPlan` |
| `S39` | 4 | FR de la release sans story | `checkPlan` |
| `S40` | 4 | tâche planifiée, story non prête | `checkPlan` |
| `S41` | 4 | règle sans exemple | `checkPlan` |
| `S42` | 4 | story à scinder | `checkPlan` |
| `S43` | 4 | taille XL | `checkPlan` |
| `S44` | 4 | tâche sans story ou spike sans hypothèse | `checkPlan` |
| `S45` | 4 | affectation agent non conforme | `checkPlan` |
| `S46` | 4 | dépendances circulaires | `checkPlan` |
| `S47` | 4 | tâche avant sa dépendance | `checkPlan` |
| `S48` | 4 | capacité d'itération | `checkPlan` |
| `S49` | 4 | limite d'encours | `checkPlan` |
| `S50` | 4 | exemple incomplet | `checkPlan` |
| `S51` | 4 | mesure, vérification ou spike non planifié | `checkPlan` |
| `S52` | 4 | règle sans référence amont | `checkPlan` |
| `S53` | 1, 2, 3, 4 | handoff amont altéré | `handoffFindings` |
| `S54` | 1, 2, 3, 4 | seuil de couverture non atteint | `coverageFindings` |
| `S55` | 3 | mesure de sécurité sans contrôle de référence | `checkSad` |
| `S56` | 1 | opportunité non décidée | `checkBrd` |
| `S57` | 2 | hypothèse risquée non testée | `checkPrd` |
| `S58` | 4 | itération sans revue | `checkPlan` |
| `S59` | 4 | release sans mesure des outcomes | `checkPlan` |
| `S60` | 4 | voie rapide non conforme | `checkPlan` |
| `S61` | 4 | ordre ouverture, milieu, fin | `checkPlan` |
| `S62` | 4 | story sans titre court | `checkPlan` |
| `S63` | 1 | exigence à source unique | `checkBrd` |
| `S64` | 1 | exigence sans source | `checkBrd` |
| `S65` | 1 | porte de synthèse | `checkBrd` |
| `S66` | 1 | exigence de transition incomplète | `checkBrd` |
| `S67` | 2 | exploration de concepts | `checkPrd` |
| `S68` | 1, 2, 3, 4 | espace réservé resté | `placeholderFindings` |
| `S69` | 1, 2, 3, 4 | chiffre sans source | `unsourcedNumberFindings` |
| `S70` | 1, 2, 3, 4 | fiche de contexte trop longue | `contextFindings` |
| `S71` | 3 | ADR sans règle | `checkSad` |
| `S72` | 4 | collision entre tâches | `checkPlan` |
| `S73` | 2 | comportement existant à préserver | `checkPrd` |
| `S74` | 4 | taille et risque calculé | `checkPlan` |
| `S75` | 4 | attention humaine dépassée | `checkPlan` |
| `S76` | 4 | tâche non finie sans décision | `checkPlan` |
| `S77` | 4 | action de rétrospective sans suivi | `checkPlan` |
| `S78` | 4 | voie rapide sans épopée | `checkPlan` |
| `S79` | 1, 2, 3, 4 | constitution | `constitutionFindings` |
| `S80` | 1, 2, 3, 4 | liste de contrôle de relecture | `checklistFindings` |
| `S81` | 1, 2 | source sans personne entendue | `checkSources` |
| `S82` | 2 | métrique et objectif désaccordés | `checkPrd` |
| `S83` | 1 | aucun utilisateur direct entendu | `checkBrd` |
| `S84` | 1, 2 | exigence jamais relue par la source | `checkBrd`, `checkPrd` |
| `S85` | 2 | motif EARS absent ou désaccordé | `checkPrd` |
| `S86` | 1 | provenance d'initiative incomplète ou hors énumération | `checkBrd` |
| `S87` | 1, 2 | présent sans avoir parlé | `checkSources` |
| `S88` | 1, 2, 3, 4 | valeur hors énumération ou « autre » sans libellé | `checkEnum` |
| `S89` | 1 | droit de décision sans décideur ou confirmé par lui-même | `checkBrd` |
| `S90` | 1, 2 | décision rendue au nom de quelqu'un qu'on n'a pas entendu | `rendueParAbsent` |
| `S91` | 1, 2 | locuteur absent de la salle qu'il a fait parler | `checkSources` |
| `S92` | 1 | quadrant d'implication affirmé au lieu d'être déduit | `checkBrd` |
| `S93` | 1 | influence inconnue à fort pouvoir, sans attitude notée | `checkBrd` |
| `S94` | 1, 2 | représentation non déclarée, ou tenue pour une voix | `checkRepresentation` |
| `S95` | 1 | besoin sans porteur, ou porté par une voix jamais entendue | `checkBrd` |
| `S96` | 1, 2, 3, 4 | guide d'entretien pour quelqu'un qui est dans la salle | `interviewFindings` |
| `S97` | 1 | hypothèse à vérifier sans moyen de vérification | `checkBrd` |
| `S98` | 1, 2, 3, 4 | relecteur ou approbateur jamais entendu | `governanceFindings` |
| `S99` | 1, 2, 3, 4 | cycle de revue sans échéance, ou retour non tranché | `governanceFindings` |
| `S100` | 1, 2, 3, 4 | porte de phase franchie sans trace | `phaseFindings` |
| `S101` | 1, 2, 3, 4 | passage de phase sans décideur, date ou source | `phaseFindings` |
| `S102` | 1, 2, 3, 4 | source de parole sans ce qui a été dit | `sourceContentFindings` |
| `S103` | 1, 2, 3, 4 | confirmation non rattachée à ce qu'elle confirme | `confirmationFindings` |
| `S104` | 1, 2, 3, 4 | document sortant parlant par adresses | `outgoingFindings` |
| `S105` | 1, 2, 3, 4 | seuil qui éteint une mesure sans dérogation nommée | `coverageFindings` |
| `S106` | 1, 2, 3, 4 | dérogation de seuil sans raison ou sans approbateur | `coverageFindings` |
| `S107` | 1, 2, 3, 4 | ancien nom de champ pour les seuils ou les dérogations | `coverageFindings` |
| `S108` | 1, 2, 3, 4 | construit sur un handoff amont qui n'était pas une baseline | `upstreamFindings` |
| `S109` | 1, 2, 3, 4 | risque consigné sans être apprécié | `riskFindings` |
| `S110` | 1, 2 | représentation sans la source où elle se dit | `checkRepresentation` |
| `S111` | 1, 2, 3, 4 | relecture « sans objet » sur une parole, sans raison | `relectureFindings` |
| `S112` | 1, 2, 3, 4 | correction d'une source non reliée ou laissée sans relecture | `relectureFindings` |
| `S113` | 1 | utilisateur direct qu'aucun besoin ne concerne | `checkBrd` |
| `S114` | 1, 2, 3, 4 | coordonnée dans l'état versionné, ou canal annoncé sans coordonnée | `contactFindings` |
| `S115` | 1, 2, 3, 4 | sollicitation déclarée sans sa date ou sans son canal | `sollicitationFindings` |
| `S116` | 1, 2, 3, 4 | indisponibilité déclarée sans dire laquelle | `sollicitationFindings` |
| `S117` | 1, 2, 3, 4 | question laissée en vol au-delà du seuil, sans décision | `sollicitationFindings` |
| `S118` | 1, 2, 3, 4 | renvoi interne dans ce qu'on rend à la personne en relecture | `understoodFindings` |
| `S119` | 1, 2, 3, 4 | passage de `posee` sans sa date ou sans son canal | `questionPoseeFindings` |
| `S120` | 1, 2, 3, 4 | question reposée au-delà du seuil, et toujours sans réponse | `questionPoseeFindings` |
| `S121` | 1, 2, 3, 4 | zone résolue par une réponse sans dire quand la question est partie | `questionPoseeFindings` |
| `S122` | 1, 2, 3, 4 | entrée de la cartographie qui ne dit pas combien de personnes elle vaut | `effectifFindings` |
| `S123` | 1, 2, 3, 4 | entrée collective dont le statut parle pour tout le monde | `effectifFindings` |
| `S124` | 1, 2, 3, 4 | trace de porte dont le compte ne concorde pas avec ses dérogations | `phaseFindings` |
| `S125` | 1, 2, 3, 4 | sollicitation écrite inscrite sur la personne et pas sur la question | `questionPoseeFindings` |
| `S126` | 1, 2, 3, 4 | contact parti sans que l'autorisation de l'utilisateur soit écrite | `autorisationFindings` |
| `S127` | 1, 2, 3, 4 | contact disponible, question en attente, et rien n'est jamais parti | `contactFindings` |
| `S128` | 1, 2, 3, 4 | identifiant cité dans une phrase qui ne mène nulle part, ou attribution qui contredit le registre | `proseFindings` |
| `S129` | 4 | story sans qui, quoi ou pourquoi | `checkPlan` |
