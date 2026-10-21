# Protocole d'exécution

## Jetons

| Cible | Variables lues par l'exécuteur | Droits nécessaires |
|---|---|---|
| GitHub | `GITHUB_WRITE_TOKEN` (et `GITHUB_API_URL` pour GitHub Enterprise) | Issues en écriture sur le seul dépôt cible ; jeton à grain fin de préférence |
| Jira Cloud | `JIRA_BASE_URL`, `JIRA_WRITE_EMAIL`, `JIRA_WRITE_TOKEN` | Création et modification d'issues dans le seul projet cible |

La planification (`plan-builder`) lit d'autres variables, en lecture seule (`GITHUB_READ_TOKEN`, `JIRA_READ_EMAIL`, `JIRA_READ_TOKEN`). Ne définis pas les jetons d'écriture dans l'environnement où l'on planifie.

## Approbation attendue dans l'état du plan

```yaml
governance:
  backlog_approvals:
    - target: github
      sha256: "<empreinte affichée par plan-operations.mjs>"
      autonomy: partiel            # complet | partiel | manuel
      reviewed: [EXE-004]          # opérations « à relire » explicitement acceptées
      ops: []                      # niveau manuel : opérations autorisées une à une
      declared_by: ""              # qui approuve, déclaré par l'utilisateur
      date: ""
```

## Références symboliques

Le plan contient des références `{{ref:US-001}}` vers des éléments pas encore créés, et `{{milestone:<titre>}}` vers des jalons à créer. L'exécuteur les résout au fil de l'exécution, à partir de la table de correspondance et de ce qu'il vient de créer. Si une référence reste non résolue au moment d'envoyer une opération, il s'arrête : aucun identifiant de planification n'atteint le tracker.

## Journal

Chaque exécution écrit `exports/<cible>/execution-<horodatage>.yaml` : empreinte du plan, approbation utilisée, et pour chaque opération son statut (`fait`, `ignoré` avec la raison, `échec` avec l'erreur, `non_exécuté` après un échec). La table `sync-map.yaml` est mise à jour après chaque création ou rattachement réussi : une reprise après échec repart de là, avec un nouveau plan d'opérations.
