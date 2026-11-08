# Audit indépendant de Tizi — 8 novembre 2026

Audit en lecture seule du dépôt `/home/diabeo/Projets/Tizi`, mené sans historique de conversation et
sans hypothèse fournie. Aucun fichier du dépôt n'a été modifié ; ce rapport est la seule écriture.

## Périmètre et méthode

Lu : `README.md`, `INCERTITUDES.md`, `package.json`, `.gitignore`, `.github/workflows/tests.yml`,
`.claude-plugin/*`, `install.mjs`, `doc-regles.mjs`, `entrypoints/entrypoints.yaml`, `hooks/hooks.json`,
`com.github.copilot/hooks/hooks.json`, `documentation/regles-de-controle.md`, les parties pertinentes de
`documentation/Tizi - un SDLC agentique.md`, les huit `skills/*/SKILL.md`, les `references/` et
`templates/` cités, les scripts de hook (`tdd-guard.mjs`, `session-capture.mjs`, `session-start.mjs`,
`question-guard.mjs`), les scripts de chaîne (`choose-path.mjs`, `next-step.mjs`, `ingest-handoffs.mjs`,
`close-sprint.mjs`, `pr-gate.mjs`, `apply-operations.mjs`, `adopt.mjs`, `constitution.mjs`,
`derogation.mjs`, `defect.mjs`, `freeze-evidence.mjs`), `tests/` (titres et invariants), `evals/`,
et le dossier `exemple/`.

Commandes lancées (toutes en lecture) : `ls`, `find`, `grep`, `md5sum`, `diff -rq`, `du`,
`git status --short`, `git ls-files`.

**Limite de vérification à déclarer d'emblée** : dans l'environnement de cet audit, l'exécution de Node
est refusée par le système de permissions (`node -e "console.log('ok')"` répond « This command requires
approval », idem `npm test` et `node --test tests/entrypoints.test.mjs`). Je n'ai donc **pas** pu :
lancer la suite de tests, lancer `install.mjs` sur une copie, lancer `doc-regles.mjs --verifier`, ni
soumettre les hooks à des charges utiles tordues. Tous les constats ci-dessous sont établis **par
lecture**, complétée par `md5sum`, `diff` et `grep`. Quand un constat aurait demandé une exécution pour
être clos, je le dis et je donne la commande qui le fermerait.

`git status --short` ne renvoie rien : l'arbre de travail est propre, les constats portent donc sur
l'état commité. Le répertoire `TestTizi` n'existe pas dans ce dépôt (`ls -d TestTizi` répond « No such
file or directory ») ; rien n'y a été touché.

Ce fichier n'existait pas avant cet audit (`ls evals/audit/` ne listait que `LANCER.md`,
`rapport-2026-10-22-mecanique.md`, `rapport-2026-10-23-independant.md`, `tizi-auditor.md`) : il est créé,
rien n'a été remplacé.

---

## Tableau des constats

### Bloquants

| # | Emplacement | Attendu | Observé | Recommandation |
|---|---|---|---|---|
| B1 | `install.mjs:115` · `entrypoints/entrypoints.yaml:34` · `tests/entrypoints.test.mjs:122` · `README.md:166` | `README.md:166` annonce que les tests couvrent « installation complète **et partielle** (`--skills`, un cas par skill) », donc que tout script cité par un point d'entrée posé existe. | `install.mjs:115` fait retomber le `{scripts}` de l'entrée `tizi` (qui n'a pas de skill) sur `brd-builder`, sinon sur `skills[0]`. Avec `--skills audit-builder`, `skills[0]` vaut `audit-builder`, et le corps de `tizi` (`entrypoints.yaml:34`) appelle `{scripts}/adopt.mjs` — absent de `audit-builder` (`ls skills/audit-builder/scripts/` : pas d'`adopt.mjs`, contre 7 skills sur 8 qui l'ont). La boucle du test d'installation partielle (`tests/entrypoints.test.mjs:122`) énumère sept skills et **omet `audit-builder`** ; son propre commentaire (lignes 118-121) énonce comme « règle vraie » que les scripts communs sont « dans les sept skills ». | Ajouter `audit-builder` à la boucle du test ; faire résoudre `{scripts}` vers un skill qui porte réellement les scripts cités, ou livrer `adopt.mjs` dans `audit-builder`. |
| B2 | `skills/audit-builder/SKILL.md:5` · `skills/audit-builder/references/audit-protocol.md:26-28` · `entrypoints/entrypoints.yaml:139` · `README.md:145` | L'étape 3 du corps de `tizi-audit` ordonne : « Pose-le dans `audit/<slug>/state.yaml` ». Les étapes 4 et 5 lisent ce fichier (`lint.mjs`, `audit.mjs`). `README.md:145` affirme que chaque skill porte « son modèle d'état (`templates/`) ». | `SKILL.md:5` déclare `allowed-tools: Read Bash(node:*)` : aucun outil d'écriture. Aucun script du skill ne crée cet état (`ls skills/audit-builder/scripts/` : `ask-five`, `audit`, `choose-path`, `constitution`, `due-reviews`, `lint`, `next-step`, `session-*`, `status`, `sync-agent-instructions`). Et `ls -d skills/*/templates` ne renvoie pas `audit-builder` : il n'y a aucune forme d'état à copier. `tests/audit.test.mjs:38-43` fabrique l'état par programme, ce qui prouve que `audit.mjs` lit un état, pas qu'un chemin de travail sait en produire un. | Trancher : soit ajouter l'outil d'écriture à `allowed-tools` et un `templates/state.yaml`, soit livrer un script d'import qui pose l'état (`Bash(node:*)` suffit alors). |
| B3 | `skills/impl-builder/scripts/tdd-guard.mjs:48,53-55` · `skills/*/scripts/adopt.mjs:148,157` · `skills/brd-builder/SKILL.md:59` | Le garde-fou TDD est censé protéger le **code** : « refuse toute écriture hors d'une tâche » (`README.md:124`), et `tdd-guard.mjs:57` laisse explicitement passer ce qui n'est « ni test, ni contrat, ni production ». | `tdd-guard.mjs:53-55` refuse **avant** toute classification dès que `paths.production` est vide : tout chemin hors de `always_allowed` est bloqué. Or `adopt.mjs:148` documente que ce cas arrive (« Constaté sur le dépôt de Tizi, dont la pile n'est reconnue par rien »), et `adopt.mjs:157` écrit `always_allowed: ['impl/**', '.impl/**', '.tizi/**', 'docs/**', 'reports/**']` — sans `brd/`, `prd/`, `sad/`, `plan/`, `qa/`. Conséquence : dans un dépôt adopté dont la pile n'est pas reconnue, l'agent du BRD ne peut plus écrire `brd/<slug>/state.yaml`, que `brd-builder/SKILL.md:59` lui ordonne de tenir à jour après chaque échange. Le seul remède offert est une dérogation globale de 60 minutes. | Ajouter `brd/**`, `prd/**`, `sad/**`, `plan/**`, `qa/**` à `always_allowed`, ou restreindre le refus « production vide » aux seuls chemins candidats au code. |

### À corriger

| # | Emplacement | Attendu | Observé | Recommandation |
|---|---|---|---|---|
| C1 | `skills/impl-builder/scripts/tdd-guard.mjs:30-31` · `skills/*/scripts/lib/sessions.mjs:12-23` · `skills/impl-builder/scripts/lib/impl.mjs:7-10,17` | Le garde-fou s'applique dans tout le dépôt. | Il cherche `impl/config.yaml` sous `h.cwd` et sort en silence (`process.exit(0)`) s'il ne le trouve pas. `lib/sessions.mjs:12-23` documente, comme fait observé, que `h.cwd` **bouge** avec un `cd` de l'agent (« un `cd` de l'agent dans un dossier d'initiative y créait un second magasin de sessions », avec les deux copies mesurées). Le même `cd` désactive donc le garde-fou, sans message. `lib/impl.mjs:7-10,17` aggrave : `CURRENT`, `RUNS` et le défaut de `loadConfig` sont relatifs au `cwd`. Le correctif appliqué aux sessions (`projectRoot()`) n'a pas été porté ici. | Ancrer `tdd-guard.mjs` et `lib/impl.mjs` sur `projectRoot()`, comme les sessions. |
| C2 | `skills/impl-builder/scripts/tdd-guard.mjs:32,35,41-43` · `skills/*/scripts/lib/agent-io.mjs:87-89` | Un verdict identique sur les deux outils ; `install.mjs:396` affirme même « Les scripts sont conçus pour le supporter (verdicts identiques, écritures atomiques) ». | Trois lectures ne sont pas protégées : `yaml.load(config.yaml)` (l. 32), `JSON.parse(.impl/current.json)` (l. 35), `JSON.parse(l)` sur chaque ligne de `.impl/runs.jsonl` (l. 41-43). Une exception non rattrapée sort en code 1. `agent-io.mjs:87-89` documente que Claude Code ne bloque que sur 2 — donc **fail-open** — tandis que sous Copilot « toute sortie non nulle d'un hook preToolUse refuse l'appel » — donc **fail-closed**, toute écriture refusée. Un `.impl/current.json` corrompu désactive le garde-fou d'un côté et gèle le travail de l'autre. Non éprouvé par exécution (Node refusé). | Envelopper les trois lectures et décider explicitement du verdict de repli ; ne jamais sortir en 1. |
| C3 | `skills/impl-builder/scripts/pr-gate.mjs:47` · `skills/impl-builder/SKILL.md:44` · `install.mjs:341,379` · `README.md:130` | `impl-builder/SKILL.md:44` : « Ce qui lui échappe (un éditeur sans hooks, une écriture par une commande shell) est arrêté à la PR : **la même porte est rejouée en CI** par `pr-gate.mjs` ». | `pr-gate.mjs:47` encadre C4 (« TDD : au moins un test vu en échec avant le premier vert ») et C9 (« Existant figé par des tests de caractérisation ») dans `if (!rerun)`, et le workflow généré appelle `pr-gate.mjs … --run` (`install.mjs:341`). La cause est structurelle : `.impl/` est ignoré par Git (`install.mjs:379`), donc la CI n'a pas le journal d'exécutions. Les deux conditions qui attestent la discipline TDD sont exactement celles que la CI ne contrôle pas, et exactement celles qu'une écriture au shell contourne. | Corriger l'affirmation, ou verser le journal nécessaire à C4/C9 dans un artefact que la CI puisse relire. |
| C4 | `skills/impl-builder/scripts/pr-gate.mjs:30` · `install.mjs:336-341,367` · `skills/brd-builder/scripts/constitution.mjs:47-56` · `README.md:124` | `README.md:124` : « `ci-run-suites.mjs` exige `--lancer` ou `--sans-lancer` : exécuter des commandes de shell venues d'un fichier du dépôt ne peut pas être un comportement par défaut. » Et `README.md:118` : les commandes de la constitution ne tournent que signées, « une pull request ne peut donc pas s'autoriser elle-même ». | `pr-gate.mjs:30` exécute `cfg.suites[k].command` avec `shell: true`. Ces commandes viennent d'`impl/config.yaml`, fichier **versionné et modifiable par n'importe quelle pull request**, et ne sont couvertes par aucune signature : `constitution.mjs:47-52` ne signe que les commandes des principes actifs. Les deux workflows générés passent l'exécution en dur (`--run` l. 341, `--lancer` l. 367). La protection énoncée ne couvre donc que la CLI locale de `ci-run-suites.mjs`, pas la CI. | Étendre la signature à la surface exécutable d'`impl/config.yaml`, ou dire explicitement que la porte de PR en CI exécute du shell contrôlé par la PR. |
| C5 | `skills/impl-builder/scripts/derogation.mjs:68-84` · `skills/impl-builder/scripts/tdd-guard.mjs:53,61` · `README.md:124,154` | `README.md:124` : « le garde-fou TDD refuse toute écriture hors d'une tâche, sauf **dérogation** nommée, motivée et datée ». Présenté comme une décision humaine (`derogation.mjs:7-8` : « elle est demandée, motivée, attribuée à une personne »). | La dérogation est une **ouverture globale** : tous chemins, 60 minutes par défaut, 480 au maximum, et `tdd-guard.mjs:61` rend « autorisé » pour n'importe quel fichier tant qu'elle est ouverte. `derogation.mjs:68-69` n'exige que deux chaînes non vides ; rien ne distingue un nom humain d'un nom inventé, et aucune confirmation n'est demandée hors du canal de l'agent. Un agent qui a le shell peut donc lever le garde-fou lui-même. | Rendre la dérogation ciblée (chemins, tâche) et exiger une confirmation hors du canal de l'agent ; à défaut, enregistrer que l'ouverture vient de l'agent. |
| C6 | `skills/*/scripts/adopt.mjs:15,36` | `README.md:116` documente `--inclure <chemin>`, et `README.md:124` promet que les scripts écrivants « exigent un dépôt explicite ». | La racine est détectée par `args.find(a => !a.startsWith('--'))` (l. 15), sans exclure la valeur de `--inclure` (lue l. 36). `node adopt.mjs --inclure fixtures/app .` prend donc `fixtures/app` comme racine et écrit `fixtures/app/impl/config.yaml`. Les trois autres scripts écrivants excluent bien leurs options à valeur : `constitution.mjs:122`, `ci-audit.mjs:18`, `sync-agent-instructions.mjs:18`. `adopt.mjs` est le seul à ne pas le faire. Non éprouvé par exécution (Node refusé). | Exclure `--inclure` (et toute future option à valeur) de la détection positionnelle. |
| C7 | `install.mjs:379` · `skills/*/scripts/session-capture.mjs:42-43` · `skills/*/scripts/lib/sessions.mjs:68,80,346` · `README.md:158` | `README.md:158` justifie l'éclatement de l'index par l'absence de conflit Git, et `install.mjs:21` annonce `.gitignore : .impl/ et .tizi/sessions/*.jsonl`. | Le `.gitignore` posé (`install.mjs:379`) n'ignore que `*.jsonl` et `*.tmp`. Les `*.extrait.md` et `*.index.yaml` sont donc **versionnés**, et l'extrait contient les messages de l'utilisateur **mot pour mot** (`sessions.mjs:346`, section « Messages de l'utilisateur, mot pour mot »), réécrits à chaque fin de tour. `exemple/.tizi/sessions/2026-10-28-5be1c0de.extrait.md` le montre, avec un nom de personne en clair. Le masquage (`sessions.mjs:68,80`) ne couvre que des formes de jetons connues, les courriels et les numéros de téléphone. Dans un dispositif qui donne « aucune donnée de santé ne doit apparaître dans un journal » comme exemple de principe (`README.md:118`), c'est un chemin de fuite ouvert, et il grossit le dépôt à chaque tour. | Ignorer `.tizi/sessions/*.extrait.md` par défaut et ne verser que le condensé rédigé, ou faire du versionnement de l'extrait un choix explicite. |
| C8 | `hooks/hooks.json:14-31` · `skills/*/scripts/session-capture.mjs:29,42,58` · `skills/brd-builder/scripts/question-guard.mjs:88-91` · `install.mjs:203,220-223,258` · `com.github.copilot/hooks/hooks.json` | Un hook de fin de tour doit rester négligeable devant le tour lui-même. | Sur `Stop`, deux hooks s'enchaînent (`hooks.json:14-31`), et la transcription est parcourue **trois fois** par capture : `readTranscript(src)` (l. 29), `maskSecrets(readFileSync(src))` pour recopier le fichier entier (l. 42), `usageOf(src)` (l. 58) — plus une quatrième fois par `question-guard.mjs` dès qu'une zone d'ombre ouverte existe. Le commentaire de `question-guard.mjs:88-90` chiffre une seule lecture : « lire une transcription de 70 Mo coûte 1,1 s et 245 Mo ». Le coût croît avec la session : O(n) par tour, donc O(n²) sur la session. Côté Copilot, `PreToolUse` est posé **sans matcher** (`com.github.copilot/hooks/hooks.json` ; `install.mjs:203` pose bien le `matcher`, puis `install.mjs:220-223` aplatit la liste par `v.flatMap(m => m.hooks)` et le perd ; `install.mjs:258` ne l'a jamais posé) : un processus Node démarre à chaque appel d'outil, lectures comprises. Le filtrage est bien refait dans le script (`tdd-guard.mjs:14,26`), donc le verdict reste juste — c'est le coût qui reste. Enfin aucun `timeout` n'est déclaré côté Claude, contre `timeoutSec: 30` côté Copilot. Non mesuré ici (Node refusé). | Lire la transcription une fois par capture, n'écrire la copie `.jsonl` qu'à `SessionEnd`, déclarer un `timeout` côté Claude. |
| C9 | `README.md:162` | « Fichiers communs, identiques d'un skill à l'autre » : la liste énumère `lib/common.mjs`, `lib/rules.mjs`, `lib/sessions.mjs`, `lib/checklists.mjs`, `session-capture.mjs`, `session-search.mjs`, `session-start.mjs`, `status.mjs`, `next-step.mjs`, `choose-path.mjs`, `sync-agent-instructions.mjs`, `adopt.mjs`, `block.mjs`, `due-reviews.mjs`, `constitution.mjs`, `ask-five.mjs`, `review-checklist.mjs`, `cross-context.mjs`, `cross-merge.mjs`. | Vérifié par `ls skills/*/scripts/...` : `lib/rules.mjs` est dans 5 skills sur 8 (audit, brd, plan, prd, sad), `lib/checklists.mjs` dans 3 (brd, prd, sad), `block.mjs` dans 2 (impl, plan), `cross-context.mjs` et `cross-merge.mjs` dans 2 (prd, sad), `review-checklist.mjs` dans 3 (brd, prd, sad), `adopt.mjs` dans 7 (absent d'audit-builder). La même phrase annonce `lint.mjs` comme propre aux quatre skills « qui produisent un document », alors qu'`audit-builder` le porte aussi et que `entrypoints.yaml:140` l'appelle. Et `lib/gates.mjs`, présent dans les 8, ne figure pas dans la liste. Les fichiers effectivement présents sont bien identiques : `md5sum` ne rend qu'une empreinte par nom. | Remplacer la liste par un tableau de présence généré, comme pour `regles-de-controle.md`. |
| C10 | `README.md:145` | « Chaque dossier contient son `SKILL.md`, ses références (`references/`), son modèle d'état (`templates/`) et ses scripts Node ». | `ls -d skills/*/templates` ne renvoie que six dossiers : `brd-builder`, `impl-builder`, `plan-builder`, `prd-builder`, `sad-builder`, `test-builder`. `audit-builder` et `backlog-executor` n'ont pas de `templates/`. Pour `audit-builder`, c'est aussi une cause de B2. | Corriger la phrase, et livrer le gabarit manquant à `audit-builder`. |
| C11 | `skills/audit-builder/scripts/lib/vendor/` | `README.md:145` : « sans installation : `js-yaml` est embarqué ». Le dépôt est sous MIT (`.claude-plugin/plugin.json:9`) et public : la licence du code embarqué doit l'accompagner. | `ls -la skills/*/scripts/lib/vendor/` : `js-yaml.LICENSE` (1 084 octets) est présent dans 7 skills et **absent d'`audit-builder`**, alors que `js-yaml.mjs` y est identique (`md5sum 734a616792f01cf863410f6191a155d5` partout). Les tests d'identité comparent les fichiers homonymes présents de part et d'autre : une absence leur échappe. | Copier `js-yaml.LICENSE` dans `audit-builder`, et faire échouer le test quand un fichier de `vendor/` manque dans un skill qui embarque la bibliothèque. |
| C12 | `exemple/plan/demo/` vs `exemple/repo/plan/demo/` | `README.md:194` présente `exemple/` comme un cas unique : « le cas « Dossiers complets » qui a servi à tester toute la chaîne ». | `diff -rq exemple/plan/demo exemple/repo/plan/demo` : `state.yaml`, `plan.md`, `refs.yaml`, `exports/github/operations.md`, `operations.yaml` et son `.sha256` diffèrent, et `tasks/TK-008.md` n'existe que dans la copie de premier niveau. Deux copies divergentes du même plan cohabitent, et les étapes 5 et 6 ont été jouées contre celle de `repo/`. Un lecteur qui suit `exemple/plan/demo` ne regarde pas le plan qui a servi. `tests/helpers.mjs:50` copie tout `exemple/`, donc les deux partent dans chaque bac à sable. | Faire de `exemple/repo/plan/` une copie unique (lien ou génération), et vérifier l'égalité par un test. |
| C13 | `skills/*/references/questions.md:227` | La référence des questions est « commune aux huit skills » et « vérifiée identique » (`README.md:112,160`). | Elle l'est (`md5sum 2fa58f5d292e26d567f84bd84c9fc753` sur les 8), mais sa ligne 227 renvoie à `references/council.md`, qui n'existe que dans `brd-builder`, `plan-builder`, `prd-builder` et `sad-builder`. Dans `audit-builder`, `backlog-executor`, `impl-builder` et `test-builder`, le lien est mort — un agent qui le suit ne trouve rien. | Rendre ce renvoi conditionnel, ou le reformuler pour ne pas pointer un fichier absent. |
| C14 | `.claude-plugin/marketplace.json:13` · `documentation/Tizi - un SDLC agentique.md:72,93` | `README.md:52` et `tests/skills.test.mjs:11` fixent la réalité : huit skills, onze points d'entrée, douze sous-agents. | `marketplace.json:13` annonce « Les **sept** skills du SDLC et leurs **dix** points d'entrée ». `documentation/Tizi - un SDLC agentique.md:72` : « les **sept** skills sont validés par son validateur officiel », contredit ligne 920 par « c'est le **huitième** skill ». La liste des points d'entrée de ce même document, ligne 93, énumère dix noms et **omet `tizi-audit`**. Vérification : `entrypoints.yaml` déclare 11 entrées, `ls commands/` en contient 11, `ls skills/` en contient 8, et `tests/skills.test.mjs:11` affirme `assert.equal(skills.length, 8)`. Aucun test ne lit ces textes : `tests/plugin.test.mjs:19-29` ne vérifie que `name`, `owner`, `plugins` et `source`. | Éviter les comptes en prose, ou les faire vérifier par un test qui lit `skills/` et `entrypoints.yaml`. |
| C15 | `README.md:72-74` | « tout le dépôt part donc avec, soit **7 Mo installés dont un peu plus de la moitié ne sert jamais** au plugin (le PDF de la documentation, l'exemple, les évaluations, les tests) ». | Le PDF n'est plus suivi : `README.md:36` dit qu'il a été retiré, `.gitignore` exclut `/documentation/*.pdf`, et `git ls-files documentation` ne rend que six fichiers Markdown. Mesuré avec `du -sb --apparent-size` : `skills/` 5,30 Mo (indispensable), `exemple/` 0,47, `tests/` 0,58, `evals/` suivi ≈ 0,26 (4,14 moins 3,88 de `results/`, ignoré), `documentation/` Markdown 0,48 ; total suivi ≈ 7,5 Mo, dont la part inutile au plugin ≈ 1,8 Mo, soit environ un quart. Le chiffre global de 7 Mo tient ; la proportion et sa justification par le PDF sont fausses. Mesure par blocs apparents, à un dixième de mégaoctet près. | Retirer la mention du PDF et corriger la proportion, ou renvoyer à une mesure plutôt qu'à un chiffre figé. |
| C16 | `skills/plan-builder/scripts/ingest-handoffs.mjs:14-15` · `skills/plan-builder/SKILL.md:50` · `skills/brd-builder/scripts/choose-path.mjs:31-33` | `plan-builder/SKILL.md:50` : « Sans l'un des deux issu d'une baseline, dis-le : le plan n'a pas de référence stable ; l'utilisateur décide s'il continue. Crée `plan/<slug>/` […], lance `ingest-handoffs.mjs` ». | `ingest-handoffs.mjs:14` exige les trois arguments (`if (!statePath || !prdPath || !sadPath) fail(...)`) et `:15` que chacun existe. Or `choose-path.mjs:31` produit `voie-rapide` = `['plan','impl']` (ni PRD ni conception) et `:32-33` un chemin `court` qui peut valoir `['prd','plan','impl','qa']` (pas de conception). Dans ces deux cas, la commande prescrite est inutilisable, et ni `--force` ni `--accepte-non-baseline` ne lèvent l'exigence de présence. Le flux survit — toutes les lectures de `refs.yaml` sont gardées (`render-plan.mjs:20`, `lint.mjs:21`, `status.mjs:102`, `lib/gates.mjs:288-291`) — mais la condition de porte « chaque exigence de la release est couverte par une story validée » devient « non mesuré : refs.yaml absent ». | Rendre `--prd` et `--sad` indépendamment facultatifs, en nommant celui qui manque, et ajuster l'instruction du skill. |

### Mineurs

| # | Emplacement | Attendu | Observé | Recommandation |
|---|---|---|---|---|
| M1 | `README.md:128` · `entrypoints/entrypoints.yaml:27,115,153` | « Les agents Copilot n'ont que les outils de leur étape (l'entrée `tizi` et `tizi-backlog` ne peuvent pas éditer de fichiers) ». | `tizi-bug` non plus : sa liste `tools` (`entrypoints.yaml:115`) ne contient pas `edit`. Trois entrées sur onze sont sans écriture, pas deux. | Compter trois, ou générer la phrase depuis `entrypoints.yaml`. |
| M2 | `README.md:120` · `tests/skills.test.mjs:156-171` | « Un script n'est livré que là où une phase dit de l'appeler : un test le vérifie. » | Le test accepte en fait la **mention du nom de fichier** dans le `SKILL.md`, dans n'importe quelle référence du skill, dans `entrypoints.yaml`, `install.mjs`, les deux `hooks.json` ou un workflow (lignes 157-168 : `dits.some(x => x.includes(n))`). Cas concret : `audit-builder/scripts/ask-five.mjs` ne passe le test que parce que la référence partagée `questions.md:32,46,274` parle d'`ask-five.mjs` en décrivant d'autres skills ; aucune phase d'`audit-builder` ne le lance, et son `SKILL.md` ne le cite pas. | Resserrer le test sur les phases et le `SKILL.md` du skill concerné, ou affaiblir l'affirmation. |
| M3 | `skills/plan-builder/references/phase-review.md:7` · `skills/plan-builder/scripts/close-sprint.mjs:148` | La même ligne de `phase-review.md` rattache `review.carryover` à S76 et `review.actions_followup` à S77. | `review.blockage_actions` est prescrit au même endroit et rappelé dans le document généré, mais `grep -rn blockage_actions skills/` ne le trouve dans aucune règle : seuls `carryover` et `actions_followup` sont contrôlés (`lib/rules.mjs:1417,1421`). C'est la seule des trois lignes à ne porter aucun code de règle. | Ajouter la règle, ou dire que ce champ n'est pas contrôlé. |
| M4 | `skills/backlog-executor/scripts/apply-operations.mjs:72,76,136-150` · `entrypoints/entrypoints.yaml:152` | Trois niveaux d'autonomie proposés à l'utilisateur : `complet`, `partiel`, `manuel`, le niveau `partiel` excluant les actions destructives. | `DESTRUCTIVE = ['close','transition','delete']` (l. 72) ne correspond à rien : `grep -oE "action: '[a-z_]+'" skills/plan-builder/scripts/plan-operations.mjs` ne rend que `create`, `create_label`, `create_milestone`, `link`, `update`, et `execute()` (l. 136-150) n'implémente aucune des trois actions destructives — elles tombent dans `default: throw`. `complet` et `partiel` sont donc indiscernables aujourd'hui. Aucun fichier de `skills/**/*.md` ne mentionne « destructi ». | Retirer le niveau, ou implémenter les actions qu'il est censé retenir. |
| M5 | `README.md:26-32` | Le tableau annonce le contenu de `documentation/`. | Il liste cinq fichiers ; `git ls-files documentation` en suit six. `notes-hve-entretiens.md` (28 370 octets) n'y figure pas. | Compléter le tableau. |
| M6 | `skills/*/scripts/session-start.mjs:13-15` · `tests/entrypoints.test.mjs:120` · `tests/skills.test.mjs:121,132,499,781,806,830,865` | Huit skills (`tests/skills.test.mjs:11`). | Commentaires et titres figés à « sept skills » / « cinq skills sur sept ». Sans effet fonctionnel, sauf en un point : `tests/entrypoints.test.mjs:120` énonce comme « règle vraie » un invariant que le huitième skill viole déjà (voir B1). | Mettre les commentaires à jour en même temps que la boucle du test. |
| M7 | `evals/triggers.yaml` | `README.md:173` : le banc de déclenchement vérifie « que le bon skill s'active (ou aucun) ». | `grep -oE "expected: [a-z-]+" evals/triggers.yaml \| sort \| uniq -c` : `aucun` 5, `backlog-executor` 2, `brd-builder` 3, `impl-builder` 3, `plan-builder` 3, `prd-builder` 2, `sad-builder` 2, `test-builder` 2 — **aucun cas pour `audit-builder`**. Le banc ne mesure donc rien sur la description la plus récente, qui est aussi celle qui partage le plus de vocabulaire avec les quatre skills de document. | Ajouter des requêtes proches pour `audit-builder`, dont des cas qui ne doivent **pas** le déclencher. |
| M8 | `install.mjs:379` · `skills/test-builder/scripts/defect.mjs:27` · `skills/impl-builder/scripts/derogation.mjs:19,45-49` | `README.md:158` et `lib/sessions.mjs:33-38` posent la doctrine : un fichier versionné réécrit par chacun produit des conflits sur un fichier que personne n'édite à la main ; l'index des sessions a été éclaté pour cette raison. | Deux fichiers y échappent encore : `.tizi/defauts/<initiative>.yaml`, relu puis **réécrit en entier** à chaque signalement ou tri (`defect.mjs:27`), et `.tizi/derogations.jsonl`, en ajout de ligne (`derogation.mjs:45-49`). Ni l'un ni l'autre n'est dans le `.gitignore` posé (`install.mjs:379`). Deux testeurs qui signalent le même jour sur la même initiative obtiennent le conflit que la doctrine vise. | Appliquer la même solution : un fichier par signalement, ou par auteur. |
| M9 | `exemple/plan/demo/review/IT-1/` | `close-sprint.mjs:152` produit `review/<IT-n>/sprint-review.md`, et `tests/sprint-review.test.mjs:33,107` le relisent. | Le dossier commité ne contient que `equipe.md` et `parties-prenantes.md` (sorties de `sprint-review.mjs:56-57`). La sortie principale de `tizi-sprint-review` n'apparaît pas dans l'exemple. | Régénérer `exemple/` après chaque changement de sortie, ou le dire. |
| M10 | `install.mjs:337-340` | Le workflow de porte de PR ne doit pas gêner une PR qui ne concerne pas Tizi (ligne 338 prévoit « porte non applicable »). | Le `TK-xxx` est extrait du titre **et** de la branche (l. 337), puis l'absence d'état fait `exit 1` (l. 340). Une PR intitulée « Corrige la référence à TK-123 dans la documentation » échoue donc sur une porte qui ne la concerne pas. | Ne refuser que si le `TK` vient de la branche, ou traiter l'absence d'état comme « non applicable » avec un avertissement. |
| M11 | `install.mjs:46,56,273-343` | `--target plugin --user` est explicitement refusé (l. 46) : les combinaisons sans sens sont rejetées. | `--target plugin --ci` ne l'est pas, alors que `relSkills` vaut alors `.claude/skills` (l. 56) et que les workflows générés (l. 298, 341, 367) pointeraient un chemin qui n'existe pas dans une installation par plugin. | Refuser `--ci` avec `--target plugin`, ou générer les chemins du plugin. |
| M12 | `package.json:7` · `INCERTITUDES.md:104-113` · `skills/*/scripts/adopt.mjs:90` | `engines: { node: ">=18" }`, et `README.md:130` : « Il faut Node.js 18 ou plus ». | `adopt.mjs:90` propose `node --test --test-reporter=junit --test-reporter-destination=reports/unit.xml`. **Hypothèse, non mesurée ici** : d'après ma connaissance des versions de Node, ces deux options n'existent qu'à partir de 18.17 ; elles échoueraient donc sur un 18.0–18.16 pourtant annoncé comme supporté. C'est le constat nº 8 d'`INCERTITUDES.md`, toujours ouvert, et il n'est repris sous aucune réserve dans le `README`. | Fermer l'incertitude par la commande déjà écrite dans `INCERTITUDES.md:112`, puis remonter le plancher ou changer la commande générée. |
| M13 | `skills/*/scripts/lib/agent-io.mjs:30` | Reconnaître les outils d'écriture des trois surfaces. | La liste explicite (l. 27-29) est complétée par `/(^|_)(edit\|write\|create\|replace\|insert\|patch)(_\|$)/i`, qui classe comme outil d'écriture tout outil nommé par exemple `mcp__x__create_issue`. Sans conséquence sous Claude Code (le `matcher` filtre en amont) ; sous Copilot, où `PreToolUse` n'a pas de matcher, le hook s'exécute et ne sort en 0 que parce que `writtenPaths` ne trouve aucun chemin. | Préférer la liste explicite, et ne garder le motif large que pour des préfixes connus. |
| M14 | `skills/plan-builder/scripts/ingest-handoffs.mjs:11` · `skills/plan-builder/scripts/close-sprint.mjs:18` · `skills/impl-builder/scripts/derogation.mjs:42-43` · `skills/brd-builder/scripts/choose-path.mjs:41` | Trouver l'argument positionnel parmi les options. | Tous s'appuient sur `args.indexOf(a)`, qui rend la **première** occurrence de la valeur. Deux arguments de même valeur (`--prd x.yaml --sad x.yaml`, ou une initiative homonyme d'une valeur d'option) font prendre le mauvais élément. | Parcourir `args` par index (`findIndex` ou boucle) au lieu de rechercher la valeur. |
| M15 | `README.md:20,58` | Dire comment on démarre. | Ligne 20 : « Point de départ : `/tizi` ». Ligne 58 : les commandes du plugin s'appellent `/tizi:tizi-brd`. Les deux sont vraies selon le mode d'installation, mais la ligne 20 précède la section plugin. | Préciser « `/tizi` après `install.mjs`, `/tizi:tizi` en plugin ». |
| M16 | `skills/brd-builder/scripts/question-guard.mjs:93` | Prévenir quand la même question repart une troisième fois. | Le hook ne balaie que les dossiers de `PHASES` (`brd`, `prd`, `sad`, `plan`, et `qa` par `DOSSIER` de `lib/common.mjs:149`) et ignore `impl/`, dont l'état porte aussi des `shadow_zones` (contrôlées par `pr-gate.mjs:44-45`, condition C2). Une question répétée pendant l'implémentation n'est pas vue. | Ajouter `impl/`, ou dire que le garde-fou est propre à l'élicitation. |

---

## Verdicts par enchaînement

Trois verdicts possibles : **tient**, **fragile**, **cassé**. Chacun avec sa preuve.

### BRD → PRD — **tient**

`brd-builder/scripts/build-handoff.mjs` produit `brd/<slug>/handoff/v<x.y>/handoff.yaml` avec son
`.sha256` (vérifié sur `exemple/brd/demo/handoff/v1.0/`, trois fichiers présents).
`prd-builder/SKILL.md:21-25` déclare les deux modes d'entrée — chaîné sur ce handoff, autonome — et la
section « Intégrité et couverture » prescrit `verify-handoff.mjs` avant toute ingestion, avec report de
`sha256` **et** `status` (S108). Le handoff d'exemple porte bien un bloc `integrity` avec `source_state`
et `source_doc`, c'est-à-dire les deux empreintes que `README.md:9` annonce.

Le transfert reste **médié par l'agent** : il n'existe pas de script d'ingestion côté PRD (`ls
skills/prd-builder/scripts/` ne montre aucun `ingest-*.mjs`). Ce n'est pas une impasse — aucune donnée
attendue en aval n'est absente en amont — mais c'est le seul maillon de la chaîne où rien de
déterministe ne recopie.

### PRD → conception — **tient**

Même dispositif, et le contenu concorde. `exemple/prd/demo/handoff/v1.0/handoff.yaml` porte
`releases[].functional_requirements` avec leurs `acceptance`, `story_map`, `business_rules`,
`non_functional`, `coverage` et `integrity`. C'est exactement ce dont la conception a besoin pour
allouer les FR aux éléments : le handoff de conception rend la mesure `fr_allocated` à 2/2 sur les deux
FR du PRD. `sad-builder` porte `cross-context.mjs` et `cross-merge.mjs` comme le PRD, ce que
`README.md:120` annonce.

### Conception → plan — **fragile**

Le contenu passe. `exemple/sad/demo/handoff/v1.0/handoff.yaml` porte `work_items`, `retired`,
`decisions`, `interfaces` avec leurs `operations`, `verifications`, `security_measures`,
`accepted_risks`, `spikes`, `tech_debt`, `data` et `coverage` ; `ingest-handoffs.mjs:45-46` lit bien
`prd.releases[].functional_requirements` et `sad.work_items`, et `lib/impl.mjs:35-39` retrouve plus tard
dans `refs.yaml` les FR, les AC, les ADR et les éléments `existant_modifié` dont la tâche a besoin.

La fragilité est l'**entrée du script**, non son contenu : voir C16. Il refuse de tourner sans les deux
handoffs, alors que deux des quatre chemins de `choose-path.mjs` n'en produisent pas deux. Le plan
avance quand même sans `refs.yaml` — toutes ses lectures sont gardées par `existsSync` — et la condition
de porte concernée devient « non mesuré : refs.yaml absent (ingest-handoffs.mjs) »
(`plan-builder/scripts/lib/gates.mjs:291`), ce qui est honnête et conforme à la doctrine des trois états
de condition.

### Plan → implémentation — **tient**

`impl-builder/SKILL.md:47-49` exige le handoff du plan, sa vérification, puis `start-task.mjs`.
`lib/impl.mjs:24-45` remonte au **plan figé** désigné par le handoff
(`plan/<slug>/versions/v<x.y>/state.yaml` et `refs.yaml`, avec `fail` explicite s'il manque, l. 28) et en
tire `expected` (exemples, critères d'acceptation, comportements à préserver), `elements`, `operations`,
`threats`, `verifications`, `adrs`. Tout ce que `pr-gate.mjs` et `trace-check.mjs` réclament ensuite
existe donc bien dans ce que le plan produit. `exemple/repo/.impl/current.json` montre la forme attendue
(`allowed_paths`, `contracts_allowed`, `expected_ids`, `operations`). Réserve : C1 sur les chemins
relatifs.

### Implémentation → vérification de release — **tient**

`exemple/repo/qa/demo/` montre la chaîne entière : `matrix.yaml`, `state.yaml`, puis
`evidence/1.0.0-rc1/` avec `MANIFEST.sha256`, `matrix.yaml`, `test-state.yaml` et les six rapports
collectés. L'en-tête de `freeze-evidence.mjs:1-7` confirme ce que `README.md:141` annonce, `--check`
compris (« vérifier que l'archive est intacte et commitée (code 1 sinon) »). Le tableau de
`README.md:134-139` correspond aux emplacements réels, et `qa/*/ci/*/` est bien dans le `.gitignore`
posé par l'installateur (`install.mjs:379`).

### Commande `tizi` — **fragile**

`next-step.mjs` couvre tous les cas que la documentation annonce, et c'est vérifiable ligne à ligne :
étape la plus avancée présente (l. 53), chemin décidé respecté (l. 104-115), opportunité découpée
distinguée d'une opportunité jetée (l. 58-64), audit commencé et non rendu (l. 67), signalements à trier
avant la sprint review (l. 92-96), empreinte exacte d'un plan d'opérations approuvé (l. 79-81), session
sans condensé (l. 120-121). Les six questions du chemin citées dans le corps de l'entrée
(`entrypoints.yaml:37-43`) correspondent exactement aux six clés et à l'ordre de
`choose-path.mjs:15-22`, et les quatre chemins annoncés par `README.md:114` aux quatre valeurs de
`decide()`.

Deux fragilités. B1 d'abord : en installation partielle sur `audit-builder`, la commande cite un script
absent. Ensuite `next-step.mjs:112` — `route.steps[route.steps.indexOf(last) + 1]` rend `route.steps[0]`
quand `last` n'appartient pas au chemin, puisque `indexOf` vaut alors -1. Sur les cas que j'ai déroulés à
la main (BRD seul avec chemin `court`, BRD+PRD avec chemin `voie-rapide`) le résultat tombe juste, mais
par la numérotation, pas par une intention écrite.

### Commande `tizi-sprint-review` — **tient**

Le corps de l'entrée et le script concordent : `due-reviews.mjs` existe,
`close-sprint.mjs plan/<slug>/state.yaml --iteration IT-n` est la signature de `close-sprint.mjs:5,20`,
et le document annoncé est bien écrit en `review/<IT-n>/sprint-review.md` (l. 152). Les quatre champs
cités par `entrypoints.yaml:103-104` existent dans `plan-builder/templates/state.yaml:150,155-157`, et
S76/S77 sont bien émis par `lib/rules.mjs:1417,1421`. Réserves : M3 (`blockage_actions` sans règle) et
M9 (l'exemple ne porte pas la sortie). À noter, sans que ce soit un défaut : `close-sprint.mjs:69`
réécrit `plan/<slug>/state.yaml` au milieu de la séquence, ce qui périme les plans d'opérations
approuvés — cas que le script détecte et explique longuement (l. 36-60).

### Commande `tizi-bug` — **tient**

Les quatre options citées par `entrypoints.yaml:119-122` (`--signaler`, `--trier`, `--ouverts`,
`--corrige-par`) sont exactement celles de l'en-tête de `defect.mjs:10-15`. Les cinq classements
(`CLASSES`, l. 23) et les trois sévérités (l. 24) correspondent au texte de l'entrée et de
`README.md:107`. `defect.mjs` est livré identique dans `test-builder` et `plan-builder`
(`md5sum 57857fe59a726f50c1447237c81ce474`), ce que `fast-lane.md:29` annonce explicitement (« la voie
rapide n'exige pas que `test-builder` soit installé »). `find-expectations.mjs` et `import-defects.mjs`
existent. La story corrective en voie rapide est bien rattachée à l'épopée de l'exigence des deux côtés
(`entrypoints.yaml:122`, `fast-lane.md:27`). Réserve M8 sur le registre versionné unique.

### Commande `tizi-backlog` — **tient**

Les trois verrous annoncés sont présents et dans l'ordre déclaré : intégrité (`apply-operations.mjs:20`),
approbation avec décideur déclaré (l. 28-30), fraîcheur de l'état et de la table de correspondance et
cohérence de la destination (l. 38-69). `--dry-run` existe et n'envoie rien (l. 128-133). Les jetons sont
lus dans l'environnement et nulle part ailleurs (l. 104, 112-113). `sync-map.yaml` est sauvegardé après
chaque création (l. 139, 146), donc une interruption ne recrée pas en double. Les références symboliques
non résolues font échouer avant tout envoi (l. 127). Seule faiblesse : le niveau `partiel` ne protège de
rien aujourd'hui (M4).

### Commande `tizi-audit` — **cassé**

C'est le seul enchaînement que je tiens pour cassé, et la preuve est l'addition de trois absences. Le
corps de l'entrée ordonne à l'étape 3 de poser le document dans `audit/<slug>/state.yaml`
(`entrypoints.yaml:139`) ; les étapes 4 et 5 lisent ce fichier. Or le skill ne donne aucun outil
d'écriture (`SKILL.md:5` : `allowed-tools: Read Bash(node:*)`), aucun gabarit d'état (pas de
`templates/`), et aucun de ses douze scripts ne crée cet état. `tests/audit.test.mjs:38-43` fabrique
l'état par programme : le test prouve que `audit.mjs` lit un état, pas qu'un chemin de travail réel sait
en produire un. Un auditeur qui suit le point d'entrée s'arrête à l'étape 3. Voir B2.

### Hooks — **fragile**

Les trois hooks sont installés dans les quatre chemins (plugin Claude, plugin Copilot,
`.claude/settings.json`, `.github/hooks/tizi.json`) et tous sortent en 0 sauf le garde-fou TDD, qui sort
en 2 par `deny()` (`agent-io.mjs:90-95`). Les sorties précoces sont nombreuses et bien placées : pas de
`impl/config.yaml` → rien (`tdd-guard.mjs:31`) ; aucun chemin écrit détecté → rien (l. 28) ; aucune zone
d'ombre ouverte avec `ask_to` → sortie **avant** de lire la transcription (`question-guard.mjs:108`, avec
la mesure qui justifie cet ordre aux lignes 88-91) ; pas de transcription → rien
(`session-capture.mjs:27`) ; session sans rapport avec le SDLC et sans `.tizi/sessions/` → rien (l. 35) ;
`block.mjs` absent du skill → import dynamique rattrapé (`session-start.mjs:44`, avec le commentaire qui
raconte le défaut d'avant) ; rappel entièrement enveloppé dans un `try/catch`
(`session-start.mjs:23,51`) ; capture enveloppée de même, avec message sur la sortie d'erreur et sortie
en 0 (`session-capture.mjs:61-64`) ; écritures atomiques par `rename` (l. 18, `sessions.mjs:401-403`), et
les `.tmp` sont bien ignorés par le `.gitignore` posé.

Les fragilités sont celles déjà listées : C1 (un `cd` désactive le garde-fou en silence), C2 (verdicts
opposés entre les deux outils sur une entrée malformée), C8 (coût par tour, et `PreToolUse` sans matcher
côté Copilot), C7 (ce que la capture verse dans le dépôt), B3 (le garde-fou bloque les états de
spécification quand `paths.production` est vide). Je n'ai pas pu les éprouver avec des charges utiles
tordues : l'exécution de Node était refusée dans cet environnement.

---

## Ce qui ressort solide

À dire aussi, parce qu'un audit qui ne liste que des défauts donne une image fausse. Tous ces points
sont des faits vérifiés, pas des impressions.

- **Les fichiers partagés le sont vraiment.** `md5sum` sur `lib/common.mjs`, `lib/gates.mjs`,
  `lib/sessions.mjs`, `lib/agent-io.mjs`, `lib/rules.mjs`, `lib/checklists.mjs`, `lib/testing.mjs`,
  `vendor/js-yaml.mjs`, `references/questions.md` et `references/sessions.md` ne rend **qu'une empreinte
  par nom**, sur tous les skills qui portent le fichier. La seule divergence trouvée est une absence
  (C11), pas une dérive de contenu.
- **Le document généré des règles est à jour.** `documentation/regles-de-controle.md:5` annonce 137
  règles de structure `S00`–`S136` et 8 règles de rédaction `L01`–`L08` ; `grep -oE "rule: '[A-Z][0-9]+'"`
  sur `lib/rules.mjs` rend exactement `S00`…`S136`, et `L01`…`L08` pour les règles de rédaction. Les
  règles les plus récentes (S133 à S136) y figurent avec leur énoncé et leur émetteur (l. 208, 388-389,
  518, 672-675). `grep -oE "[CR][0-9]+"` rend `C1`–`C10` et `R1`–`R10`, soit les « dix conditions » de
  chaque porte annoncées ligne 5. Les « cinq documents à phases » correspondent aux cinq clés de `PHASES`
  (`lib/common.mjs:159-163` : brd, prd, sad, plan, test). Je n'ai pas pu lancer `--verifier`, mais aucun
  écart n'apparaît à la lecture, et l'arbre est propre.
- **Les douze sous-agents sont cohérents sur les deux cibles** : `user-invocable: false` à la ligne 5 des
  12 fichiers de `agents/` et des 12 `.agent.md` correspondants de `com.github.copilot/agents/`, et « ne
  pas utiliser directement » présent une fois exactement dans chacun des 12 (`grep -c`). C'est ce que
  `README.md:128` annonce, et `tests/plugin.test.mjs:60-63` le vérifie.
- **Les scripts qui écrivent exigent bien une racine explicite**, comme `README.md:124` l'affirme :
  `adopt.mjs:15-16`, `sync-agent-instructions.mjs:18-19`, `constitution.mjs:122-123` et
  `ci-audit.mjs:18-19` sortent tous en code 2 avec leur usage. `rootArg` (`lib/common.mjs:92-98`) refuse
  en plus un chemin de fichier là où une racine est attendue. La seule faille est le parsing
  d'`adopt.mjs` (C6), pas le principe.
- **La signature de la constitution est bien ancrée hors du dépôt.** `constitution.mjs:58-67` ne lit la
  clé publique que dans `TIZI_CONSTITUTION_PUBKEY` ou `…_FILE`, jamais dans le dépôt, et la surface
  signée est exactement la surface exécutable (l. 47-56 : identifiant et commande des principes actifs à
  contrôle automatique, triés — récrire un énoncé ne casse pas la signature, ajouter une commande si).
  Les cinq états (`valide`, `sans-cle`, `absente`, `invalide`, `rien-a-faire`) sont documentés et
  distingués, et le refus est **dit** au lieu d'être affirmé (`pr-gate.mjs:84-86` : C10 passe en échec
  avec sa raison). Le trou n'est pas là : il est sur les commandes de suites, non signées (C4).
- **`INCERTITUDES.md` fait ce qu'il annonce.** Les huit entrées sont précises, chacune avec « si c'est
  faux » et « comment lever », et la section « Ce que ce fichier n'autorise pas » (l. 122-127) interdit
  explicitement d'y ranger ce qu'on préfère ne pas vérifier. Trois des constats que j'aurais sinon écrits
  y figurent déjà : format des événements Copilot, portée réelle de `user-invocable` sous Copilot,
  reporter JUnit sur Node 18. C'est le document qui m'a le plus aidé à ne pas confondre une affirmation
  vérifiée et une affirmation plausible.
- **La CI vérifie l'installateur pour de vrai.** `.github/workflows/tests.yml` a un job `installation`
  qui installe dans un dépôt neuf, vérifie l'idempotence par `git status --porcelain`, charge chaque
  workflow généré avec le `js-yaml` du dépôt, et lance `ci-audit.mjs`. La matrice de tests couvre Node
  18, 20, 22 et 24, et les actions sont épinglées sur un SHA.

---

## Ce qui reste à vérifier par exécution

À reprendre sur une machine où Node peut tourner, en travaillant sur une copie et jamais sur l'original :

1. `npm test` — la suite entière, pour confirmer que l'arbre commité passe.
2. `node doc-regles.mjs --verifier` — fermer la question de la dérive du document généré.
3. `node install.mjs --project <tmp> --target claude --skills audit-builder`, puis relever chaque chemin
   `.claude/skills/.../*.mjs` cité dans `<tmp>/.claude/commands/tizi.md` et tester son existence : c'est
   la démonstration directe de B1.
4. Le garde-fou TDD avec des entrées tordues, sur une copie de `exemple/repo` : une charge utile
   `{"tool_name":"Write","tool_input":{"file_path":"src/x.js"},"cwd":"<sous-répertoire>"}` pour C1, puis
   la même avec `.impl/current.json` tronqué et `impl/config.yaml` en YAML invalide, en relevant le
   **code de sortie** à chaque fois (C2). Et une charge utile visant `brd/demo/state.yaml` dans un dépôt
   dont `paths.production` est vide (B3).
5. `node adopt.mjs --inclure fixtures/app .` sur une copie, et regarder où `impl/config.yaml` a été
   écrit (C6).
6. Le coût des deux hooks de `Stop` sur une transcription de plusieurs dizaines de mégaoctets (C8), avec
   `/usr/bin/time -v`, pour chiffrer ce que chaque tour paie.
7. Le point d'entrée `tizi-audit` joué de bout en bout dans Claude Code sur un document étranger : c'est
   le seul moyen de clore B2, en constatant si `allowed-tools` est effectivement appliqué aux skills.
