# Tizi — un SDLC agentique, du besoin à la preuve

> *Tizi* : le col, en kabyle — le seul endroit où l'on passe d'une vallée à la suivante.

Tizi est un cycle de développement outillé par des agents IA, de l'évaluation d'une opportunité jusqu'à la preuve qu'une release fait ce qui était convenu. Il fonctionne avec Claude Code et GitHub Copilot.

**Les vallées sont les étapes** : BRD, PRD, conception, planification, implémentation, vérification. C'est là que se fait le travail d'exploration, qui peut tourner en rond, revenir en arrière, se tromper.

**Les cols sont les portes entre étapes.** On ne passe pas n'importe où ni n'importe quand : on s'arrête, on vérifie ce qu'on porte (version figée, empreinte du handoff — **celle de l'état et celle du document** —, couverture mesurée), et une personne décide de franchir. Une charge altérée ne passe pas : un document figé modifié après le gel est détecté comme l'état l'est. Du col, on voit les deux vallées : la traçabilité va du besoin au code, et du code au besoin.

**Les agents portent, les humains décident du passage, les cols vérifient.** Les agents font l'essentiel de la marche ; rien de ce qu'ils produisent n'est accepté sans vérification déterministe ou adversariale, et aucune approbation n'est déduite.

**TIZI** — **T**raçable, **I**ntentionnel, **Z**éro confiance aveugle, **I**tératif.

- **Traçable** : chaque ligne de code remonte à un besoin, chaque preuve à une exigence.
- **Intentionnel** : on part du problème et de l'outcome visé, pas d'une solution présumée.
- **Zéro confiance aveugle** : rien de ce que produit un agent n'est accepté sans vérification.
- **Itératif** : on peut revenir dans la vallée précédente ; les cols se repassent.

Point de départ : `/tizi` dans Claude Code, ou l'agent `tizi` dans Copilot.

## documentation/

Le document de référence « Tizi — un SDLC agentique, du recueil du besoin au déploiement », exporté depuis le document vivant ; il porte sa propre date en en-tête :
- en Markdown, modifiable ;
- en PDF (A4, 46 pages), pour la lecture.

Il contient le sommaire, le nom et sa philosophie, les dix étapes, la construction des étapes 1 à 6, l'index des abréviations et identifiants, et les sources.

## Installer comme plugin Claude Code

Le dépôt est aussi un **marketplace** Claude Code, et sa racine est la racine du plugin `tizi` :

```
claude plugin marketplace add freecompub/Tizi
claude plugin install tizi@tizi
```

Les sept skills, les dix points d'entrée (`/tizi:tizi`, `/tizi:tizi-brd`…), les douze sous-agents et
les cinq hooks arrivent d'un coup, et les mises à jour suivent le dépôt. Les chemins des scripts sont
écrits en `${CLAUDE_PLUGIN_ROOT}/skills/…`, qui résout là où le plugin est installé.

Ses artefacts — `commands/`, `agents/`, `hooks/hooks.json`, `.claude-plugin/plugin.json` — sont
générés depuis la **même source unique** que les deux autres cibles (`entrypoints/entrypoints.yaml`
et `skills/`), par `node install.mjs --project . --target plugin`, et commités pour qu'un clone
suffise. Un test vérifie qu'ils n'ont pas dérivé de leur source ; `claude plugin validate . --strict`
reste le contrôle qui fait foi.

Le plugin ne couvre que Claude Code. Pour GitHub Copilot, ou pour poser les skills dans un dépôt sans
passer par un marketplace, l'installateur ci-dessous reste la voie.

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
| `tizi-plan` | `/tizi-plan` | agent `tizi-plan` | Étape 4 : planification |
| `tizi-sprint-review` | `/tizi-sprint-review` | agent `tizi-sprint-review` | Fin d'itération : sprint review (produit, backlog, prévision) puis rétrospective (coûts, blocages, actions) |
| `tizi-bug` | `/tizi-bug` | agent `tizi-bug` | Pour les testeurs : signaler un problème, retrouver ce qui était convenu, le trier (défaut rattaché à l'exigence contredite, changement, question, doublon, non reproductible) |
| `tizi-backlog` | `/tizi-backlog` | agent `tizi-backlog` | Application d'un plan d'opérations approuvé dans GitHub ou Jira |
| `tizi-impl` | `/tizi-impl` | agent `tizi-impl` | Étape 5 : implémentation d'une tâche |
| `tizi-test` | `/tizi-test` | agent `tizi-test` | Étape 6 : vérification de release, avec des preuves issues de la CI sur le commit candidat, et la preuve par épopée et story |

**Choisir le chemin.** Toutes les initiatives ne traversent pas toutes les étapes. Au démarrage, `/tizi` pose six questions fermées (modification évidente ? exigence réglementaire ou sécurité des patients ? intention floue ? règle métier ? contrat, donnée sensible ou composant ? plusieurs jours ?) et `choose-path.mjs` en déduit le chemin : **hors Tizi**, **voie rapide** (plan puis implémentation), **court** (seulement les étapes nécessaires) ou **complet**. Le choix est une décision enregistrée dans `.tizi/chemins/<initiative>.yaml`, avec les réponses et qui l'a prise. La question réglementaire impose toujours la chaîne complète. Un chemin ne se rétrécit pas ; il s'élargit (`--elargir`) quand une étape découvre ce qu'il fallait.

**Application existante.** `adopt.mjs` observe le dépôt sans rien exécuter (projets Xcode, `package.json`, Prisma, docker-compose, contrats) et propose `impl/config.yaml` et une carte grossière des conteneurs, chacun prouvé par un fichier, dans `.tizi/adoption.yaml`. Le code qui ressemble à l'application sans en être — fixtures, exemples, données de test — est **écarté et signalé comme incertain**, jamais ignoré en silence : `--inclure <chemin>` le réintègre si c'est bien un composant à préserver. Ensuite, chaque changement ne cartographie que ce qui le borde : le PRD relève les comportements existants à préserver, la conception reprend la carte comme existant à vérifier, et l'implémentation fige l'existant par des tests de caractérisation avant de le modifier.

**La constitution du produit.** `.tizi/constitution.yaml` tient les quelques principes que toutes les initiatives respectent (par exemple « aucune donnée de santé ne doit apparaître dans un journal »), chacun avec son moyen de vérification et son responsable ; `constitution.mjs` refuse un principe invérifiable, n'accepte un candidat que par son responsable, trace amendements et dérogations, et exécute les contrôles automatiques — **mais seulement s'ils sont signés**. Ces contrôles sont des commandes de shell lues dans un fichier du dépôt et lancées par la porte de PR, localement et en CI sur chaque pull request : une constitution modifiée ferait exécuter n'importe quoi. Une empreinte approuvée n'y suffirait pas, puisque qui modifie le fichier la recalcule. `--generer-cle` crée une paire Ed25519, `--signer` signe la **surface exécutable** (les commandes des principes actifs, et elles seules : récrire un énoncé ne casse pas la signature), et la clé publique de confiance se déclare **hors du dépôt** — `TIZI_CONSTITUTION_PUBKEY`, variable du dépôt en CI, profil du développeur en local. Une pull request ne peut donc pas s'autoriser elle-même. Sans signature valide, rien n'est exécuté et la porte refuse C10 au lieu de l'affirmer. Les principes sont vérifiés au BRD et à la conception (S79), repris dans la fiche de chaque tâche, contrôlés par la revue de code et la porte de PR (C10), prouvés à la release et reportés dans `AGENTS.md`.

**Questions, relectures, analyse croisée.** `ask-five.mjs` présente les cinq zones d'ombre qui comptent le plus ; `review-checklist.mjs` génère des listes de contrôle de relecture par domaine, cochées par un relecteur nommé et jamais par l'agent (S80) ; `cross-context.mjs` et `cross-merge.mjs` encadrent une analyse croisée du sens, dont les constats deviennent des questions.

**Estimer quand les agents codent.** Le temps de codage n'est plus la ressource rare ; l'attention humaine, l'attente, les allers-retours et les blocages le sont. La taille d'une tâche se lit comme un risque, calculé depuis ses données ; chaque tâche porte une attention humaine prévue, comparée à la capacité de l'itération. `measure.mjs` mesure le réel à partir du journal horodaté des tâches, du registre des blocages (`block.mjs`, causes typées) et des sessions (tokens), et propose la calibration ; `forecast.mjs` prévoit la fin à partir du débit réel.

**Instructions du dépôt.** `sync-agent-instructions.mjs` écrit dans `AGENTS.md` un bloc délimité, tiré des états de Tizi : règles des ADR, dossiers de chaque composant, contrats, données sensibles, commandes de test. `CLAUDE.md` l'importe. Ce sont les consignes que lisent les agents qui ne passent pas par Tizi. Le reste du fichier n'est jamais touché, et `--check` signale un bloc périmé ou un dossier disparu.

Ce sont des coquilles : chacune charge son skill, qui reste la seule source des règles. Les agents Copilot n'ont que les outils de leur étape (l'entrée `tizi` et `tizi-backlog` ne peuvent pas éditer de fichiers) et proposent des boutons de passage vers l'étape suivante. Les sous-agents internes (critiques du council, perspectives de revue, vérificateur) portent la marque `user-invocable: false` des deux côtés : **Copilot les exclut** de la liste de l'utilisateur ; **Claude Code les affiche encore**, d'où la mention « ne pas utiliser directement » dans leur description. Un test vérifie la marque et la mention sur les deux cibles.

Options : `--ci` ajoute trois workflows GitHub Actions : `tizi-pr-gate.yml` rejoue la porte de PR sur chaque pull request ; `tizi-preuves.yml` produit les preuves de release sur le commit lui-même, avec leur manifeste de provenance ; `tizi-sprint-review.yml` prépare chaque jour ouvré les sprint reviews dues et ouvre une issue (droits : lecture du dépôt, et écriture des issues pour ce dernier). `ci-audit.mjs` vérifie ensuite la configuration de la CI ; `--skills brd-builder,prd-builder` pour n'en installer qu'une partie, `--user` pour les skills et agents personnels, `--dry-run` pour voir sans écrire. La commande est idempotente. Il faut Node.js 18 ou plus ; aucune dépendance n'est à installer.

## Où sont les preuves de tests

| Moment | Emplacement | Durée |
|---|---|---|
| Passage de CI | `tizi-preuves/` (rapports et manifeste de provenance) | le temps du passage |
| Après le passage | artefact GitHub `tizi-preuves` | **90 jours par défaut**, puis supprimé |
| Vérification | `qa/<initiative>/ci/` : copie téléchargée (ignorée par Git), relevé de provenance et manifeste | tant qu'on ne l'efface pas |
| Après l'approbation | `qa/<initiative>/evidence/<version>/` : archive figée avec empreintes et commit | **durable une fois commitée** |

L'artefact de CI expire : la copie qui fait foi est l'archive, commitée dans le dépôt. `freeze-evidence.mjs --check` vérifie qu'elle l'est et qu'elle est intacte.

## skills/

Les sept skills, au format ouvert Agent Skills (validés par `skills-ref`), utilisables avec Claude Code et GitHub Copilot. Chaque dossier contient son `SKILL.md`, ses références (`references/`), son modèle d'état (`templates/`) et ses scripts Node (`scripts/`, sans installation : `js-yaml` est embarqué).

| Skill | Étape | Rôle |
|---|---|---|
| `brd-builder` | 1 | Opportunité (Assess), puis BRD : Discover, Define, Govern |
| `prd-builder` | 2 | PRD : Frame (dont tests de valeur et d'usage), Specify, Govern |
| `sad-builder` | 3 | Conception : moteurs, domaine, C4, ADR (MADR v4), NFR, contrats, STRIDE, brownfield léger |
| `plan-builder` | 4 | Plan : stories, example mapping, tâches, sprint ou flux, revue, préparation de l'export (lecture seule) |
| `backlog-executor` | 4 | Seul skill qui écrit dans GitHub ou Jira, après approbation de l'empreinte du plan d'opérations |
| `impl-builder` | 5 | Implémentation tâche par tâche : compréhension validée, BDD puis TDD sous contrôle d'un hook, porte de PR. Hors tâche, le hook refuse ; le chemin « hors Tizi » et les correctifs d'urgence passent par une **dérogation** nommée, motivée et datée (`derogation.mjs`), tracée dans `.tizi/derogations.jsonl` |
| `test-builder` | 6 | Vérification de release : matrice de couverture des exigences, exploratoire, porte de release, preuves |

Chaque skill sait reprendre une session interrompue (`references/sessions.md`) : un hook conserve la transcription et en tire un extrait, `status.mjs` donne le point d'étape, `session-search.mjs` retrouve un détail.

Fichiers communs, identiques d'un skill à l'autre, dont `scripts/lib/agent-io.mjs` qui adapte les hooks à Claude Code, à Copilot et à VS Code : `scripts/lib/common.mjs`, `scripts/lib/rules.mjs` (catalogue de vérification), `scripts/lib/sessions.mjs`, `scripts/lib/checklists.mjs`, `scripts/session-capture.mjs`, `scripts/session-search.mjs`, `scripts/session-start.mjs`, `scripts/status.mjs`, `scripts/next-step.mjs`, `scripts/choose-path.mjs`, `scripts/sync-agent-instructions.mjs`, `scripts/adopt.mjs`, `scripts/block.mjs`, `scripts/due-reviews.mjs`, `scripts/constitution.mjs`, `scripts/ask-five.mjs`, `scripts/review-checklist.mjs`, `scripts/cross-context.mjs`, `scripts/cross-merge.mjs`. Trois autres sont communs aux seuls skills qui produisent un document — `brd-builder`, `prd-builder`, `sad-builder`, `plan-builder` : `scripts/lint.mjs`, `scripts/freeze-version.mjs`, `scripts/verify-handoff.mjs` (ce dernier également dans `impl-builder` et `test-builder`). `scripts/lib/testing.mjs` sert aux étapes 5 et 6. Toute modification de l'un d'eux se recopie dans tous les skills qui l'ont.

## tests/

`npm test` (ou `node --test tests/*.test.mjs`) rejoue toute la chaîne sur une copie du cas d'exemple, sans dépendance : conformité des skills à la spécification Agent Skills, identité des fichiers communs, vérification et rendu des quatre documents, intégrité des handoffs, verrous de l'exécuteur, garde-fou TDD avec les charges utiles de Claude Code, Copilot et VS Code, capture des sessions, installation, revue de code, portes de PR et de release, réalisé et prouvé. Les constats de la vérification sont comparés à des références figées (`tests/golden/`) : `npm run test:update-golden` après un changement voulu. À lancer après toute modification d'un fichier commun.

## evals/

Deux bancs d'évaluation, à lancer avec un vrai agent (Claude Code ou Copilot) :

- **ablation** (`run-ablation.mjs`) : chaque cas joué avec et sans skill, sur plusieurs passes, pour mesurer ce que le skill apporte ;
- **déclenchement** (`run-triggers.mjs`) : des requêtes proches, jouées plusieurs fois, pour vérifier que le bon skill s'active (ou aucun), avec une séparation entraînement/test fixe. `description-overlap.mjs` contrôle en plus, sans agent, que les descriptions des skills ne se chevauchent pas.

Voir `evals/README.md`.

## exemple/

Le cas « Dossiers complets » qui a servi à tester toute la chaîne : `brd/`, `prd/`, `sad/` et `plan/` (états, documents générés, versions figées, handoffs avec empreintes), et `repo/`, un petit dépôt Node où les étapes 5 et 6 ont été jouées (configuration, tests, journal TDD, description de PR, matrice de couverture et preuves archivées), et `.tizi/sessions/`, une session capturée avec son extrait. Les données sont fictives et contiennent volontairement des défauts pour déclencher les vérifications.
