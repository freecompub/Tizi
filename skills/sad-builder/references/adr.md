# Décisions d'architecture (ADR)

Les ADR suivent la structure de **MADR v4** ([adr.github.io/madr](https://adr.github.io/madr/), sous licences CC0 et MIT). La pratique des ADR vient de Michael Nygard (2011). `render-sad.mjs` génère un fichier par décision dans `adr/`, avec des intitulés en français.

## Quand écrire un ADR

Une question mérite un ADR si au moins un de ces critères s'applique :
- elle sert un **moteur architectural** (`AD-xx`) ;
- elle est **coûteuse à défaire** : changer d'avis exigerait de réécrire, migrer des données ou renégocier un contrat ;
- elle **contraint d'autres équipes** : un contrat, une plateforme, une convention partagée ;
- en brownfield, elle **conserve, enveloppe ou remplace** un élément existant.

Le reste se décide en conception détaillée, sans ADR.

## Structure (MADR v4)

| Section MADR | Champ de l'état | Règle |
|---|---|---|
| Titre | `title` | Le problème résolu et la solution retenue, en une ligne |
| Statut, date, décideurs | `status`, `date`, `decided_by` | Le décideur est déclaré par l'utilisateur |
| Contexte et énoncé du problème | `context` | 2 à 4 phrases, sans la solution |
| Moteurs de décision | `drivers` | Jamais vide : moteurs, contraintes ou règles |
| Options envisagées | `options` | Au moins deux, dont une non évidente |
| Résultat | `outcome`, `justification` | L'option retenue et pourquoi, au regard des moteurs |
| Conséquences | `consequences.good`, `consequences.bad` | Le négatif est obligatoire : toute décision sacrifie quelque chose |
| Confirmation | `confirmation` | Comment on vérifiera que le code respecte la décision : revue, test d'architecture, fitness function |
| Avantages et inconvénients des options | `options[].pros`, `options[].cons` | Rattachés aux moteurs |

## Statuts

```
proposé ──► accepté ──► déprécié
   │            └──────► remplacé (par un ADR qui le cite dans supersedes)
   └──► rejeté
```

- `proposé` : en discussion ; l'agent ne passe jamais lui-même à `accepté`.
- `accepté` : décidé par le décideur `architecture`. Il n'est plus réécrit.
- `rejeté` : le problème a été examiné et aucune option n'a été retenue, ou il ne se pose plus. Il reste dans l'historique.
- `déprécié` : il ne s'applique plus, sans remplaçant.
- `remplacé` : un nouvel ADR l'a remplacé.

## Pièges

- Un ADR à une seule option est une justification après coup, pas une décision.
- Un ADR qui choisit une technologie sans moteur ne dit pas pourquoi : on ne pourra pas savoir quand le remettre en cause.
- « Ne rien changer » est une option ; sa conséquence négative est souvent le moteur qu'elle ne sert pas.

## La décision comme règle

Une décision d'architecture sert à empêcher que des parties construites séparément divergent : deux équipes, deux agents, deux sprints qui feraient chacun un choix raisonnable mais différent. Chaque ADR accepté porte donc :

- **ce qu'il empêche** (`prevents`) : la divergence concrète qui se produirait sans lui (« chaque écran validerait les dossiers à sa façon ») ;
- **sa règle** (`rule`) : une phrase qu'un développeur ou un agent peut appliquer sans relire l'ADR (« toute validation de complétude passe par le composant CP-01 ; aucun autre composant ne lit les pièces d'un dossier ») ;
- **sa confirmation** (`confirmation`) : comment on vérifie que la règle est respectée, de préférence automatiquement (test d'architecture, vérification de forme), sinon en revue.

Une décision sans divergence à empêcher est peut-être une préférence, pas une décision d'architecture. Une règle impossible à vérifier ne protège rien. Idée reprise du « spine » d'architecture de BMAD-METHOD. La vérification de forme le signale (S71) ; la règle est transmise à l'implémentation, dans la fiche de contexte de chaque tâche concernée et à la revue de code.
