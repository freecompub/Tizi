---
description: "Étape 1 du SDLC : évaluer une opportunité puis construire le BRD (découverte, exigences métier, gouvernance), ou reprendre un BRD en cours."
argument-hint: "<initiative> [demande initiale] [sources]"
---

# Tizi — 1. Besoin métier (BRD)

Arguments reçus : $ARGUMENTS

Charge le skill `brd-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/brd-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : le nom d'une nouvelle initiative, ou l'identifiant d'une initiative à reprendre
- facultatif : la demande initiale, mot pour mot (pour la classer figée ou fluide)
- facultatif : les sources déjà disponibles : notes, transcriptions, documents
- facultatif : le résumé de passage d'une démarche de design thinking (hve-core)
- facultatif : le sponsor ou décideur
- facultatif : le contexte réglementaire

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-prd.
