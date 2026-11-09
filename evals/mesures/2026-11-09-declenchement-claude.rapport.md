# Déclenchement des skills — claude — 2026-11-09

5 passe(s) par requête ; un skill est retenu s'il s'active dans au moins 50 % des passes. Améliorer les descriptions à partir des échecs de l'**entraînement** seulement ; juger sur le **test**.

## Entraînement (19 requêtes, 16 correctes)

| Skill | Précision | Rappel | Faux négatifs | Faux positifs |
|---|---|---|---|---|
| audit-builder | 1.00 | 1.00 | 0 | 0 |
| backlog-executor | 1.00 | 0.50 | 1 | 0 |
| brd-builder | 1.00 | 1.00 | 0 | 0 |
| impl-builder | 1.00 | 0.50 | 1 | 0 |
| plan-builder | 1.00 | 1.00 | 0 | 0 |
| prd-builder | 1.00 | 1.00 | 0 | 0 |
| sad-builder | 1.00 | 0.50 | 1 | 0 |
| test-builder | 1.00 | 1.00 | 0 | 0 |

Requêtes qui ne devaient rien déclencher : 3/3 sont restées sans skill.

## Test (6 requêtes, 5 correctes)

| Skill | Précision | Rappel | Faux négatifs | Faux positifs |
|---|---|---|---|---|
| audit-builder | 1.00 | 1.00 | 0 | 0 |
| backlog-executor | — | — | 0 | 0 |
| brd-builder | 1.00 | 1.00 | 0 | 0 |
| impl-builder | — | 0.00 | 1 | 0 |
| plan-builder | 1.00 | 1.00 | 0 | 0 |
| prd-builder | — | — | 0 | 0 |
| sad-builder | — | — | 0 | 0 |
| test-builder | — | — | 0 | 0 |

Requêtes qui ne devaient rien déclencher : 2/2 sont restées sans skill.

## Échecs de l'entraînement

- attendu **sad-builder**, obtenu **aucun** : « Analyse l'existant de ce dépôt pour préparer la conception de la nouvelle fonctionnalité »
- attendu **backlog-executor**, obtenu **aucun** : « Crée directement les issues dans GitHub sans passer par un plan »
- attendu **impl-builder**, obtenu **aucun** : « Écris un test unitaire pour la fonction manquants() »

Erreurs d'intégrité : 1. Les échecs du test ne sont volontairement pas détaillés : les lire pour corriger une description fausserait la mesure suivante.
