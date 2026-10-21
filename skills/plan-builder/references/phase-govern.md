# Phase Govern

**But** : obtenir l'engagement de l'équipe, figer le plan, l'exporter vers GitHub Issues et Jira, et produire le handoff vers l'implémentation.

## Scripts

| Script | Rôle | Sortie |
|---|---|---|
| `lint.mjs plan/<slug>/state.yaml` | Vérification de forme, non bloquante | console |
| `render-plan.mjs plan/<slug>/state.yaml` | Plan, fiches de stories, fiches de contexte des tâches | `plan.md`, `stories/`, `tasks/` |
| `freeze-version.mjs plan/<slug>/state.yaml [--baseline]` | Copie immuable avec changelog | `versions/v<version>/` |
| `discover-tracker.mjs plan/<slug>/state.yaml --target github\|jira` | Découverte du tracker, en lecture seule | `exports/<cible>/snapshot.yaml` |
| `plan-operations.mjs plan/<slug>/state.yaml --target github\|jira` | Plan d'opérations signé, sans aucune écriture | `exports/<cible>/operations.yaml`, `operations.md` |
| `build-handoff.mjs plan/<slug>/versions/v<version>/state.yaml` | Ordre d'exécution pour l'implémentation | `handoff/v<version>/` |

## Étape 1. Engagement

1. Lance `lint.mjs` et `render-plan.mjs`. Présente l'itération (ou le réapprovisionnement) : objectif, stories et leur préparation, tâches, tailles, capacité utilisée, affectations, risques.
2. L'**engagement** est la gate de l'étape. Il n'est enregistré (`commitment.declared_by`, date) que lorsque l'utilisateur déclare que l'équipe s'engage. Une story non prête ne peut pas faire partie d'un engagement.
3. Fais valider la Definition of Done si elle a changé.

## Étape 2. Baseline

Mets à jour `governance.version`, passe le statut à `baseline`, fige avec `freeze-version.mjs --baseline`. Chaque nouvelle itération ou chaque réapprovisionnement produit une nouvelle version mineure.

## Étape 3. Préparer le plan d'opérations

Suis `references/export.md`. Tu prépares ; tu n'exécutes jamais.

1. Lance `discover-tracker.mjs` (jeton en lecture seule), puis `plan-operations.mjs`. Présente `operations.md` : créations, mises à jour, rattachements, opérations « à relire » (doublons possibles, types ou champs non validés, contenu tronqué), garde-fous déclenchés.
2. Fais trancher chaque opération « à relire » : accepter, ou corriger l'état et préparer de nouveau.
3. Quand l'utilisateur déclare son approbation, enregistre-la dans `governance.backlog_approvals` avec l'empreinte exacte et le niveau d'autonomie. Puis indique que l'exécution se fait avec le skill `backlog-executor`, dans un environnement où sont définis les jetons d'écriture.

## Étape 4. Handoff vers l'implémentation

`build-handoff.mjs` sur la version figée produit l'ordre d'exécution des tâches engagées (ordre topologique des dépendances), avec pour chacune son affectation et le chemin de sa fiche de contexte. C'est l'entrée de l'étape 5.

## Après la baseline

Une demande de changement en amont (PRD, conception) relance l'ingestion des handoffs : les stories et tâches touchées repassent en Refine.
