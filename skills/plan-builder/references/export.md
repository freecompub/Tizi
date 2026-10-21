# Du plan au tracker : préparer, approuver, exécuter

L'état reste la source de vérité ; GitHub Issues et Jira n'en sont qu'une vue. Une modification faite directement dans le tracker n'est pas reprise : elle doit être reportée dans l'état.

La **préparation** et l'**exécution** sont séparées, à la manière du Functional Planner et du Backlog Manager de hve-core, mais par des verrous déterministes plutôt que par des consignes :

| Étape | Qui | Droits | Produit |
|---|---|---|---|
| 1. Découvrir | `plan-builder`, `discover-tracker.mjs` | Lecture seule (`GITHUB_READ_TOKEN`, `JIRA_READ_EMAIL`, `JIRA_READ_TOKEN`) | `exports/<cible>/snapshot.yaml` |
| 2. Préparer | `plan-builder`, `plan-operations.mjs` | Aucun accès réseau | `operations.yaml` signé, `operations.md` à relire |
| 3. Approuver | L'utilisateur ; `plan-builder` enregistre | — | `governance.backlog_approvals` avec l'empreinte |
| 4. Exécuter | Skill `backlog-executor`, `apply-operations.mjs` | Écriture (`GITHUB_WRITE_TOKEN`, `JIRA_WRITE_EMAIL`, `JIRA_WRITE_TOKEN`) | Issues, `sync-map.yaml`, journal |

Les scripts de `plan-builder` ne contiennent aucune requête d'écriture : seule la découverte émet des requêtes, et uniquement `GET`.

## Ce que fait la préparation

- **Validation contre le tracker** : types d'issues présents dans le projet Jira, type de sous-tâche réellement de sous-tâche, champs requis que le plan ne fournit pas, versions Jira existantes, labels et jalons GitHub manquants (créés par des opérations dédiées).
- **Dédoublonnage** : un élément déjà rattaché (`sync-map.yaml`) est mis à jour seulement si son titre, ses labels ou son corps ont changé ; une issue existante qui porte déjà l'étiquette `[US-001]` est rattachée sans écriture ; une issue au titre très proche (similarité d'au moins 70 %, mots ramenés à leur racine) rend la création « à relire » comme doublon possible.
- **Six garde-fous de contenu** : G1 secrets probables masqués, G2 chemins locaux masqués, G3 adresses électroniques masquées, G4 références non résolues ou TODO (opération « à relire »), G5 seuls les éléments validés sont exportés, G6 longueurs maximales (contenu tronqué, « à relire »).
- **Références symboliques** : un élément pas encore créé est désigné par `{{ref:US-001}}` ; l'exécuteur le résout au moment d'envoyer, et s'arrête si ce n'est pas possible.
- **Ordre** : labels et jalons, rattachements, epics, stories, tâches, puis mise à jour des stories avec les numéros de leurs tâches.

## Correspondance

| Notion du plan | GitHub Issues | Jira |
|---|---|---|
| Release (`REL`) | Jalon (créé s'il manque) | Version, seulement si `jira.use_fix_versions: true` et si elle existe |
| Activité de la story map (`ACT`) | Label `activite:<ACT>` | Epic (si `jira.epic_from: activity`) |
| Story (`US`) | Issue, label `story` | Story, rattachée à son epic |
| Tâche (`TK`) | Issue, label `tache`, case à cocher dans la story | Sous-tâche de la story |
| Spike | Issue, label `spike` | Tâche, label `spike` |
| Taille, affectation, itération | Labels `taille:M`, `agent` ou `humain`, `iteration:IT-1` | Mêmes labels, avec `-` à la place de `:` |

Les noms des types Jira varient selon les projets : ils se règlent dans `settings.jira.issue_types`.

## Approuver

L'utilisateur relit `operations.md` puis déclare son approbation. Enregistre-la dans `governance.backlog_approvals` : cible, **empreinte exacte** affichée par `plan-operations.mjs`, niveau d'autonomie (`complet`, `partiel` par défaut, `manuel`), opérations « à relire » qu'il accepte nommément (`reviewed`), et en niveau manuel la liste des opérations autorisées (`ops`). N'enregistre jamais une approbation que l'utilisateur n'a pas déclarée.

Toute modification du plan après approbation, ou une autre exécution entre-temps, rend le plan d'opérations périmé : l'exécuteur le refusera, et il faudra le préparer de nouveau.
