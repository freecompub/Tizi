# Ce que chaque audit a trouvé que l'autre a manqué — 8 novembre 2026

`evals/audit/LANCER.md` demande de comparer l'audit indépendant au dernier audit mécanique. Voilà la
comparaison, plus une troisième colonne que ni l'un ni l'autre ne portait : **ce que l'exécution
confirme**.

- Audit mécanique : `rapport-2026-10-22-mecanique.md`, 8 constats, fait par scripts.
- Audit indépendant précédent : `rapport-2026-10-23-independant.md`.
- Audit indépendant du jour : `rapport-2026-11-08-independant.md`, **35 constats** (3 bloquants,
  16 à corriger, 16 mineurs), fait en contexte vierge. **30 pull requests** ont été fusionnées entre les
  deux passages.

## Les 8 constats mécaniques du 22 octobre, relus aujourd'hui

| # | Constat du 22 octobre | État au 8 novembre |
|---|---|---|
| 1 | **Bloquant** — dès qu'`impl/config.yaml` existe, le garde-fou refuse toute écriture de code hors d'une tâche | **Retourné, et aggravé** : le garde-fou refuse maintenant aussi quand `paths.production` est **vide**, et `adopt.mjs` laisse cette liste vide sur une pile non reconnue. C'est le bloquant **B3** du jour, et il gèle l'amont, pas le code |
| 2 | Une tâche fusionnée reste la tâche en cours et bloque tout | **Corrigé** : `record-pr.mjs:30-41` libère `.impl/current.json` et dit quoi faire ensuite |
| 3 | La capture de session réécrit des fichiers versionnés → conflits Git | **Partiellement** : l'index a été éclaté (c'est la doctrine de `lib/sessions.mjs:33-38`), mais **C7** montre que `*.extrait.md` et `*.index.yaml` restent versionnés et réécrits à chaque tour, avec les messages de l'utilisateur mot pour mot ; et **M8** trouve deux fichiers que la doctrine a oubliés (`.tizi/defauts/<initiative>.yaml`, `.tizi/derogations.jsonl`) |
| 4 | `defect.mjs --corrige-par` cité par la voie rapide, absent de `plan-builder` | **Corrigé** : le script est dans `plan-builder` et `test-builder`, et `fast-lane.md:29` dit pourquoi |
| 5 | La porte de PR exécute en shell les commandes de la constitution | **Toujours ouvert, et mieux cerné** : **C4** montre que la signature de la constitution ne couvre **pas** `impl/config.yaml`, d'où viennent les commandes de suites que `pr-gate.mjs:30` exécute en CI sur chaque PR. Le trou n'est pas la constitution — elle est bien ancrée hors dépôt — c'est la surface non signée à côté |
| 6 | État d'implémentation disparu : le garde-fou parle d'une compréhension non validée | Non revu par cet audit (il n'a pas pu exécuter) ; à reprendre avec le mécanique |
| 7 | La sprint review modifie l'état du plan et invalide un export approuvé | Non revu ; **M9** touche le même dossier par un autre bout (la sortie principale de la revue n'est pas dans `exemple/`) |
| 8 | `tizi-bug` jamais proposé par le point d'étape | **Corrigé** : `next-step.mjs` le propose |

Trois corrigés, un retourné contre l'amont, un toujours ouvert et désormais mieux localisé, trois à
reprendre par le mécanique.

## Ce que l'audit indépendant a trouvé et que personne n'avait

Les constats qui n'ont aucun équivalent dans le mécanique, parce qu'ils demandent de **lire** et de
confronter des textes entre eux :

- **B1** et **B2** : les deux bloquants portent sur `audit-builder`, le huitième skill, livré le
  7 novembre — donc après le dernier passage. `/tizi` installé avec lui seul pointe un `adopt.mjs`
  absent ; et le skill n'a aucun outil d'écriture alors que son protocole lui ordonne d'écrire un état.
- **C1** : le garde-fou s'ancre sur `h.cwd`, qu'un `cd` de l'agent déplace — le correctif existait déjà
  pour les sessions (`projectRoot()`) et n'avait pas été porté.
- **C6** : `adopt.mjs --inclure <chemin> .` prend `<chemin>` pour la racine et adopte le mauvais dossier.
- **C9, C10, C11, C13, C14, C15, M1, M5, M6** : la dérive documentaire, neuf constats. Liste des
  « fichiers communs » fausse sur six entrées, `templates/` annoncé partout et absent de deux skills,
  licence de `js-yaml` manquante dans `audit-builder`, renvoi mort vers `council.md` dans quatre skills,
  « sept skills / dix points d'entrée » encore écrit à trois endroits, proportion du dépôt inutile au
  plugin justifiée par un PDF qui n'est plus suivi.
- **C12** : `exemple/plan/demo` et `exemple/repo/plan/demo` sont **deux copies divergentes** du même
  plan, et ce sont les étapes 5 et 6 qui ont tourné contre celle de `repo/`. Un lecteur qui suit la
  première ne regarde pas le plan qui a servi.
- **C16** : `ingest-handoffs.mjs` exige les deux handoffs, ce qui rend la commande prescrite inutilisable
  sur les chemins `court` et `voie-rapide`, que `choose-path.mjs` produit lui-même.
- **M2** : le test qui garantit qu'« un script n'est livré que là où une phase dit de l'appeler » accepte
  en fait la mention du nom de fichier n'importe où, y compris dans une référence partagée qui parle
  d'un autre skill. Un test qui ne mord pas.
- **M4** : les niveaux d'autonomie `complet` et `partiel` sont indiscernables — la liste des actions
  destructives ne correspond à aucune action que l'exécuteur sait faire.

Et une **confirmation indépendante** qui tombe le même jour : **M7** relève qu'`audit-builder` n'a
aucune requête dans le banc de déclenchement. C'est exactement le trou que `fe986a8` vient de combler,
trouvé séparément et le même jour, par deux chemins qui ne se parlaient pas.

## Ce que l'exécution ajoute

L'auditeur a travaillé dans une session où **Node était refusé par les permissions**. Il l'a déclaré
d'emblée et a listé sept commandes à lancer pour clore ce qui restait ouvert. Elles ont été lancées :

| À vérifier | Résultat |
|---|---|
| `npm test` | 324 tests, 324 passent |
| `node doc-regles.mjs --verifier` | « est à jour » — aucune dérive du document généré |
| **B1** — installation partielle | Fait **sur les huit skills**, un par un : `audit-builder` est le seul à produire un `/tizi` dont un script cité (`adopt.mjs`) n'existe pas. Les sept autres sont complets |
| **B3** — `paths.production` vide | Charge utile réelle sur le hook : `deny` sur `brd/accueil/state.yaml`, `prd/…`, `plan/…` et `src/app.js`, code 2. Seul `impl/notes.md` passe (il est dans `always_allowed`). L'amont est gelé, comme annoncé |
| **C1** — ancrage sur `cwd` | Le **même** fichier du **même** dépôt : refusé depuis la racine (code 2), **laissé passer** depuis un sous-dossier (code 0). Un `cd` désactive le garde-fou en silence |
| **C2** — lectures non protégées | `.impl/current.json` tronqué → **code 1**. `impl/config.yaml` en YAML invalide → **code 1**. Or `lib/agent-io.mjs:87-89` documente que Claude Code ne bloque que sur 2 et que Copilot refuse sur toute sortie non nulle : le même fichier corrompu **ouvre** le garde-fou d'un côté et **gèle** le travail de l'autre. La promesse de verdicts identiques tombe |
| **C6** — racine mal détectée | `node adopt.mjs --inclure fixtures/app .` écrit `fixtures/app/impl/config.yaml` et `fixtures/app/.tizi/adoption.yaml`. Le dépôt passé en argument n'est pas celui qui est adopté |

Reste à exécuter, et ça demande autre chose qu'un terminal : le coût des deux hooks de `Stop` sur une
grosse transcription (**C8**), et `tizi-audit` joué de bout en bout dans Claude Code pour constater si
`allowed-tools` est réellement appliqué (**B2**).

## Ce que le mécanique voit et que l'indépendant ne peut pas voir

Les deux audits ne se remplacent pas, et cette passe l'a montré par l'absurde : l'auditeur n'a pas pu
exécuter une ligne de Node, donc **rien de ce qui demande une mesure** n'est dans son rapport — le coût
d'un hook par tour, le comportement sous entrée tordue, la durée d'une capture sur une grosse session.
C'est exactement ce que le mécanique chiffrait (constats 3, 6, 7 du 22 octobre, et les mesures de la
section « ce qui tient »). À l'inverse, aucune série de scripts n'aurait trouvé que deux copies du même
plan d'exemple divergent, ni qu'un test accepte la mention d'un nom de fichier pour une phase.

À retenir pour la prochaine fois : **lancer l'auditeur avec le droit d'exécuter Node sur une copie**,
comme son propre énoncé le prévoit (« tu peux lancer `npm test` et les scripts sur une copie du dossier
`exemple/` »), et rejouer le mécanique dans la même série.
