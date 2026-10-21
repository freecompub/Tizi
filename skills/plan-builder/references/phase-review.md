# Phase Review (fin d'itération et après release)

**But** : apprendre de tout ce qu'on construit — la qualité du produit, la justesse du plan, la façon de travailler — puis vérifier après chaque release que les outcomes visés sont atteints. C'est aussi là que la capacité de l'équipe se calibre, y compris quand une partie des tâches va à des agents.

Source : Jeff Patton, *User Story Mapping*, ch. 9, 11 et 18 (revue d'équipe, revue avec les parties prenantes, maturité de release, mesure des outcomes), reformulé.

En sprint, cette phase se joue à chaque fin d'itération ; en flux, à intervalle régulier (toutes les deux semaines par défaut) et à chaque release. Elle s'enchaîne ensuite sur Refine et Schedule pour la suite.

## Scripts

| Script | Rôle | Sortie |
|---|---|---|
| `sprint-review.mjs plan/<slug>/state.yaml --iteration IT-n` | Fiches de revue d'équipe et de revue avec les parties prenantes, avec les chiffres calculés | `review/IT-n/equipe.md`, `parties-prenantes.md` |
| `render-plan.mjs` | Vélocité, travail commencé non fini, capacité suggérée, maturité de release, mesure des outcomes | `plan.md` |

## 1. Revue d'équipe (d'abord, sans les parties prenantes)

Avec ceux qui ont construit : PO, développeurs, testeurs, et les humains qui ont relu le travail des agents. C'est un lieu sûr pour parler franchement.

**Le produit.** Essayer tout ce qui a été construit. Faire noter par l'équipe, de 1 à 5 :
- la qualité de l'**expérience** (simple, agréable, cohérente) ;
- la qualité **fonctionnelle** (fait ce qui était convenu, sans défauts ; les testeurs en attendent-ils d'autres ?) ;
- la qualité du **code** (facile à maintenir, ou dette ajoutée ?).

Chaque défaut ou amélioration repéré devient une story, souvent en voie rapide (`references/fast-lane.md`). Séparer deux questions : a-t-on construit ce qui était convenu ? puis, maintenant qu'on le voit, faut-il le changer ?

**Le plan.** L'équipe décide quelles tâches sont réellement finies au sens de la Definition of Done ; ce débat construit une définition partagée. Le script calcule ensuite :
- la **vélocité** : le poids des tâches finies dans l'itération ;
- le **reste** : le poids des tâches commencées ou planifiées et non finies ;
- la part réalisée par des agents, et la **charge de relecture** que leurs tâches ont demandée aux humains (`review_size`).

**La façon de travailler.** Garder ou abandonner les changements essayés au cycle précédent ; en choisir un ou deux à essayer, pas plus.

Enregistre la revue dans `iterations[].review.team` : notes, constats, décisions sur le processus. Une note n'est enregistrée que si l'équipe l'a donnée.

## 2. Revue avec les parties prenantes

Ouverte à toute personne intéressée. Elle porte sur deux choses :
- **le travail de découverte** : hypothèses testées, résultats, ce qu'on a appris des utilisateurs. Seul un fait vérifié l'emporte sur une opinion ;
- **la progression vers la release**, solution par solution : pour qui, quel outcome, ce qui est construit, pourquoi c'est encore incomplet (une stratégie ouverture–milieu–fin montre une esquisse, pas un coin fini), ce qui reste.

Chaque story montrée l'est comme prévu dans son champ `demo`. Les suggestions sont accueillies ; celles qui ne servent pas l'outcome visé sont rappelées à cet outcome et rejoignent, si elles valent la peine, le portefeuille d'opportunités du BRD.

Enregistre les retours dans `iterations[].review.stakeholders`.

## 3. Calibrer la capacité

`render-plan.mjs` propose une capacité pour l'itération suivante : la moyenne des vélocités des trois dernières itérations revues. Quand une partie des tâches va à des agents, la capacité **humaine** compte à la fois les tâches réalisées par des humains et la relecture des tâches d'agents : c'est souvent la relecture, pas la génération du code, qui limite le débit. La proposition reste une proposition : l'équipe fixe sa capacité.

## 4. Maturité de release

Avant une date de livraison promise, pour chaque activité de la story map : « si l'on devait livrer maintenant, quelle note donnerait-on ? » (A à F). Le bulletin (`release_tracking[].readiness`) montre où concentrer les dernières semaines : sur l'activité notée D, pas sur l'amélioration de celle notée A.

## 5. Après la release : mesurer les outcomes

Les outcomes ne sont jamais acquis. Pour chaque release, **avant** de livrer, décide avec l'équipe (`release_tracking[].measurement`) :
- quelles métriques du PRD (`MET-xx`) on suivra, comment, et sur quelle fenêtre ;
- quand et comment on **observera** des utilisateurs réels utiliser la release.

Après la livraison, enregistre les observations et une conclusion (`outcome` : `atteint`, `partiel`, `non_atteint`). Chaque apprentissage devient soit une story (souvent en voie rapide), soit une **nouvelle opportunité** à faire évaluer dans le BRD. Les améliorations faites après une release sont souvent les plus précieuses. `lint.mjs` signale une release livrée sans plan de mesure (règle S59).
