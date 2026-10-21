# Tizi — un SDLC agentique, du besoin à la preuve

> *Tizi* : le col, en kabyle — le seul endroit où l'on passe d'une vallée à la suivante.

Tizi est un cycle de développement outillé par des agents IA, de l'évaluation d'une opportunité jusqu'à la preuve qu'une release fait ce qui était convenu. Il fonctionne avec Claude Code et GitHub Copilot.

**Les vallées sont les étapes** : BRD, PRD, conception, planification, implémentation, vérification. C'est là que se fait le travail d'exploration, qui peut tourner en rond, revenir en arrière, se tromper.

**Les cols sont les portes entre étapes.** On ne passe pas n'importe où ni n'importe quand : on s'arrête, on vérifie ce qu'on porte (version figée, empreinte du handoff, couverture mesurée), et une personne décide de franchir. Une charge altérée ne passe pas. Du col, on voit les deux vallées : la traçabilité va du besoin au code, et du code au besoin.

**Les agents portent, les humains décident du passage, les cols vérifient.** Les agents font l'essentiel de la marche ; rien de ce qu'ils produisent n'est accepté sans vérification déterministe ou adversariale, et aucune approbation n'est déduite.

**TIZI** — **T**raçable, **I**ntentionnel, **Z**éro confiance aveugle, **I**tératif.

- **Traçable** : chaque ligne de code remonte à un besoin, chaque preuve à une exigence.
- **Intentionnel** : on part du problème et de l'outcome visé, pas d'une solution présumée.
- **Zéro confiance aveugle** : rien de ce que produit un agent n'est accepté sans vérification.
- **Itératif** : on peut revenir dans la vallée précédente ; les cols se repassent.

Point de départ : `/tizi` dans Claude Code, ou l'agent `tizi` dans Copilot.

```
git clone https://github.com/freecompub/Tizi.git
node Tizi/install.mjs --project <votre-dépôt> --target claude|copilot|both
```

## documentation/

Le document de référence « Tizi — un SDLC agentique, du recueil du besoin au déploiement », exporté depuis le document vivant (révision 62) :
- en Markdown, modifiable ;
- en PDF (A4, 36 pages), pour la lecture.

Il contient le sommaire, le nom et sa philosophie, les dix étapes, la construction des étapes 1 à 6, l'index des abréviations et identifiants, et les sources.

## Installer dans un dépôt

```
node install.mjs --project <chemin-du-dépôt> --target claude|copilot|both
```

- `claude` : Claude Code (`.claude/skills/`, `.claude/agents/`, hooks dans `.claude/settings.json`) ;
- `copilot` : GitHub Copilot — agent de VS Code, CLI, agent cloud (`.github/skills/`, `.github/agents/`, hooks dans `.github/hooks/tizi.json`) ;
- `both` : les deux ; une seule copie des skills dans `.claude/skills/`, lue par les deux outils.

L'installateur pose aussi les **points d'entrée**, générés depuis une source unique (`entrypoints/entrypoints.yaml`) :

| Point d'entrée | Claude Code | GitHub Copilot | Rôle |
|---|---|---|---|
| `tizi` | `/tizi` | agent `tizi` | Où en est chaque initiative, et quelle étape suivante (calculé par `next-step.mjs`) ; ne modifie rien |
| `tizi-brd` | `/tizi-brd` | agent `tizi-brd` | Étape 1 : opportunité et BRD |
| `tizi-prd` | `/tizi-prd` | agent `tizi-prd` | Étape 2 : PRD |
| `tizi-sad` | `/tizi-sad` | agent `tizi-sad` | Étape 3 : conception |
| `tizi-plan` | `/tizi-plan` | agent `tizi-plan` | Étape 4 : planification, revues de fin d'itération |
| `tizi-backlog` | `/tizi-backlog` | agent `tizi-backlog` | Application d'un plan d'opérations approuvé dans GitHub ou Jira |
| `tizi-impl` | `/tizi-impl` | agent `tizi-impl` | Étape 5 : implémentation d'une tâche |
| `tizi-test` | `/tizi-test` | agent `tizi-test` | Étape 6 : vérification de release |

Ce sont des coquilles : chacune charge son skill, qui reste la seule source des règles. Les agents Copilot n'ont que les outils de leur étape (l'entrée `tizi` et `tizi-backlog` ne peuvent pas éditer de fichiers) et proposent des boutons de passage vers l'étape suivante. Les sous-agents internes (critiques du council, perspectives de revue, vérificateur) sont marqués non invocables : ils n'apparaissent pas dans la liste de l'utilisateur.

Options : `--skills brd-builder,prd-builder` pour n'en installer qu'une partie, `--user` pour les skills et agents personnels, `--dry-run` pour voir sans écrire. La commande est idempotente. Il faut Node.js 18 ou plus ; aucune dépendance n'est à installer.

## skills/

Les sept skills, au format ouvert Agent Skills (validés par `skills-ref`), utilisables avec Claude Code et GitHub Copilot. Chaque dossier contient son `SKILL.md`, ses références (`references/`), son modèle d'état (`templates/`) et ses scripts Node (`scripts/`, sans installation : `js-yaml` est embarqué).

| Skill | Étape | Rôle |
|---|---|---|
| `brd-builder` | 1 | Opportunité (Assess), puis BRD : Discover, Define, Govern |
| `prd-builder` | 2 | PRD : Frame (dont tests de valeur et d'usage), Specify, Govern |
| `sad-builder` | 3 | Conception : moteurs, domaine, C4, ADR (MADR v4), NFR, contrats, STRIDE, brownfield léger |
| `plan-builder` | 4 | Plan : stories, example mapping, tâches, sprint ou flux, revue, préparation de l'export (lecture seule) |
| `backlog-executor` | 4 | Seul skill qui écrit dans GitHub ou Jira, après approbation de l'empreinte du plan d'opérations |
| `impl-builder` | 5 | Implémentation tâche par tâche : compréhension validée, BDD puis TDD sous contrôle d'un hook, porte de PR |
| `test-builder` | 6 | Vérification de release : matrice de couverture des exigences, exploratoire, porte de release, preuves |

Chaque skill sait reprendre une session interrompue (`references/sessions.md`) : un hook conserve la transcription et en tire un extrait, `status.mjs` donne le point d'étape, `session-search.mjs` retrouve un détail.

Fichiers communs, identiques d'un skill à l'autre, dont `scripts/lib/agent-io.mjs` qui adapte les hooks à Claude Code, à Copilot et à VS Code : `scripts/lib/common.mjs`, `scripts/lib/rules.mjs` (catalogue de vérification), `scripts/lint.mjs`, `scripts/freeze-version.mjs`, `scripts/verify-handoff.mjs`, `scripts/lib/sessions.mjs`, `scripts/session-capture.mjs`, `scripts/session-search.mjs`, `scripts/status.mjs`, `scripts/next-step.mjs`, et `scripts/lib/testing.mjs` pour les étapes 5 et 6. Toute modification de l'un d'eux se recopie dans tous les skills qui l'ont.

## tests/

`npm test` (ou `node --test tests/*.test.mjs`) rejoue toute la chaîne sur une copie du cas d'exemple, sans dépendance : conformité des skills à la spécification Agent Skills, identité des fichiers communs, vérification et rendu des quatre documents, intégrité des handoffs, verrous de l'exécuteur, garde-fou TDD avec les charges utiles de Claude Code, Copilot et VS Code, capture des sessions, installation, revue de code, portes de PR et de release. Les constats de la vérification sont comparés à des références figées (`tests/golden/`) : `npm run test:update-golden` après un changement voulu. À lancer après toute modification d'un fichier commun.

## evals/

Le banc d'évaluation par ablation : chaque cas joué avec et sans skill, par Claude Code ou Copilot, sur plusieurs passes. Voir `evals/README.md`.

## exemple/

Le cas « Dossiers complets » qui a servi à tester toute la chaîne : `brd/`, `prd/`, `sad/` et `plan/` (états, documents générés, versions figées, handoffs avec empreintes), et `repo/`, un petit dépôt Node où les étapes 5 et 6 ont été jouées (configuration, tests, journal TDD, description de PR, matrice de couverture et preuves archivées), et `.tizi/sessions/`, une session capturée avec son extrait. Les données sont fictives et contiennent volontairement des défauts pour déclencher les vérifications.
