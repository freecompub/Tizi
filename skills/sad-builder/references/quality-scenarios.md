# Scénarios de qualité

Une NFR dit le niveau attendu ; un scénario de qualité dit **dans quelle situation** ce niveau doit être tenu. C'est ce qui rend un moteur architectural discutable et vérifiable. La forme en six parties vient de Bass, Clements et Kazman, *Software Architecture in Practice* (SEI) ; elle est reformulée ici.

## Les six parties

| Partie | Question | Exemple (disponibilité) |
|---|---|---|
| `source` | Qui ou quoi déclenche ? | Le serveur de base de données principal |
| `stimulus` | Que se passe-t-il ? | Tombe en panne |
| `environment` | Dans quelles conditions ? | En heures ouvrées, charge nominale |
| `artifact` | Quelle partie du système est touchée ? | Le service de transmission des dossiers |
| `response` | Que fait le système ? | Bascule sur la réplique, sans perte de dossier validé |
| `measure` | Comment juge-t-on la réponse ? | Service rétabli en moins de 60 s ; perte de données nulle |

## Règles

- La `measure` reprend la cible de la NFR d'origine. Si la NFR n'en a pas, la conception ne l'invente pas : zone `driver_non_mesurable`, adressée au product owner.
- Un scénario décrit une situation, pas une solution : « bascule sur la réplique » est une réponse attendue, pas un choix de produit de base de données.
- Une même NFR peut produire plusieurs scénarios (charge nominale, pic, mode dégradé). Un scénario de **mode dégradé** est souvent celui qui structure le plus.
- Pour l'évolutivité et la maintenabilité, le stimulus est un changement (« ajouter un nouveau type de dossier ») et la mesure un effort ou un périmètre touché (« un seul conteneur modifié, moins de 3 jours »).

## Prioriser

Coter chaque moteur sur deux axes, à la manière de l'arbre d'utilité d'ATAM (cité, non reproduit) :
- **importance** pour le métier : que coûte l'échec du scénario ?
- **difficulté** pour l'architecture : à quel point est-il dur à tenir ?

Les moteurs haute/haute passent en premier dans les décisions. Le SAD généré les présente en tableau trié.
