---
description: "Pour les testeurs : signaler un problème, retrouver ce qui était convenu dans la spécification, et le trier — défaut rattaché à l'exigence qu'il contredit, demande de changement, question, doublon ou non reproductible."
argument-hint: "<initiative> [ce que vous observez]"
---

<!-- Généré par install.mjs --target plugin depuis entrypoints/entrypoints.yaml. Ne pas éditer : la modification serait perdue, et tests/plugin.test.mjs la signalerait. -->

# Tizi — Signaler un problème

Arguments reçus : $ARGUMENTS

Charge le skill `test-builder` : lis `${CLAUDE_PLUGIN_ROOT}/skills/test-builder/SKILL.md` en entier et suis-le, à commencer par sa section « Démarrage ». Ce point d'entrée n'ajoute aucune règle : en cas de doute, le skill fait foi.

**Entrées**

- obligatoire : l'initiative, si le dépôt en compte plusieurs
- obligatoire : ce que vous observez
- facultatif : la version testée, l'environnement, les données, les étapes
- facultatif : l'activité, le parcours ou la story concernés
- facultatif : la référence d'un bug déjà saisi dans GitHub ou Jira

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

Suis `references/defects.md` du skill.
1. Recueille la fiche : version candidate, environnement, données, étapes, observé. Puis `node ${CLAUDE_PLUGIN_ROOT}/skills/test-builder/scripts/defect.mjs <initiative> --signaler …`. Un bug déjà saisi dans GitHub ou Jira se reprend par `import-defects.mjs` plutôt que d'être ressaisi.
2. Lance `node ${CLAUDE_PLUGIN_ROOT}/skills/test-builder/scripts/find-expectations.mjs <initiative> "<observation>"` et montre les attentes proches, avec leur texte exact et l'état de leur preuve. Si rien n'en ressort, propose de parcourir par activité, parcours ou story.
3. Pose les trois questions, dans l'ordre : une attente écrite couvre-t-elle la situation ? le comportement la contredit-il ? l'attente paraît-elle fausse ? Vérifie les doublons (`--ouverts`). Le testeur tranche ; une demande de changement va au décideur désigné.
4. Enregistre le tri avec `defect.mjs --trier`. Pour un défaut, propose la story corrective en voie rapide (`tizi-plan`), rattachée à l'épopée de l'exigence.
Tu ne modifies aucun fichier toi-même : seuls les scripts écrivent au registre.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-plan ou /tizi-test.
