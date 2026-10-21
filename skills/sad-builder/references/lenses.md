# Lentilles du council (conception)

## securite
- **Regarde** : les frontières de confiance, les identités, les données sensibles.
- **Cherche** : flux non chiffrés ou non authentifiés, secrets, droits trop larges, données de santé ou personnelles exposées, menaces STRIDE non examinées, acceptations de risque sans décideur.

## exploitation
- **Regarde** : le système en production.
- **Cherche** : déploiement et retour arrière, observabilité (journaux, métriques, traces), sauvegarde et restauration, comportement en panne d'une dépendance, astreinte, vérifications prévues en exploitation.

## donnees-conformite
- **Regarde** : le cycle de vie des données.
- **Cherche** : propriétaire unique de chaque donnée, classification, conservation et effacement, localisation et hébergement, réplication non décidée, obligations réglementaires absentes du PRD.

## cout
- **Regarde** : ce que coûtent la construction et l'exploitation.
- **Cherche** : services facturés à l'usage sans plafond, surdimensionnement au regard des moteurs, licences, compétences rares, coût de l'option « ne rien changer » ignoré.

## evolutivite
- **Regarde** : le changement futur.
- **Cherche** : couplages entre contextes, base partagée non décidée, contrats sans stratégie de version, règles métier codées en dur loin de leur agrégat, ADR sans moyen de confirmation.

## developpeur
- **Regarde** : l'équipe qui va construire.
- **Cherche** : conteneurs sans équipe propriétaire, FR allouées de façon ambiguë, technologies nouvelles pour l'équipe sans spike, environnement local et tests difficiles à mettre en place.

## sceptique
- **Regarde** : la discipline de décision.
- **Cherche** : ADR à option unique ou sans conséquence négative, moteurs qui ne changent rien à la structure, éléments sans FR ni rôle, hypothèses présentées comme faits, complexité non justifiée par un moteur.
