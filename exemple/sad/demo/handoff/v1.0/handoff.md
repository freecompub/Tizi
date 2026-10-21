# Handoff conception → planification — Dossiers complets (SAD v1.0)

Généré le 2026-10-20 à partir de la version figée, issue du PRD v1.0. La planification conserve les identifiants (CT, CP, API, OP, NR, TH, ADR) pour préserver la traçabilité jusqu'au code.

## Éléments à construire ou à modifier

| ID | Élément | Cycle de vie | Technologie | Équipe | FR | Releases |
|---|---|---|---|---|---|---|
| CT-01 | Application web | existant_modifié | Next.js | Équipe web | FR-001 | REL-1 |
| CT-03 | Notificateur | nouveau | Node.js | Équipe web | FR-002 | REL-1 |
| CP-01 | Contrôle de complétude | nouveau | — | — | FR-001 | REL-1 |
| CP-02 | API dossiers | existant_modifié | — | — | — | — |

## Éléments remplacés ou retirés

| ID | Élément | Cycle de vie | Remplacé par |
|---|---|---|---|
| CT-04 | Ancien script cron | existant_remplacé | — |

## Spikes à mener avant les tickets qui en dépendent

- H-001 — Le partenaire accepte un webhook (spike : appel de test)

## Contrats

| ID | Interface | Type | Fournisseur | Opérations |
|---|---|---|---|---|
| API-01 | API dossiers | openapi | Application web | OP-001, OP-002 |
| API-02 | Événements dossiers | asyncapi | Application web | OP-003 |

## Vérifications des NFR, par étape

### tests

| Réponse | NFR | Méthode | Ce qui est vérifié |
|---|---|---|---|
| NR-01 | NFR-001 | test_charge | p95 transmission |

## Mesures de sécurité à réaliser

| Menace | STRIDE | Cible | Mesures |
|---|---|---|---|
| TH-001 | S | LNK-001 | sessions courtes ; MFA |

### Menaces acceptées

| Menace | Description | Accepté par |
|---|---|---|
| TH-002 | file saturée | — |

## Décisions à respecter

| ADR | Décision | Option retenue | Confirmation |
|---|---|---|---|
| ADR-001 | Notifier le partenaire par un worker asynchrone | Worker asynchrone | test de charge sur la transmission |

## Dette technique concernée

| ID | Dette | Impact |
|---|---|---|
| DT-01 | Pas de tests sur l'API dossiers | régressions |

## Points de vigilance

### Risques

_Aucun élément._

### Zones d'ombre assumées

_Aucun élément._

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| FR allouées à un conteneur ou composant | 2/2 | 100 % | 100 % | atteint |
| NFR avec une réponse de conception | 1/2 | 50 % | 100 % | **non atteint** |
| Moteurs servis par un ADR accepté ou une réponse | 1/2 | 50 % | 100 % | **non atteint** |

Empreinte SHA-256 de handoff.yaml : `6e57ea30ea3c8739499195cec7150584df2757d6cfbeeaa14b2a43ba6423eea6`. L'étape suivante la vérifie avec verify-handoff.mjs avant d'ingérer.
