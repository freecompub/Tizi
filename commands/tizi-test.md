---
description: "Étape 6 du SDLC : vérifier une release — parcours critiques, tests exploratoires, NFR, matrice de couverture des exigences, porte de release, preuves."
argument-hint: "<initiative> <version candidate>"
---

# Tizi — 6. Vérification de release

Arguments reçus : $ARGUMENTS

Charge le skill `test-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/test-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative et la version candidate
- facultatif : l'emplacement des rapports de CI

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-plan.
