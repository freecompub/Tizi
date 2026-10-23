---
description: "Étape 5 du SDLC : implémenter une tâche prête du plan — compréhension validée, BDD puis TDD sous garde-fou, revue de code par agents, PR."
argument-hint: "<initiative> [TK-xxx]"
---

<!-- Généré par install.mjs --target plugin depuis entrypoints/entrypoints.yaml. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->

# Tizi — 5. Implémentation

Arguments reçus : $ARGUMENTS

Charge le skill `impl-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/impl-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative
- facultatif : la tâche à prendre (sinon la première prête)

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-test.
