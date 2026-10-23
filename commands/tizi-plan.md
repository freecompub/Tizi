---
description: "Étape 4 du SDLC : découper en stories et tâches, example mapping, sprint ou flux, revue de fin d'itération, préparation (sans écriture) de l'export vers GitHub ou Jira."
argument-hint: "<initiative> [itération]"
---

# Tizi — 4. Planification

Arguments reçus : $ARGUMENTS

Charge le skill `plan-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/plan-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative
- facultatif : la cadence (sprint ou flux) et la capacité
- facultatif : l'itération à revoir

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-backlog ou /tizi-impl.
