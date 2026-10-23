---
name: tizi-impl
description: "Étape 5 du SDLC : implémenter une tâche prête du plan — compréhension validée, BDD puis TDD sous garde-fou, revue de code par agents, PR."
argument-hint: "<initiative> [TK-xxx]"
tools: ['vscode/askQuestions', 'read', 'search', 'edit', 'execute/runInTerminal', 'execute/getTerminalOutput', 'agent']
handoffs:
  - label: "→ Tizi — 6. Vérification de release"
    agent: tizi-test
    prompt: "Reprends l'initiative en cours à l'étape « Tizi — 6. Vérification de release »."
    send: false
---

# Tizi — 5. Implémentation

Charge le skill `impl-builder` : lis `${PLUGIN_ROOT}/skills/impl-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative
- facultatif : la tâche à prendre (sinon la première prête)

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose l'agent tizi-test.
