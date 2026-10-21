# Handoff PRD → conception et planification — Dossiers complets (PRD v1.0)

Généré le 2026-10-20 à partir de la version figée, issue du BRD v1.0. La conception et la planification conservent les identifiants FR, NFR et AC.

## REL-1 — MVP

Hypothèse testée : — · Signal : —

### FR-001 — Must

Si un agent transmet un dossier sans justificatif, le système doit refuser la transmission et stocker l'événement en base de données.

Origine BRD : BR-001

- AC-001 (nominal) — Refus

### FR-002 — Should

Quand un dossier est transmis, le système doit notifier le partenaire.

Origine BRD : —

_Aucun élément._

## Exigences non fonctionnelles

| ID | Catégorie | Exigence | Cible | Portée |
|---|---|---|---|---|
| NFR-001 | performance | Le contrôle doit être rapide. | — | globale |

## Contraintes

_Aucun élément._

## Décisions produit

| ID | Décision | Justification | Décidé par |
|---|---|---|---|
| DD-01 | Agent | proximité | Alice |

## Règles métier à faire respecter

Les règles automatisées doivent pouvoir évoluer sans réécrire le produit : la conception en tiendra compte.

| ID | Règle | Type | Application | Automatisation |
|---|---|---|---|---|
| RG-001 | Un dossier ne doit pas être transmis sans justificatif de domicile. | comportement | stricte | automatisée |
| RG-003 | Le délai de relance est de 5 jours ouvrés. | definition | — | automatisée |

## Instrumentation à prévoir

_Aucun élément._

## Points de vigilance

### Hypothèses à vérifier

_Aucun élément._

### Risques

_Aucun élément._

### Zones d'ombre assumées

_Aucun élément._

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| FR avec au moins un critère d'acceptation | 1/2 | 50 % | 100 % | **non atteint** |
| FR rattachées à un objectif produit | 2/2 | 100 % | 100 % | atteint |
| FR Must avec un scénario d'erreur | 0/1 | 0 % | 100 % | **non atteint** |
| Exigences du BRD couvertes par une FR ou une NFR | 1/1 | 100 % | 100 % | atteint |

Empreinte SHA-256 de handoff.yaml : `25bd155232b261f8f657e47c7beb6ef2faf76efb282b57faef32a320cdbdffba`. L'étape suivante la vérifie avec verify-handoff.mjs avant d'ingérer.
