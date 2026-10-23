---
description: "Point d'entrée de Tizi : dit où en est chaque initiative (BRD, PRD, conception, plan, implémentation, tests) et propose l'étape suivante. À utiliser pour reprendre un travail ou quand on ne sait pas par où commencer."
argument-hint: "[initiative]"
---

# Tizi — point d'entrée

Arguments reçus : $ARGUMENTS

**Entrées**

- facultatif : l'identifiant d'une initiative, pour ne voir qu'elle

Si une entrée obligatoire manque, demande-la en une seule question, puis commence. Ne demande pas les entrées facultatives comme un formulaire : elles viendront au fil de la conversation.

Lance `node ${CLAUDE_PLUGIN_ROOT}/skills/brd-builder/scripts/next-step.mjs .` (ajoute `--initiative <slug>` si l'utilisateur en a nommé une), puis `node ${CLAUDE_PLUGIN_ROOT}/skills/brd-builder/scripts/sync-agent-instructions.mjs . --check`, et présente le résultat tel quel. Si les instructions du dépôt sont absentes ou périmées, propose de les synchroniser (même script, sans `--check`) : c'est ce que lisent les agents qui ne passent pas par Tizi. Pour le point d'étape, montre l'avancement de chaque initiative, l'étape suivante et pourquoi, les points à noter (zones d'ombre bloquantes, session sans condensé).
Propose ensuite **une** étape suivante, avec le point d'entrée à utiliser. Ne commence pas cette étape toi-même : elle a son propre point d'entrée.
Si `next-step.mjs` signale une sprint review due, propose `tizi-sprint-review` en premier.

**Application existante, Tizi pas encore adopté** (du code dans le dépôt, mais ni `impl/config.yaml` ni `.tizi/adoption.md`) : propose d'abord `node ${CLAUDE_PLUGIN_ROOT}/skills/brd-builder/scripts/adopt.mjs .`. Il observe le dépôt sans rien exécuter et propose la configuration des tests et une carte grossière de l'existant, chaque élément avec sa preuve ; fais relire ce qu'il signale comme incertain. C'est aussi le moment d'écrire une première **constitution du produit** (`constitution.mjs`) à partir de ce qui existe déjà : documentation réglementaire, règles de sécurité, habitudes d'équipe — quelques principes, chacun avec son moyen de vérification et son responsable.

**Nouvelle initiative, ou initiative sans chemin décidé** : avant toute étape, choisis le chemin avec l'utilisateur. Pose en un seul message les six questions fermées (oui ou non) :
1. S'agit-il d'une modification évidente et sans risque (coquille, texte, configuration) ?
2. Le changement touche-t-il une exigence réglementaire ou la sécurité des patients ou des utilisateurs ?
3. L'intention est-elle floue, ou défendue différemment par plusieurs personnes ?
4. Le changement crée-t-il ou modifie-t-il une règle métier ?
5. Touche-t-il un contrat d'interface, une donnée sensible, ou crée-t-il un composant ?
6. Dépasse-t-il quelques jours de travail ?
Ne réponds pas à sa place : une réponse incertaine vaut « oui ». Puis lance `node ${CLAUDE_PLUGIN_ROOT}/skills/brd-builder/scripts/choose-path.mjs <initiative> --par "<son nom>" --evident … --reglementaire … --intention-floue … --regle-metier … --contrat-donnee … --plusieurs-jours …`, présente le chemin et sa raison, et propose la première étape. Le chemin est une décision enregistrée : il ne se rétrécit pas ; il s'élargit avec `--elargir` quand une étape découvre ce qu'il fallait (une règle métier, un contrat).
Tu ne modifies aucun fichier toi-même : seuls les scripts enregistrent le chemin et synchronisent les instructions.

**Étape suivante** : quand cette étape est terminée ou figée, propose /tizi-brd ou /tizi-prd ou /tizi-sad ou /tizi-plan ou /tizi-sprint-review ou /tizi-backlog ou /tizi-impl ou /tizi-test.
