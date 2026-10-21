# PRD — Dossiers complets

**Version** : 1.0 — **Statut** : baseline — **Mode** : chaîné (BRD v1.0)

> Document généré à partir de `state.yaml` le 2026-10-21. Ne pas le modifier directement : toute correction passe par l'état de session.

## Statut du document

| Section | Statut |
|---|---|
| Contexte et vision | à rédiger |
| Objectifs produit | à rédiger |
| Personas et parcours | à rédiger |
| Releases et MVP | à rédiger |
| Exigences fonctionnelles | à rédiger |
| Exigences non fonctionnelles | à rédiger |
| Contraintes et décisions | à rédiger |
| Métriques | à rédiger |
| Hypothèses et risques | à rédiger |
| Glossaire | à rédiger |

## 1. Contexte et vision

**Problème** : —

**Vision** : —

**BRD d'origine** : version 1.0 — `brd/demo/handoff/v1.0/handoff.yaml`

## 2. Objectifs produit

| ID | Objectif | KPI | Actuel → cible | Horizon | Objectifs BRD |
|---|---|---|---|---|---|
| GOAL-01 | Réduire les rejets | taux | — → 2 % | — | — |

## 3. Personas et parcours

### PER-01 — Chloé

**Rôle** : Agente · **Résultat recherché** : —

**Jobs-to-be-done**

_Aucun élément._

**Irritants**

_Aucun élément._

**Fondé sur** : —

### PJ-01 — Transmettre un dossier (Chloé)

1. Saisir
2. Vérifier
3. Transmettre

```mermaid
flowchart LR
  S0["Saisir"]
  S1["Vérifier"]
  S0 --> S1
  S2["Transmettre"]
  S1 --> S2
```

## 4. Releases et MVP

### REL-1 — MVP

| Critère | Valeur |
|---|---|
| Hypothèse testée | — |
| Valeur de bout en bout | — |
| Signal | — |
| Confinement | — |

### Concepts envisagés

_Idées de solution du point de vue de l'utilisateur, envisagées avant la story map. Ce ne sont pas des exigences. L'axe « faisable » n'est qu'une hypothèse, vérifiée en conception._

| ID | Concept | Désirable | Faisable (hypothèse) | Viable | Testé par | Décision | Raison |
|---|---|---|---|---|---|---|---|
| CPT-01 | **Blocage à la transmission** — L'agente ne peut pas transmettre un dossier incomplet | forte (SRC-001, SRC-002) | plausible ; contrôle synchrone à confirmer | moins de rejets | H-002 | retenu | seul concept qui agit avant l'envoi |
| CPT-02 | **Relecture par superviseur** — Un superviseur relit chaque dossier | faible : lenteur | simple | coût humain | — | écarté | trop lent (DD-02 du BRD) |

### Exigences de transition

| ID | Type | Exigence | Release | Achevée quand |
|---|---|---|---|---|
| TR-01 | formation | Former les agents | REL-1 | 90 % formés |

### Story map

| Activité | Tâche | Release | Parcours |
|---|---|---|---|
| ACT-01 Transmettre | T-01 Vérifier le dossier | REL-1 | PJ-01 |
| ACT-01 Transmettre | T-02 Prévenir le partenaire | REL-1 | PJ-01 |

### Périmètre

**Inclus**

_Aucun élément._

**Exclu**

_Aucun élément._

## 5. Exigences fonctionnelles

### FR-001 — Must — REL-1

Si un agent transmet un dossier sans justificatif, le système doit refuser la transmission et stocker l'événement en base de données.

Acteur : Chloé · Parcours : — · Objectifs : GOAL-01 · Origine : BR-001 · Règles : RG-001

```gherkin
Scénario: AC-001 — Refus
  Étant donné un dossier sans justificatif
  Quand l'agent transmet
  Alors la transmission est refusée
```

### FR-002 — Should — REL-1

Quand un dossier est transmis, le système doit notifier le partenaire.

Acteur : Chloé · Parcours : — · Objectifs : GOAL-01 · Origine : DD-01

_Aucun critère d’acceptation._

## 6. Exigences non fonctionnelles

| ID | Catégorie | Exigence | Métrique | Cible | Mesure | Portée | Priorité |
|---|---|---|---|---|---|---|---|
| NFR-001 | performance | Le contrôle doit être rapide. | — | — | — | globale | Must |

## 7. Contraintes et décisions produit

### Contraintes

_Aucun élément._

### Règles métier

| ID | Règle | Type | Application | Automatisation | FR |
|---|---|---|---|---|---|
| RG-001 | Un dossier ne doit pas être transmis sans justificatif de domicile. | comportement | stricte | automatisée | FR-001 |
| RG-003 | Le délai de relance est de 5 jours ouvrés. | definition | — | automatisée | **non couverte** |

### Décisions produit

| ID | Décision | Justification | Options écartées | Décidé par | Date |
|---|---|---|---|---|---|
| DD-01 | Agent | proximité | Superviseur | Alice | — |

### Droits de décision

| Domaine | Décideur | Recours |
|---|---|---|
| priorites | Alice | — |

## 8. Métriques et instrumentation

_Aucun élément._

## 9. Hypothèses et risques

### Hypothèses

| ID | Hypothèse | Type | Risque | Statut | Test | Critère de réussite | Résultat |
|---|---|---|---|---|---|---|---|
| H-001 | Les agents oublient le justificatif | valeur | fort | à vérifier | — | — | — |
| H-002 | Le blocage sera compris | usage | fort | à vérifier | prototype_papier (5 agentes) | — | — |
| H-003 | Les partenaires lisent les notifications | valeur | moyen | assumée | assumée : à mesurer après le MVP | — | — |

### Risques

_Aucun élément._

## 10. Glossaire

_Aucun élément._

## 11. Annexe — Traçabilité et couverture

### Exigences du BRD → PRD

| BR | Priorité BRD | FR | NFR | Critères |
|---|---|---|---|---|
| BR-001 | Must | FR-001 | — | AC-001 |

### Objectifs produit → exigences

| Objectif | FR | Métriques |
|---|---|---|
| GOAL-01 | FR-002, FR-001 | **aucune** |

### Exigences fonctionnelles → critères

| FR | Priorité | Critères | Scénario d’erreur |
|---|---|---|---|
| FR-002 | Should | **aucun** | — |
| FR-001 | Must | AC-001 | **absent** |

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| FR avec au moins un critère d'acceptation | 1/2 | 50 % | 100 % | **non atteint** (manquent : FR-002) |
| FR rattachées à un objectif produit | 2/2 | 100 % | 100 % | atteint |
| FR Must avec un scénario d'erreur | 0/1 | 0 % | 100 % | **non atteint** (manquent : FR-001) |
| Exigences du BRD couvertes par une FR ou une NFR | 1/1 | 100 % | 100 % | atteint |

## 12. Annexe — Points de vérification

_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._

| Élément | Règle | Avertissement |
|---|---|---|
| FR-002 | S04 | exigence validée sans critère d'acceptation |
| FR-001 | L03 | « et » : l'énoncé contient peut-être plusieurs exigences, vérifier s'il faut le scinder |
| FR-001 | L07 | « base de données » décrit l'implémentation : reformuler en comportement observable (le choix relève de la conception) |
| FR-001 | S07 | exigence Must sans scénario d'erreur |
| NFR-001 | L01 | terme non mesurable « rapide » : remplacer par un comportement observable ou une valeur cible |
| NFR-001 | S08 | NFR incomplète : metric, target, measurement manquant(s) |
| RG-003 | S20 | règle à automatiser couverte par aucune exigence fonctionnelle |

---

## Relecture humaine

> Ce PRD a été produit avec l'assistance d'une IA, à partir de l'état de session et des sources citées. Il ne remplace ni les entretiens, ni l'observation, ni le jugement des personnes concernées. Il doit être relu par les personnes désignées ; seules les approbations déclarées et enregistrées dans l'état font foi, et aucune n'est déduite de la présence de ce document.
