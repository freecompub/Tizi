# BRD — Dossiers complets

**Version** : 1.0 — **Statut** : baseline

> Document généré à partir de `state.yaml` le 2026-10-21. Ne pas le modifier directement : toute correction passe par l'état de session.

## Statut du document

| Section | Statut |
|---|---|
| Contexte et problème | à rédiger |
| Objectifs et indicateurs | à rédiger |
| Parties prenantes | à rédiger |
| Processus | à rédiger |
| Exigences métier | à rédiger |
| Règles métier | à rédiger |
| Contraintes | à rédiger |
| Hypothèses et risques | à rédiger |
| Décisions | à rédiger |
| Périmètre | à rédiger |
| Glossaire | à rédiger |

## Opportunité

**Demande initiale** (figée) : « Il faut une appli de vérification des dossiers pour les agents » — solution présumée : application de vérification

| Case du canevas | Contenu |
|---|---|
| Problèmes | Trop de dossiers incomplets |
| Utilisateurs et clients | Agents |
| Solutions aujourd'hui | — |
| Valeur pour l'utilisateur | — |
| Mesures côté utilisateur | — |
| Adoption | — |
| Problème de l'organisation | — |
| Mesures côté organisation | — |
| Budget | quelques semaines |

**Décision** : aller_plus_loin

## 1. Contexte et problème

**Déclencheur** : Hausse des rejets

**Problème** : Trop de dossiers transmis incomplets.

## 2. Objectifs et indicateurs

| ID | Objectif | Indicateur | Actuel | Cible | Échéance | Responsable |
|---|---|---|---|---|---|---|
| OBJ-01 | Réduire les rejets | taux de rejet | 12 % | 2 % | — | Alice (SH-01) |

## 3. Parties prenantes

| ID | Nom | Rôle | Impact | Pouvoir | Influence | Implication | Statut |
|---|---|---|---|---|---|---|---|
| SH-01 | Alice | Directrice | faible | fort | positive | satisfaire | interrogée |
| SH-02 | Bruno | Chef agents (représente : agents d'accueil) | fort | fort | négative | impliquer | interrogée |
| SH-03 | Chloé | Agente | fort | faible | positive | consulter | interrogée |

### Droits de décision

| Domaine | Décideur | Recours | Confirmé par |
|---|---|---|---|
| perimetre | Alice (SH-01) | — | Alice (SH-01) |
| priorites | Alice (SH-01) | SH-09 | _non confirmé_ |

## 4. Processus actuel et processus cible

### Processus actuel

_Aucun élément._

### Processus cible

_Aucun élément._

## 5. Exigences métier

| Priorité | Nombre |
|---|---|
| Must | 1 |
| Non priorisée | 1 |

### BR-001 — Must

Le service doit pouvoir identifier rapidement les dossiers incomplets et les signaler sur un écran.

**Objectifs** : OBJ-01 — **Règles** : RG-001, RG-099

**Preuve** : observé (2 sources)

**Critères d’acceptation**

- Moins de 2 % de dossiers rejetés…

### BR-002 — Non priorisée

Il permet de suivre les relances.

**Objectifs** : OBJ-01

**Preuve** : observé (2 sources)

**Critères d’acceptation**

_Aucun élément._

## 6. Règles métier

_Directives que le métier contrôle et que les exigences doivent respecter. Elles ne sont pas des exigences et peuvent évoluer indépendamment._

| ID | Règle | Type | Application | Responsable | Sources | Exigences |
|---|---|---|---|---|---|---|
| RG-001 | Un dossier ne doit pas être transmis sans justificatif de domicile. | comportement | stricte | Alice (SH-01) | SRC-001 (l.9) | BR-001 |
| RG-002 | Le délai de relance est de 5 jours ouvrés. | comportement | — | — | — | — |

## 7. Contraintes

| Type | Contrainte | Implication | Source |
|---|---|---|---|
| environnement | Comptoir d'accueil bruyant, agentes souvent interrompues | vérification en moins de 30 s, sans saisie longue | SRC-002 |

### Exigences de transition

_Exigences temporaires pour passer de l'existant à la cible ; elles disparaissent une fois la transition faite._

| ID | Type | Exigence | Concernés | Achevée quand |
|---|---|---|---|---|
| TR-01 | formation | Former les agents d'accueil au refus de transmission | Chloé (SH-03) | 90 % des agents formés avant la bascule |
| TR-02 | reprise de donnees | Reprendre les dossiers en cours | — | — |

## 8. Hypothèses et risques

### Hypothèses

_Aucun élément._

### Risques

_Aucun élément._

## 9. Décisions

### DD-01 — Vérification centrale ?

| Option | Impacts |
|---|---|
| Oui | — |

**Décision** : Oui

**Justification** : —

**Décidé par** : —

## 10. Périmètre

### Inclus

- Transmission des dossiers

### Exclu

_Aucun élément._

## 11. Glossaire

_Aucun élément._

## 12. Annexe — Traçabilité

| Objectif | Exigence | Règles | Besoin candidat | Sources |
|---|---|---|---|---|
| OBJ-01 | BR-001 | RG-001, RG-099 | BC-001 | SRC-001 (l.3), SRC-002 (obs. 10:20) |
| OBJ-01 | BR-002 | — | BC-001 | SRC-001 (l.3), SRC-002 (obs. 10:20) |

## Porte de synthèse

Évaluée le 2026-10-29.

| Dimension | Jugement | Note |
|---|---|---|
| Fidélité aux sources | ok | — |
| Couverture des parties prenantes | faible (assumé) | partenaires non entendus, assumé pour le MVP |
| Robustesse (plusieurs sources) | faible | BR-002 à source unique |
| Actionnabilité | ok | — |
| Alignement | ok | — |

_Preuve des exigences présentées : 2 observée(s), 0 rapportée(s), 0 supposée(s) ; 0 à source unique._

## Couverture

| Métrique | Couverts | Taux | Seuil | Statut |
|---|---|---|---|---|
| Exigences métier rattachées à un objectif | 2/2 | 100 % | 100 % | atteint |
| Exigences métier avec critère d'acceptation | 1/2 | 50 % | 100 % | **non atteint** (manquent : BR-002) |
| Objectifs servis par au moins une exigence | 1/1 | 100 % | 100 % | atteint |

## 13. Annexe — Points de vérification

_Vérification de forme non bloquante (catalogue `lib/rules.mjs`). Elle ne remplace pas le contrôle formel._

| Élément | Règle | Avertissement |
|---|---|---|
| BR-001 | L01 | terme non mesurable « rapidement » : remplacer par un comportement observable ou une valeur cible |
| BR-001 | L03 | « et » : l'énoncé contient peut-être plusieurs exigences, vérifier s'il faut le scinder |
| BR-001 | L06 | « écran » décrit un moyen, pas un besoin métier : remonter au besoin |
| BR-001 | L02 | critère : points de suspension : l'énumération est incomplète, la rendre exhaustive ou la décrire en intention |
| BR-001 | S09 | règle métier RG-099 n'existe pas dans l'état |
| BR-002 | L08 | aucun « doit / doivent / devra » : l'énoncé ne dit pas clairement ce qui est exigé |
| BR-002 | S04 | exigence validée sans critère d'acceptation |
| BR-002 | S05 | exigence validée sans priorité |
| RG-002 | L08 | aucun « doit / doivent / devra » : l'énoncé ne dit pas clairement ce qui est exigé |
| RG-002 | S11 | règle métier sans source (texte, procédure ou personne qui la détient) |
| RG-002 | S12 | règle de comportement sans niveau d'application (stricte, dérogation autorisée, dérogation justifiée, indicative) |
| RG-002 | S13 | règle métier sans responsable métier (qui peut la modifier ?) |
| DD-01 | S17 | décision validée sans décideur déclaré |
| DD-01 | S18 | décision présentée avec moins de deux options : le décideur n'a pas eu de choix réel |

### Dérogations acceptées

| Élément | Règle | Raison |
|---|---|---|
| BR-002 | L04 | test |

---

## Relecture humaine

> Ce BRD a été produit avec l'assistance d'une IA, à partir de l'état de session et des sources citées. Il ne remplace ni les entretiens, ni l'observation, ni le jugement des personnes concernées. Il doit être relu par les personnes désignées ; seules les approbations déclarées et enregistrées dans l'état font foi, et aucune n'est déduite de la présence de ce document.
