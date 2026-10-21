---
status: accepté
date: 2026-10-20
decision-makers: Alice
---

# ADR-001 — Notifier le partenaire par un worker asynchrone

> Généré à partir de `state.yaml` le 2026-10-20 (structure MADR v4). Ne pas modifier ce fichier : un ADR accepté se remplace par un nouvel ADR.

## Contexte et énoncé du problème

La notification ne doit pas ralentir la transmission.

## Moteurs de décision

- AD-01 — performance : le contrôle répond rapidement (p95 < 2 s)

## Options envisagées

- Worker asynchrone
- Appel synchrone

## Résultat de la décision

Option retenue : « Worker asynchrone ».

Justification : il protège le p95 de la transmission

### Conséquences

- Positive : latence stable
- Négative : exploitation d'un worker

### Confirmation

test de charge sur la transmission

## Avantages et inconvénients des options

### Worker asynchrone

- Avantage : découple la latence
- Inconvénient : un conteneur de plus à exploiter

### Appel synchrone

- Avantage : simple
- Inconvénient : latence ajoutée au p95

## Informations complémentaires

Éléments concernés : CT-03 Notificateur
