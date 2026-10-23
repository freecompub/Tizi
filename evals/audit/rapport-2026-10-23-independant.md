# Audit indépendant — 23 octobre 2026

Audit mené en session neuve, sans avoir vu la construction de Tizi, à comparer au rapport mécanique
du 22 octobre (`rapport-2026-10-22-mecanique.md`) comme le prévoit `LANCER.md`.

Méthode : exécuter ce qui est censé s'exécuter, puis vérifier une à une les affirmations du `README`
et des skills, en reproduisant chaque constat. Tout ce qui suit a été observé, pas déduit. Les
constats marqués **corrigé** l'ont été dans la branche `audit/correctifs-2026-10-23`.

## Constats

| # | Gravité | Constat | Preuve | État |
|---|---|---|---|---|
| 1 | **Bloquant** | La suite de tests échouait sur **tout clone neuf, donc en CI** : 12 tests en échec, 112 passants sur 124. `exemple/repo/.gitignore` ignorait `reports/` et `.impl/`, qui sont des **données de test** du dépôt Tizi et non l'état local d'un vrai dépôt. Les rapports de CI et le journal TDD de l'exemple n'étaient jamais commités : ils n'existaient que dans l'arbre de travail de leur auteur. Le `.gitignore` racine affirmait l'inverse (« les dossiers `.impl/` et `.tizi/` de `exemple/` restent versionnés »). | `git check-ignore -v exemple/repo/reports/unit.xml` → `exemple/repo/.gitignore:2:reports/` ; `git ls-files exemple/repo/reports` vide ; clone neuf + `npm test` → 12 échecs | **corrigé** |
| 2 | **Bloquant** | `npm test` échouait dans l'arbre de travail de l'auteur (1 test sur 124), et ne pouvait passer qu'après un clone. `freeze-version.mjs:144` met les versions figées en `0o444` ; git ne porte pas ce mode ; `tests/helpers.mjs` copiait l'exemple avec `cpSync`, qui **préserve** les modes. La consigne « à lancer après toute modification d'un fichier commun » était donc inapplicable là où elle compte. Corollaire : la lecture seule des versions figées ne survit pas à un clone — l'intégrité ne peut reposer que sur les empreintes. | `EACCES … /repo/plan/demo/versions/v1.0/state.yaml` ; `git ls-files -s` : tous les modes à `100644` | **corrigé** |
| 3 | **Bloquant** | Le test d'adoption exigeait l'existence de `tests/fixtures/depot-existant/web/app/api/`, **dossier vide** que git ne peut pas versionner : il n'existait sur aucune autre machine. La fixture ne contenait que 6 fichiers depuis son premier commit. | `adopt.mjs:49` teste l'existence du dossier ; `git log --name-status -- tests/fixtures/depot-existant/` → 6 fichiers ajoutés, jamais `web/app/` | **corrigé** |
| 4 | **Bloquant** | Les 8 constats du rapport mécanique du 22 octobre étaient **tous ouverts** : ce rapport est le dernier commit du dépôt, rien n'a été corrigé après. Dont le bloquant nº 1 : dès que `impl/config.yaml` existe, le garde-fou TDD refuse toute écriture hors tâche, ce qui interdit le chemin « hors Tizi » et les correctifs d'urgence que le choix du chemin autorise. | `git log e585d3c..HEAD` vide ; `tdd-guard.mjs:48` | **corrigé** (les 8) |
| 5 | **Bloquant** | « Une charge altérée ne passe pas » ne valait que pour l'état machine. Altérer le **document figé** — celui que les relecteurs lisent et que les décideurs approuvent — n'était pas détecté : `verify-handoff` répondait « Handoff intègre ». Seul `state.yaml` était scellé. Sur un projet qui se revendique de l'exigence « dispositif médical », c'est l'artefact dont l'intégrité compte le plus. | altération de `exemple/brd/demo/versions/v1.0/brd.md` → `Handoff intègre` ; altération de `state.yaml` → détectée | **corrigé** |
| 6 | **Bloquant** | La vérification d'intégrité se désarmait en silence. `verifyHandoff` (`lib/common.mjs`) ne contrôlait la version figée que `if (m && …)` : sans empreinte `source_state`, le contrôle était **sauté sans un mot**. Vider `source_state` puis recalculer le `.sha256` voisin — trois lignes, les deux fichiers étant en clair dans le dépôt — rendait invisible un état figé altéré. | `source_state: ''` + `.sha256` recalculé → `Handoff intègre` malgré l'état altéré | **corrigé** |
| 7 | À corriger | Des scripts **écrivaient et exécutaient** sur le dossier courant quand on les lançait **sans aucun argument** (défaut `?? '.'`). Lancer chaque script une fois pour voir s'il plantait a créé `AGENTS.md`, `CLAUDE.md`, `.tizi/`, `impl/`, `reports/`, `tizi-preuves/` dans le dépôt, puis exécuté `npx vitest` et `xcodebuild` via `spawnSync(cmd, {shell: true})` à partir du `impl/config.yaml` qu'`adopt.mjs` venait de générer. C'est un piège tendu aux agents : la première chose qu'un agent fait pour comprendre un script, c'est le lancer. | `git status` après le passage ; `tizi-preuves/tizi-ci-manifest.json` : 3 suites, exits 1, 1, 64 | **corrigé** |
| 8 | À corriger | La garantie « sous-agents internes non invocables » n'était posée que pour Copilot. `install.mjs` écrivait `user-invocable: false` dans la seule branche Copilot ; les 12 sous-agents arrivaient dans `.claude/agents/` sans marque, invocables, avec pour seule protection une phrase en prose. Plus gênant : `tests/entrypoints.test.mjs` ne contrôlait la marque **que sur la cible qui la portait** — le test couvrait exactement le côté qui marchait. | `install.mjs` (branche `copilot`) ; `.claude/agents/review-security.md` sans marque | **corrigé** |
| 9 | À corriger | Les références figées se réparaient toutes seules : `golden()` régénérait une référence absente et le test passait. Une référence supprimée ou renommée ne faisait plus échouer personne — le filet se recousait autour du trou. 4 références pour 124 tests. | suppression de `tests/golden/lint-brd.json` → 7 pass, 0 fail, fichier régénéré | **corrigé** |
| 10 | À corriger | L'installateur générait des workflows que son propre auditeur signalait aussitôt : 7 avertissements « action non épinglée » dès l'installation. Le générateur et le vérificateur n'étaient pas d'accord. | `ci-audit.mjs` sur une installation neuve : 7 avertissements sur `checkout@v4`, `setup-node@v4`, `upload-artifact@v4` | **corrigé** |
| 11 | À corriger | `adopt.mjs` ne distingue pas une fixture d'une application. Lancé sur Tizi, il a produit une carte de l'existant faite de ses **propres fixtures de test** (`CT-01`, `CT-02` sur `tests/fixtures/depot-existant/`). Aucune notion de `fixtures/`, `examples/`, `demo/`, `vendor/`. Dans tout monorepo, la carte sera fausse — et elle alimente la conception comme « existant à vérifier ». | `impl/config.yaml` généré : `elements: CT-01: [tests/fixtures/depot-existant/web/app/**]` | **corrigé** |
| 12 | À corriger | Tizi échoue son propre audit de CI : 2 points bloquants sur son propre dépôt (porte de PR non rejouée, preuves de release non produites). Pas de `.tizi/`, pas de BRD ni de PRD de Tizi par Tizi. Le SDLC n'est pas passé par lui-même. | `node skills/test-builder/scripts/ci-audit.mjs .` → `2 bloquant(s)` | ouvert |
| 13 | Mineur | `README` : la section `## lectures/` documentait un dossier absent du dépôt et jamais suivi par git. Le numéro de révision du document (« révision 98 ») n'est vérifiable nulle part : le document ne porte aucun numéro, et le dernier commit qui l'annonce dit « révision 85 ». La liste des « fichiers communs » omettait `due-reviews.mjs`, `session-start.mjs`, `lib/checklists.mjs` et présentait `lint.mjs` et `freeze-version.mjs` comme communs alors qu'ils n'existent que dans 4 skills sur 7. | `ls lectures` → absent ; en-tête du document : « Oct 19, 2026 » | **corrigé** |
| 14 | Mineur | Collision de noms d'agents : `cross-analyzer.md` existe dans `prd-builder` et `sad-builder`. Identiques aujourd'hui, donc sans conséquence — mais `install.mjs` les écrit tous deux dans `.claude/agents/` : s'ils divergent, le dernier dans l'ordre alphabétique gagne, en silence. Les scripts communs ont un test d'identité ; les agents dupliqués, non. | même `md5` aujourd'hui ; aucun test ne comparait les agents homonymes | **corrigé** |
| 15 | Mineur | Invariant implicite non testé : le point d'entrée `tizi` (sans skill) fait tomber `{scripts}` sur `brd-builder`, sinon sur `skills[0]`. Cela marche parce que les 5 scripts communs qu'il appelle sont dans les 7 skills — règle vraie, non écrite, non vérifiée. Un script commun ajouté à 6 skills sur 7 casse `--skills <le septième>` sans qu'aucun test ne bronche. | `install.mjs`, `scriptsOf` | partiellement : l'identité des homonymes est désormais testée par défaut ; l'installation partielle ne l'est pas |
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

## Correctifs de la seconde série

Branche `audit/correctifs-22-oct-2a4`, empilée sur la première. Suite : **133 sur 133**.

10. **Une tâche fusionnée libère la tâche en cours** (nº 2 du 22 octobre). `record-pr.mjs --fusionnee`
    supprime `.impl/current.json` quand il désigne cette tâche — et seulement celle-là. Le garde-fou
    ne parle plus du statut `fusionnee` sans dire quoi faire : il renvoie à `start-task.mjs`.
11. **Index des sessions éclaté par session** (nº 3). `index.yaml` était un fichier unique, versionné,
    réécrit à chaque tour par chaque développeur : conflit Git garanti dès que deux personnes
    travaillaient le même jour, sur un fichier que personne ne modifie à la main. Chaque session écrit
    désormais sa seule entrée dans `<date>-<id>.index.yaml` ; `loadIndex` lit l'ensemble du dossier et
    continue de lire un `index.yaml` historique, qu'il ne réécrit plus. Aucun lecteur n'a changé : ils
    passent tous par `loadIndex` et `sessionsFor`.
12. **`defect.mjs` dans `plan-builder`** (nº 4). La voie rapide prescrivait un script absent du skill.
    Il y est copié, ajouté aux fichiers communs, et la référence précise son chemin.
13. **Messages du garde-fou rendus exacts** (nº 6). Un état d'implémentation disparu, ou une tâche
    absente de l'état, sont signalés comme tels au lieu d'être présentés comme une compréhension non
    validée.
14. **Invariant par défaut sur les homonymes** (nº 14, nº 15). La liste des fichiers communs était
    tenue à la main : un fichier dupliqué qu'on oubliait d'y inscrire n'était plus comparé. Deux tests
    vérifient maintenant la règle par défaut — tout script et tout sous-agent portant le même nom dans
    deux skills est identique, sauf `build-handoff.mjs` et `review-pack.mjs`, propres au document par
    construction. Cela couvre la collision `cross-analyzer` que l'installation écraserait en silence.

## Correctifs de la troisième série

Branche `audit/constat-7-session-start-adopt`. Suite : **135 sur 135**.

15. **Un export approuvé périmé par la sprint review** (nº 7 du 22 octobre). `close-sprint.mjs`
    prévient **avant** d'écrire l'état, en nommant l'export, son approbateur et sa date, et en
    rappelant qu'il faut relancer `plan-operations.mjs` puis faire réapprouver. Et le refus de
    l'exécuteur nomme désormais sa cause probable : « une sprint review a été enregistrée depuis :
    IT-1 le … ». L'empreinte est comparée à celle d'**avant** la mutation — la calculer après ne
    correspondait jamais à rien, ce qu'un essai de bout en bout a montré.
16. **Le hook de début de session rappelle la dernière session sans condensé** (nº 11 de ce rapport,
    trouvé en détaillant l'usage de l'index). Le rappel n'existait que dans `status.mjs` et `/tizi` :
    il dépendait de l'obéissance de l'agent, alors que le début de session est le moment même d'une
    reprise. Le hook ne bloque toujours jamais (entrée vide, JSON invalide, dossier absent : code 0).
17. **`adopt.mjs` n'adopte plus ses fixtures** (nº 11 des constats). Un manifeste de projet situé sous
    `fixtures/`, `examples/`, `testdata/`, `samples/` — ou sous l'arborescence de tests — est écarté de
    la carte et **signalé comme incertain**, avec le chemin exact et `--inclure <chemin>` pour le
    réintégrer. Jamais ignoré en silence : un vrai composant peut vivre dans un dossier ainsi nommé.
    `demo/` et `templates/` sont volontairement absents de la liste, trop ambigus (dans une
    application web, `templates/` est du code de production).

## Correctif du dernier constat de sécurité

Branche `audit/constat-5-signature-constitution`. Suite : **134 sur 134**.

18. **Les contrôles de la constitution ne s'exécutent plus sans signature** (nº 5 du 22 octobre, le
    dernier). Ces contrôles sont des commandes de shell lues dans `.tizi/constitution.yaml` et lancées
    par `pr-gate.mjs` et `constitution.mjs --controler`, **localement et en CI sur chaque pull
    request** : une contribution qui modifiait ce fichier modifiait ce qui s'exécute.

    Une empreinte approuvée — le réflexe du reste de Tizi — n'y suffisait pas : qui modifie le fichier
    recalcule l'empreinte dans le même commit. Il fallait une signature asymétrique (Ed25519, via
    `node:crypto`, sans dépendance), et surtout une **ancre de confiance hors du dépôt** : sinon la
    même contribution remplacerait la clé publique et se signerait elle-même. La clé publique se
    déclare donc par l'environnement (`TIZI_CONSTITUTION_PUBKEY`), variable du dépôt en CI, profil du
    développeur en local — une pull request ne peut pas les changer. `install.mjs --ci` passe la
    variable au workflow de porte de PR.

    Trois décisions de conception :
    - la signature ne couvre que la **surface exécutable** — identifiant et commande des principes
      actifs à contrôle automatique, triés. Récrire un énoncé ou ajouter une dérogation ne la casse
      pas ; ajouter, modifier ou activer une commande, si. On signe le risque, pas la prose ;
    - **fail closed** : sans signature valide, rien n'est exécuté, et la porte **refuse C10** au lieu
      de l'affirmer. Un dépôt sans principe à contrôle automatique n'est pas concerné (`rien-a-faire`) ;
    - l'échappatoire existe (`TIZI_CONSTITUTION_EXEC_SANS_SIGNATURE=1`) mais elle est, elle aussi, hors
      du dépôt : une pull request ne peut pas se l'accorder.

    `--generer-cle` **refuse** d'écrire la clé privée dans le dépôt : versionnée, elle ne protégerait
    plus rien. Sept cas sont testés, dont la resignature par une autre clé, qui ne vaut rien.

## Quatrième série : les deux derniers manques de forme

Branche `audit/next-step-bug-et-plugin`. Suite : **150 sur 150**.

19. **Les dix points d'entrée sont joignables** (nº 8 du 22 octobre, la part qui restait).
    `next-step.mjs` lit le registre des défauts : un signalement non trié devient un point à noter et
    fait proposer `tizi-bug`, en passant devant la sprint review — trier ferme la porte de release et
    prend quelques minutes, là où une revue est une réunion à organiser. Un second test vérifie
    qu'aucun point d'entrée n'est injoignable, pour que le manque ne revienne pas.

20. **L'installation partielle est testée** (nº 15). Sept cas, un par skill : `--skills <un seul>`
    pose bien ce skill seul, ne pose aucun point d'entrée dont le skill manque, pose toujours le point
    d'étape — et surtout, **tout script cité par une commande posée existe**. C'est l'invariant que le
    repli de `{scripts}` sur `brd-builder`, sinon sur le premier skill installé, suppose sans le dire.

## Le dépôt est aussi un marketplace, pour les deux outils

Le dépôt porte `.claude-plugin/marketplace.json`, et sa racine est la racine du plugin `tizi`.
Le point qui rend la chose possible : **Claude Code et Copilot CLI acceptent tous deux**
`.claude-plugin/marketplace.json` et `.claude-plugin/plugin.json`. Un seul manifeste sert les deux.

```
claude  plugin marketplace add freecompub/Tizi  &&  claude  plugin install tizi@tizi
copilot plugin marketplace add freecompub/Tizi  &&  copilot plugin install tizi@tizi
```

Ce qui est partagé l'est vraiment : `skills/` est le gros du contenu, et les deux outils le scannent au
même endroit. L'espace de noms `com.github.copilot/` (format Agent Plugins 1.0) ne porte que ce qui
diffère réellement — la forme d'un point d'entrée (une commande côté Claude Code, un agent côté
Copilot) et la variable qui donne la racine du plugin (`${CLAUDE_PLUGIN_ROOT}` contre `${PLUGIN_ROOT}`).

Quatre choix, vérifiés avec l'outil plutôt que déduits de la documentation :

- **la racine du dépôt est la racine du plugin**, parce que `skills/` y est déjà à l'emplacement scanné
  par défaut. Un plugin dans un sous-dossier aurait exigé de recopier les 318 fichiers de skills, ou de
  sortir de la racine du plugin — ce que la validation refuse ;
- **les artefacts sont générés, pas écrits à la main** : `commands/`, `agents/`, `hooks/hooks.json`,
  `com.github.copilot/` et `.claude-plugin/plugin.json` viennent de
  `node install.mjs --project . --target plugin`, donc de la même source unique que les deux autres
  cibles. Ils sont commités pour qu'un clone suffise, et un test vérifie qu'ils n'ont pas dérivé ;
- **le manifeste ne déclare aucun composant.** Déclarer `commands`, `agents` ou `hooks` remplace le
  scan par défaut, et une liste de fichiers sous la clé `agents` n'a **pas** chargé les sous-agents :
  `claude plugin details tizi` affichait « Agents (0) ». Sans la clé, « Agents (12) ». Moins le
  manifeste déclare, moins il peut mentir ;
- **le `$schema` est celui d'Agent Plugins 1.1.0**, le seul que Copilot accepte pour ce format — et
  Claude Code ignore le champ au chargement, ce qui a été revérifié après le changement.

**Ce qui est vérifié, et ce qui ne l'est pas.** Côté Claude Code, de bout en bout :
`claude plugin validate . --strict` passe, et une installation réelle charge 17 skills (7 skills + 10
points d'entrée), 12 agents et 5 hooks ; l'installation d'essai a été retirée. Côté Copilot, le CLI
n'est pas disponible sur cette machine : l'arborescence suit la documentation Agent Plugins 1.0 et est
vérifiée par des tests de structure, mais **aucune installation réelle ne l'a confirmée**. C'est le
seul endroit de cet audit où je livre sur la documentation plutôt que sur une exécution.

## Ce qui reste ouvert

Par ordre de ce que je corrigerais ensuite :

- **Faire passer Tizi par Tizi** (nº 12) : ce serait le premier cas réel, et cela réglerait l'audit de
  CI de son propre dépôt. C'est ce qui reste de plus important.
- **Commiter un résultat d'eval**, même mauvais, même sur 3 cas. Aujourd'hui le seul argument en
  faveur de la méthode est sa cohérence interne — et cet audit a montré que la cohérence interne,
  seule, laissait douze tests en échec en CI sans que personne le voie.
- **Les 23 règles jamais exercées**, et le reporter JUnit de Node 18 à vérifier (nº 16).
