# Audit indépendant — 23 octobre 2026

Audit mené en session neuve, sans avoir vu la construction de Tizi, à comparer au rapport mécanique
du 22 octobre (`rapport-2026-10-22-mecanique.md`) comme le prévoit `LANCER.md`.

Méthode : exécuter ce qui est censé s'exécuter, puis vérifier une à une les affirmations du `README`
et des skills, en reproduisant chaque constat. Tout ce qui suit a été observé, pas déduit. Les
constats marqués **corrigé** l'ont été dans la branche `audit/correctifs-2026-10-23`.

## Constats

| # | Gravité | Constat | Preuve | État |
|---|---|---|---|---|
| 1 | **Bloquant** | La suite de tests échouait sur **tout clone neuf, donc en CI** : 112 tests sur 124. `exemple/repo/.gitignore` ignorait `reports/` et `.impl/`, qui sont des **données de test** du dépôt Tizi et non l'état local d'un vrai dépôt. Les rapports de CI et le journal TDD de l'exemple n'étaient jamais commités : ils n'existaient que dans l'arbre de travail de leur auteur. Le `.gitignore` racine affirmait l'inverse (« les dossiers `.impl/` et `.tizi/` de `exemple/` restent versionnés »). | `git check-ignore -v exemple/repo/reports/unit.xml` → `exemple/repo/.gitignore:2:reports/` ; `git ls-files exemple/repo/reports` vide ; clone neuf + `npm test` → 12 échecs | **corrigé** |
| 2 | **Bloquant** | `npm test` échouait dans l'arbre de travail de l'auteur (1 test sur 124), et ne pouvait passer qu'après un clone. `freeze-version.mjs:144` met les versions figées en `0o444` ; git ne porte pas ce mode ; `tests/helpers.mjs` copiait l'exemple avec `cpSync`, qui **préserve** les modes. La consigne « à lancer après toute modification d'un fichier commun » était donc inapplicable là où elle compte. Corollaire : la lecture seule des versions figées ne survit pas à un clone — l'intégrité ne peut reposer que sur les empreintes. | `EACCES … /repo/plan/demo/versions/v1.0/state.yaml` ; `git ls-files -s` : tous les modes à `100644` | **corrigé** |
| 3 | **Bloquant** | Le test d'adoption exigeait l'existence de `tests/fixtures/depot-existant/web/app/api/`, **dossier vide** que git ne peut pas versionner : il n'existait sur aucune autre machine. La fixture ne contenait que 6 fichiers depuis son premier commit. | `adopt.mjs:49` teste l'existence du dossier ; `git log --name-status -- tests/fixtures/depot-existant/` → 6 fichiers ajoutés, jamais `web/app/` | **corrigé** |
| 4 | **Bloquant** | Les 8 constats du rapport mécanique du 22 octobre étaient **tous ouverts** : ce rapport est le dernier commit du dépôt, rien n'a été corrigé après. Dont le bloquant nº 1 : dès que `impl/config.yaml` existe, le garde-fou TDD refuse toute écriture hors tâche, ce qui interdit le chemin « hors Tizi » et les correctifs d'urgence que le choix du chemin autorise. | `git log e585d3c..HEAD` vide ; `tdd-guard.mjs:48` | **corrigé** (nº 1 ; les nº 2, 3, 5, 6, 7, 8 restent ouverts) |
| 5 | **Bloquant** | « Une charge altérée ne passe pas » ne valait que pour l'état machine. Altérer le **document figé** — celui que les relecteurs lisent et que les décideurs approuvent — n'était pas détecté : `verify-handoff` répondait « Handoff intègre ». Seul `state.yaml` était scellé. Sur un projet qui se revendique de l'exigence « dispositif médical », c'est l'artefact dont l'intégrité compte le plus. | altération de `exemple/brd/demo/versions/v1.0/brd.md` → `Handoff intègre` ; altération de `state.yaml` → détectée | **corrigé** |
| 6 | **Bloquant** | La vérification d'intégrité se désarmait en silence. `verifyHandoff` (`lib/common.mjs`) ne contrôlait la version figée que `if (m && …)` : sans empreinte `source_state`, le contrôle était **sauté sans un mot**. Vider `source_state` puis recalculer le `.sha256` voisin — trois lignes, les deux fichiers étant en clair dans le dépôt — rendait invisible un état figé altéré. | `source_state: ''` + `.sha256` recalculé → `Handoff intègre` malgré l'état altéré | **corrigé** |
| 7 | À corriger | Des scripts **écrivaient et exécutaient** sur le dossier courant quand on les lançait **sans aucun argument** (défaut `?? '.'`). Lancer chaque script une fois pour voir s'il plantait a créé `AGENTS.md`, `CLAUDE.md`, `.tizi/`, `impl/`, `reports/`, `tizi-preuves/` dans le dépôt, puis exécuté `npx vitest` et `xcodebuild` via `spawnSync(cmd, {shell: true})` à partir du `impl/config.yaml` qu'`adopt.mjs` venait de générer. C'est un piège tendu aux agents : la première chose qu'un agent fait pour comprendre un script, c'est le lancer. | `git status` après le passage ; `tizi-preuves/tizi-ci-manifest.json` : 3 suites, exits 1, 1, 64 | **corrigé** |
| 8 | À corriger | La garantie « sous-agents internes non invocables » n'était posée que pour Copilot. `install.mjs` écrivait `user-invocable: false` dans la seule branche Copilot ; les 12 sous-agents arrivaient dans `.claude/agents/` sans marque, invocables, avec pour seule protection une phrase en prose. Plus gênant : `tests/entrypoints.test.mjs` ne contrôlait la marque **que sur la cible qui la portait** — le test couvrait exactement le côté qui marchait. | `install.mjs` (branche `copilot`) ; `.claude/agents/review-security.md` sans marque | **corrigé** |
| 9 | À corriger | Les références figées se réparaient toutes seules : `golden()` régénérait une référence absente et le test passait. Une référence supprimée ou renommée ne faisait plus échouer personne — le filet se recousait autour du trou. 4 références pour 124 tests. | suppression de `tests/golden/lint-brd.json` → 7 pass, 0 fail, fichier régénéré | **corrigé** |
| 10 | À corriger | L'installateur générait des workflows que son propre auditeur signalait aussitôt : 7 avertissements « action non épinglée » dès l'installation. Le générateur et le vérificateur n'étaient pas d'accord. | `ci-audit.mjs` sur une installation neuve : 7 avertissements sur `checkout@v4`, `setup-node@v4`, `upload-artifact@v4` | **corrigé** |
| 11 | À corriger | `adopt.mjs` ne distingue pas une fixture d'une application. Lancé sur Tizi, il a produit une carte de l'existant faite de ses **propres fixtures de test** (`CT-01`, `CT-02` sur `tests/fixtures/depot-existant/`). Aucune notion de `fixtures/`, `examples/`, `demo/`, `vendor/`. Dans tout monorepo, la carte sera fausse — et elle alimente la conception comme « existant à vérifier ». | `impl/config.yaml` généré : `elements: CT-01: [tests/fixtures/depot-existant/web/app/**]` | ouvert |
| 12 | À corriger | Tizi échoue son propre audit de CI : 2 points bloquants sur son propre dépôt (porte de PR non rejouée, preuves de release non produites). Pas de `.tizi/`, pas de BRD ni de PRD de Tizi par Tizi. Le SDLC n'est pas passé par lui-même. | `node skills/test-builder/scripts/ci-audit.mjs .` → `2 bloquant(s)` | ouvert |
| 13 | Mineur | `README` : la section `## lectures/` documentait un dossier absent du dépôt et jamais suivi par git. Le numéro de révision du document (« révision 98 ») n'est vérifiable nulle part : le document ne porte aucun numéro, et le dernier commit qui l'annonce dit « révision 85 ». La liste des « fichiers communs » omettait `due-reviews.mjs`, `session-start.mjs`, `lib/checklists.mjs` et présentait `lint.mjs` et `freeze-version.mjs` comme communs alors qu'ils n'existent que dans 4 skills sur 7. | `ls lectures` → absent ; en-tête du document : « Oct 19, 2026 » | **corrigé** |
| 14 | Mineur | Collision de noms d'agents : `cross-analyzer.md` existe dans `prd-builder` et `sad-builder`. Identiques aujourd'hui, donc sans conséquence — mais `install.mjs` les écrit tous deux dans `.claude/agents/` : s'ils divergent, le dernier dans l'ordre alphabétique gagne, en silence. Les scripts communs ont un test d'identité ; les agents dupliqués, non. | même `md5` aujourd'hui ; aucun test ne compare les agents homonymes | ouvert |
| 15 | Mineur | Invariant implicite non testé : le point d'entrée `tizi` (sans skill) fait tomber `{scripts}` sur `brd-builder`, sinon sur `skills[0]`. Cela marche parce que les 5 scripts communs qu'il appelle sont dans les 7 skills — règle vraie, non écrite, non vérifiée. Un script commun ajouté à 6 skills sur 7 casse `--skills <le septième>` sans qu'aucun test ne bronche. | `install.mjs`, `scriptsOf` | ouvert |
| 16 | Mineur | `engines: >=18`, matrice CI `18, 20, 22`, machine de développement en **26.3.0** : la version réellement utilisée n'était pas testée. Par ailleurs `adopt.mjs` propose `node --test --test-reporter=junit` pour les projets Node — **à vérifier**, mais ce reporter paraît postérieur à Node 18, auquel cas la configuration générée serait inexécutable sur la version minimale annoncée. | `package.json`, `.github/workflows/tests.yml`, `node --version` | matrice élargie à 24 ; reporter à vérifier |

## Une erreur de ce rapport, corrigée en cours de route

Après avoir compris le mécanisme du constat nº 2 (modes de fichiers non portés par git), j'ai conclu
que la CI serait « toujours verte », par raisonnement et sans l'éprouver. C'était faux, et dans le
mauvais sens : un clone neuf révèle **12 échecs** (constats nº 1 et nº 3). La suite ne passait
presque que dans l'arbre de travail de son auteur. Le raisonnement sur un mécanisme ne remplace pas
l'exécution — ce qui est précisément la thèse de Tizi.

## Niveau de preuve du dispositif

Mesuré au moment de l'audit, avant correctifs :

| | |
|---|---|
| Lignes de scripts | 16 918 |
| Lignes de documentation des skills | 4 339 |
| Lignes de tests | 967 (124 tests) |
| Codes de règles définis | 86 |
| Règles jamais exercées (tests + références figées) | **23** — `S01 S02 S03 S06 S10 S15 S21 S25 S26 S33 S34 S35 S37 S38 S39 S42 S46 S47 S49 S59 S62 S64 L04` |
| Cas d'eval | 3 |
| Résultats d'eval commités | **0** (`evals/results/` est ignoré) |
| Projets réels passés par la chaîne | **0** |

Soit 5,7 % de tests par rapport au code, et 27 % des règles jamais exercées — pour un outil qui
impose à ses utilisateurs BDD, TDD sous garde-fou, tests de mutation, matrice de couverture des
exigences et porte de release. C'est la même incohérence que les constats nº 4 et nº 12, vue de plus
haut : **le dispositif de vérification est conçu, pas éprouvé.**

L'unique démonstration de bout en bout est `exemple/`, un cas fictif qui contient « volontairement
des défauts pour déclencher les vérifications ». On y vérifie que les règles se déclenchent sur les
défauts qu'on y a placés pour qu'elles se déclenchent. Les deux bancs qui donneraient un signal
extérieur exigent un vrai agent, et aucune mesure n'est commitée.

## Ce qui tient

Vérifié, et solide :

- **L'installateur.** 369 fichiers, 7 skills, 10 points d'entrée, 3 workflows. Réellement idempotent
  (second passage : diff vide) et **non destructif** : un `.claude/settings.json` préexistant avec
  ses `env`, ses `permissions` et un hook `PreToolUse` personnel est intégralement préservé, le hook
  Tizi ajouté à côté ; `.gitignore` est complété, pas réécrit.
- **L'intégrité des handoffs sur l'état.** Altérer `state.yaml` dans une version figée est détecté.
  Et `planStateDigest`, qui exclut les approbations du digest pour qu'enregistrer une approbation ne
  l'invalide pas, est une bonne idée, correctement implémentée.
- **La cohérence des références.** Tous les scripts cités par la documentation d'un skill existent
  dans ce skill, à une exception connue (constat nº 4 du rapport mécanique). Aucun script ne plante à
  l'import. Les citations croisées entre skills sont correctement attribuées.
- **Aucun secret en dur** : uniquement des lectures de `process.env`.
- **Le déclenchement des skills** ne se chevauche pas : 0,17 au maximum (`prd ↔ sad`).

## Correctifs apportés

Branche `audit/correctifs-2026-10-23`. Suite de tests : **127 sur 127**, en local et dans un clone
neuf (contre 123/124 en local et 112/124 sur un clone avant).

1. **Données de test versionnées** (nº 1, nº 3). `exemple/repo/.gitignore` et
   `evals/fixtures/repo-tache/.gitignore` n'ignorent plus les données de test, et expliquent
   pourquoi. Les 8 fichiers masqués sont commités. La fixture d'adoption reçoit de vrais fichiers
   (`web/app/api/notifications/route.ts`, `web/app/page.tsx`) à la place d'un dossier vide. Un test
   garde la régression : aucune de ces données ne doit être ignorée ni absente.
2. **Suite exécutable dans l'arbre de travail** (nº 2). `tests/helpers.mjs` rend la copie de
   l'exemple modifiable après `cpSync`, les versions figées étant en lecture seule sur la machine où
   le gel a eu lieu.
3. **Dérogation au garde-fou TDD** (nº 4). `impl-builder/scripts/derogation.mjs` ouvre une fenêtre
   **nommée, motivée, datée et bornée** (une heure par défaut, huit au plus) pendant laquelle une
   écriture hors tâche est permise. Jamais déduite, non cumulable, elle expire seule ; la trace va
   dans `.tizi/derogations.jsonl`, versionné. Même forme que les dérogations de la constitution
   (`approved_by` + `reason`). Testée : refus sans, passage avec, refus après fermeture, refus après
   expiration.
4. **Le col scelle le document** (nº 5, nº 6). `writeHandoff` scelle désormais `source_doc`, empreinte
   du document figé, à côté de `source_state` ; le document est dérivé de l'état, donc aucun appelant
   ne change. Et l'absence d'empreinte est un **problème**, non une raison de sauter le contrôle :
   vider `source_state` ne désarme plus rien. Les 7 handoffs de l'exemple et des fixtures ont été
   régénérés, et les empreintes amont reportées là où elles étaient enregistrées. Testé dans les deux
   sens.
5. **Plus de défaut destructeur** (nº 7). `adopt.mjs`, `sync-agent-instructions.mjs`,
   `constitution.mjs` et `ci-audit.mjs` exigent une cible explicite : sans argument, usage et code 2
   au lieu d'écrire dans le dossier courant. `ci-run-suites.mjs` exige `--lancer` ou `--sans-lancer` :
   exécuter des commandes de shell venues d'un fichier du dépôt ne peut pas être un comportement par
   défaut. Le workflow généré déclare `--lancer`.
6. **Marque des sous-agents sur les deux cibles** (nº 8). `install.mjs` pose `user-invocable: false`
   côté Claude Code aussi, et le test la vérifie sur les deux cibles, mention « ne pas utiliser
   directement » comprise. Le `README` dit maintenant ce qui est réellement garanti où : Copilot
   exclut ces agents de la liste, Claude Code les affiche encore.
7. **Références figées et actions épinglées** (nº 9, nº 10). Une référence absente fait échouer le
   test au lieu d'être régénérée ; `UPDATE_GOLDEN=1` reste le seul moyen d'en créer une. Les trois
   actions GitHub sont épinglées sur leur commit, dans les workflows générés comme dans celui du
   dépôt.
8. **CI du dépôt** (nº 1, nº 16). Les tests tournent sur les pull requests vers `main` et sur `main`
   (plus de double passage sur les branches de travail), avec annulation du passage précédent quand un
   commit arrive. Matrice élargie à Node 24. Un second job installe Tizi pour de vrai dans un dépôt
   neuf, vérifie l'idempotence, valide le YAML des trois workflows générés et exige 0 point bloquant à
   l'audit de CI — rien ne vérifiait l'installateur en CI jusqu'ici.
9. **`README`** (nº 13). Section `lectures/` retirée, numéro de révision invérifiable remplacé par un
   renvoi à la date que porte le document, liste des fichiers communs corrigée, scellement du document
   et dérogation documentés.

## Ce qui reste ouvert

Par ordre de ce que je corrigerais ensuite :

- **Les 6 constats restants du rapport mécanique** (nº 2, 3, 5, 6, 7, 8), dont la capture de session
  qui réécrit à chaque tour des fichiers versionnés — conflits garantis en équipe — et `pr-gate.mjs`
  qui exécute en shell les commandes de la constitution.
- **`adopt.mjs` et les fixtures** (nº 11) : ignorer `fixtures/`, `examples/`, `demo/`, `vendor/`, ou
  au minimum les signaler comme incertains.
- **Faire passer Tizi par Tizi** (nº 12) : ce serait le premier cas réel, et cela réglerait l'audit de
  CI de son propre dépôt.
- **Commiter un résultat d'eval**, même mauvais, même sur 3 cas. Aujourd'hui le seul argument en
  faveur de la méthode est sa cohérence interne.
- **Les invariants implicites** (nº 14, nº 15) : un test d'identité sur les agents homonymes, un test
  d'installation partielle.
- **Les 23 règles jamais exercées**, et le reporter JUnit de Node 18 à vérifier (nº 16).
