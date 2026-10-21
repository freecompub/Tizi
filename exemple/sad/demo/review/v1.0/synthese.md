# Synthèse pour la revue d'architecture — Dossiers complets (v1.0)

Préparée le 2026-10-20. Le SAD complet et les ADR accompagnent cette synthèse. La revue porte sur les décisions et leurs compromis.

**Contexte** : brownfield — **PRD** : v1.0

## Moteurs principaux

| ID | Type | Mesure | Servi par |
|---|---|---|---|
| AD-01 | performance | p95 < 2 s | ADR-001, NR-01 |
| AD-02 | conformite | — | **rien** |

## Décisions et ce qu'elles sacrifient

| ADR | Décision | Option retenue | Conséquences négatives | Décidé par |
|---|---|---|---|---|
| ADR-001 | Notifier le partenaire par un worker asynchrone | Worker asynchrone | exploitation d'un worker | Alice |

## Menaces acceptées

| ID | Menace | Accepté par |
|---|---|---|
| TH-002 | file saturée | — |

## Hypothèses encore à prouver

- H-001 — Le partenaire accepte un webhook (spike : appel de test)

## Grille par pilier

Preuves rassemblées depuis l'état ; l'appréciation revient aux relecteurs.

| Pilier | Moteurs | ADR | Vérifications | Menaces | Appréciation |
|---|---|---|---|---|---|
| Fiabilité | **aucun** | — | — | 1 | à apprécier |
| Sécurité | AD-02 | — | — | 1 | à apprécier |
| Optimisation des coûts | **aucun** | — | — | — | à apprécier |
| Excellence opérationnelle | **aucun** | — | — | — | à apprécier |
| Efficacité des performances | AD-01 | ADR-001 | NR-01 | — | à apprécier |

## Points à trancher

_Aucun élément._
