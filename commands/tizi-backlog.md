---
description: "Applique dans GitHub ou Jira un plan d'opérations déjà approuvé par son empreinte. Seul point d'entrée qui écrit dans le gestionnaire de tickets."
argument-hint: "<initiative> <github|jira>"
---

<!-- Généré par install.mjs --target plugin depuis entrypoints/entrypoints.yaml. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->

# Tizi — 4 bis. Application du backlog

Arguments reçus : $ARGUMENTS

Charge le skill `backlog-executor` : lis `${CLAUDE_PLUGIN_ROOT}/skills/backlog-executor/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative et la cible (github ou jira)
- facultatif : le niveau d'autonomie (complet, partiel, manuel)

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-impl.
