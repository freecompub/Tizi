---
description: "Étape 3 du SDLC : concevoir l'architecture à partir du handoff du PRD (moteurs, domaine, C4, ADR, NFR, contrats, menaces), y compris sur un existant."
argument-hint: "<initiative> [handoff du PRD]"
---

<!-- Généré par install.mjs --target plugin depuis entrypoints/entrypoints.yaml. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->

# Tizi — 3. Conception

Arguments reçus : $ARGUMENTS

Charge le skill `sad-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/sad-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative, ou le chemin du handoff du PRD
- facultatif : le dépôt de code existant à analyser (brownfield)
- facultatif : les décisions d'architecture déjà prises

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-plan.
