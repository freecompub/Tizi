# Handoff BRD → PRD — Dossiers complets (BRD v1.0)

Généré le 2026-10-20 à partir de la version figée. Le PRD doit couvrir les exigences ci-dessous et en conserver les identifiants.

## Problème

Trop de dossiers transmis incomplets.

## Objectifs

| ID | Objectif | Indicateur | Cible | Responsable |
|---|---|---|---|---|
| OBJ-01 | Réduire les rejets | taux de rejet | 2 % | Alice (SH-01) |

## Exigences métier à couvrir

### BR-001 — Must

Le service doit pouvoir identifier rapidement les dossiers incomplets et les signaler sur un écran.

Objectifs : OBJ-01

- Critère : Moins de 2 % de dossiers rejetés…

## Règles métier

Le PRD décide lesquelles automatiser ; chaque règle automatisée doit être couverte par une exigence fonctionnelle.

| ID | Règle | Type | Application | Responsable |
|---|---|---|---|---|
| RG-001 | Un dossier ne doit pas être transmis sans justificatif de domicile. | comportement | stricte | Alice (SH-01) |
| RG-002 | Le délai de relance est de 5 jours ouvrés. | comportement | — | — |

## Droits de décision

| Domaine | Décideur | Recours |
|---|---|---|
| perimetre | Alice (SH-01) | — |
| priorites | Alice (SH-01) | SH-09 |

## Points de vigilance pour le PRD

### Hypothèses encore à vérifier

_Aucun élément._

### Risques

_Aucun élément._

### Zones d'ombre assumées

_Aucun élément._

## Périmètre

**Inclus**

- Transmission des dossiers

**Exclu**

_Aucun élément._

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| Exigences métier rattachées à un objectif | 2/2 | 100 % | 100 % | atteint |
| Exigences métier avec critère d'acceptation | 1/2 | 50 % | 100 % | **non atteint** |
| Objectifs servis par au moins une exigence | 1/1 | 100 % | 100 % | atteint |

Empreinte SHA-256 de handoff.yaml : `d69a003919e2996330a89ab4633d4588003ad85b302ed820e247f470ac91b663`. L'étape suivante la vérifie avec verify-handoff.mjs avant d'ingérer.
