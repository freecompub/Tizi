---
description: "Fin d'itération : sprint review (ce qui a été réalisé et prouvé, adaptation du backlog, prévision) puis rétrospective (coûts, blocages, actions et leur suivi), à partir des mesures réelles."
argument-hint: "<initiative> [IT-n]"
---

<!-- Généré par install.mjs --target plugin depuis entrypoints/entrypoints.yaml. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->

# Tizi — Sprint review et rétrospective

Arguments reçus : $ARGUMENTS

Charge le skill `plan-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/plan-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative, si le dépôt en compte plusieurs
- facultatif : l'itération (sinon celle dont la sprint review est due)

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

Suis la phase Review du skill (`references/phase-review.md`).
1. Lance `node ${CLAUDE_PLUGIN_ROOT}/skills/plan-builder/scripts/due-reviews.mjs .` pour trouver l'itération concernée, puis `node ${CLAUDE_PLUGIN_ROOT}/skills/plan-builder/scripts/close-sprint.mjs plan/<initiative>/state.yaml --iteration <IT-n>` : il prépare les mesures, les fiches, les preuves et le document `review/<IT-n>/sprint-review.md`.
2. **Sprint review**, avec les parties prenantes : ce qui a été réalisé et prouvé, puis l'adaptation du backlog. Fais décider, pour chaque tâche non finie, continuer, découper ou reporter (`review.carryover`), et les tailles à revoir : trois réponses proposées avec leur conséquence, par l'outil de questions de l'hôte (`vscode/askQuestions` dans VS Code, l'outil de questions de Claude Code), la réponse libre toujours ouverte, et un appel par lot de tâches plutôt qu'une liste tronquée.
3. **Rétrospective**, entre membres de l'équipe : coûts du sprint, causes de blocage récurrentes (une action et un responsable chacune, `review.blockage_actions`), suivi des actions du sprint précédent (`review.actions_followup`), puis une ou deux actions à essayer (`review.team.process.try`).
Les notes et les décisions viennent de l'équipe : enregistre-les seulement quand elles sont déclarées, puis lance `lint.mjs` pour vérifier qu'aucune décision ne manque (S76, S77).

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-plan.
