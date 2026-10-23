---
description: "Étape 2 du SDLC : construire le PRD à partir du handoff du BRD (ou en mode autonome), avec story map, tests de valeur et d'usage, exigences et critères."
argument-hint: "<initiative> [handoff du BRD]"
---

# Tizi — 2. Produit (PRD)

Arguments reçus : $ARGUMENTS

Charge le skill `prd-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/prd-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative, ou le chemin du handoff du BRD
- facultatif : pour un PRD autonome : le problème et les utilisateurs visés
- facultatif : les résultats de tests déjà menés

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-sad.
