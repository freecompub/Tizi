# Phase Define

**But** : faire converger la matière de Discover vers un BRD structuré — objectifs mesurables, exigences métier `BR-xxx` reliées à leurs sources, critères d'acceptation, priorités, processus cible, hypothèses et risques.

Discover explorait ; Define structure et fait décider. Tu poses moins de questions ouvertes et soumets davantage de **propositions à valider**.

---

## Règles de la phase

- **`state.yaml` est la source de vérité.** Tu écris toujours dans l'état, jamais directement dans `brd.md`. Le document est généré par `scripts/render-brd.mjs` (voir « Générer le BRD »).
- **Proposer, puis faire valider.** Tout élément créé a le statut `proposé`. Il passe à `validé` uniquement quand l'utilisateur l'accepte explicitement. Tu ne valides jamais toi-même.
- **Petits lots.** Soumets 3 à 5 éléments à la fois, regroupés de façon logique (par objectif, par exemple).
- **Rien ne disparaît en silence.** Un besoin candidat non retenu reçoit le statut `abandonné` ou `hors_périmètre` avec une raison (`reason`).
- **Vérification avant présentation.** Avant de soumettre un lot, lance `node <chemin-du-skill>/scripts/lint.mjs brd/<slug>/state.yaml --id <identifiants du lot>`. Corrige toi-même ce qui relève de la forme, puis présente chaque élément avec les avertissements restants. Si l'utilisateur valide malgré un avertissement, enregistre-le dans `lint_waivers` avec sa raison : la dérogation reste visible pour le contrôle formel. Les avertissements ne bloquent jamais ; ils évitent de découvrir en revue un flou qui coûterait un retour vers les parties prenantes.
- **Traçabilité systématique.** Chaque exigence cite ses objectifs (`objectives`) et ses besoins candidats (`from_needs`). Ne rédige pas d'exigence sans au moins un besoin candidat ; si l'utilisateur en introduit une nouvelle, enregistre d'abord sa source (`SRC-xxx`, type `autre` si c'est une décision de l'utilisateur) et le besoin candidat correspondant.

## Démarrage

1. Vérifie que `phase: define` dans `state.yaml`.
2. Fais un point d'entrée court : nombre de besoins candidats confirmés, zones d'ombre assumées, hypothèses ouvertes.
3. Propose de suivre l'ordre des étapes ci-dessous. L'utilisateur peut en changer ; respecte seulement les dépendances (pas d'exigences sans objectifs validés, pas de priorisation sans exigences).

---

## Étape 1. Objectifs métier (`OBJ-xx`)

1. À partir du problème, des signaux de succès et des besoins candidats, propose une **impact map** :
   - **Pourquoi** : l'objectif métier ;
   - **Qui** : les acteurs dont le comportement doit changer (parties prenantes `SH-xx` ou rôles) ;
   - **Comment** : le changement de comportement attendu ;
   - **Quoi** : les exigences (remplies à l'étape 2).
2. Pour chaque objectif, propose : un énoncé orienté résultat, un indicateur, une valeur actuelle, une cible, une échéance et un responsable.
3. Si la valeur actuelle ou la cible est inconnue, ne l'invente pas : crée une zone d'ombre `succes_non_mesurable` et propose soit un retour en Discover, soit de l'assumer.
4. Limite-toi à 2 à 5 objectifs. Au-delà, demande si l'initiative ne devrait pas être découpée.

**Sortie** : `objectives` et `impact_map` validés, section `objectives` de `brd_sections` à `validé` quand l'utilisateur l'accepte.

---

## Étape 2. Exigences métier (`BR-xxx`)

1. Regroupe les besoins candidats `confirmé` qui expriment le même besoin.
2. Pour chaque groupe, rédige une exigence selon ces règles :
   - **une exigence = un besoin** ; si tu écris « et », vérifie s'il faut la scinder ;
   - formulée côté métier : « Le service doit pouvoir… », « L'organisation doit garantir que… » ;
   - **neutre vis-à-vis de la solution** : aucun écran, technologie, outil ou architecture ;
   - compréhensible par le sponsor sans explication.
3. Relie-la à ses objectifs et à ses besoins candidats ; passe ces derniers au statut `intégré`.
4. Complète `impact_map[].requirements`.
5. Présente chaque exigence sous cette forme, puis demande validation :

   ```
   BR-004 (proposé) — Le service doit pouvoir identifier les dossiers
   incomplets avant leur transmission.
   • Objectif : OBJ-02
   • Sources : BC-007 (SRC-002 l.31), BC-011 (SRC-004 14:20)
   • Règles : RG-003
   ⚠ [L05] « tous » : une généralisation cache souvent des exceptions
   → Valider, modifier ou rejeter ?
   ```

6. **Signale les incohérences de couverture sous forme de questions**, pas de verdict :
   - un objectif sans exigence : « l'objectif est-il atteignable sans exigence, ou en manque-t-il une ? » ;
   - une exigence sans objectif : « objectif manquant, ou exigence hors sujet ? » ;
   - un besoin candidat `confirmé` ni intégré ni écarté.

---

## Étape 2 bis. Règles métier (`RG-xxx`)

Une règle métier n'est pas une exigence : c'est une directive que le métier contrôle (une loi, une procédure, une pratique) et que les exigences devront respecter. On la tient dans un référentiel séparé pour pouvoir la retrouver, la tracer et la faire évoluer sans réécrire les exigences.

1. Reprends les `RG` proposées en Discover. Fusionne les doublons ; une règle n'est énoncée qu'une fois.
2. Pour chacune, fais préciser :
   - le **type** : `definition` (un fait, un calcul, une inférence ; elle ne peut pas être violée, seulement mal appliquée) ou `comportement` (une obligation ou une interdiction ; elle peut être violée) ;
   - pour une règle de comportement, le **niveau d'application** : `stricte`, `derogation_autorisee` (par un acteur habilité), `derogation_justifiee` (avec une raison), `indicative` (simple ligne directrice) ;
   - le **responsable métier** (`owner`) qui peut la faire évoluer ;
   - sa **raison d'être** (`rationale`). Si personne ne la connaît, demande si la règle est toujours valable : un changement est l'occasion de remettre en cause une règle devenue obsolète.
3. Rédige-la de façon atomique et déclarative, avec le vocabulaire du glossaire, sans décrire ni le processus ni le moyen de la faire respecter. Une exception est une règle à part, référencée dans `exceptions`.
4. Relie chaque exigence aux règles qu'elle fait respecter (`business_rules`). Signale sous forme de question une règle de comportement reliée à aucune exigence : la règle est-elle hors périmètre, ou manque-t-il une exigence ?
5. Une règle réglementaire n'est pas négociable : en cas de conflit avec un besoin, ouvre une contradiction `reglementaire`.

Le choix des règles à automatiser ne se fait pas ici : il revient au PRD.

---

## Étape 2 ter. Exigences de transition (`TR-xx`)

Une solution ne sert que si l'organisation passe effectivement de l'existant à la cible. Le BABOK en fait une catégorie à part : des exigences **temporaires**, qui disparaissent une fois la transition faite. Pour chaque processus modifié et chaque groupe touché, demande :

- **formation** : qui doit apprendre quoi, dans quelles conditions (temps, lieu, horaires décalés) ;
- **conduite du changement** : qui perd quelque chose, qui résistera, qui doit porter le changement ;
- **reprise de données** : quelles données de l'existant doivent être reprises, nettoyées ou archivées ;
- **coexistence** : l'ancien et le nouveau fonctionnent-ils ensemble un temps, et comment ;
- **communication** : qui doit être prévenu, quand ;
- **support** : qui aide au démarrage, et comment on remonte les problèmes.

Chaque exigence de transition a un type, les parties prenantes concernées et un **critère d'achèvement** observable (« 90 % des agents d'accueil formés avant la bascule »). Elle passe au PRD, qui la rattache à une release, puis au plan, qui la planifie.

---

## Étape 3. Critères d'acceptation métier

Pour chaque exigence validée, propose 1 à 3 critères **observables côté métier** : comment le sponsor saura-t-il que l'exigence est satisfaite ?

- Bon : « Moins de 2 % des dossiers transmis sont rejetés pour incomplétude. »
- À éviter : « Le bouton Vérifier affiche une alerte rouge. » (solution) ; « Le système est rapide. » (non observable).

Un critère peut renvoyer à l'indicateur d'un objectif. Le format Given / When / Then est autorisé s'il aide, sans descendre au niveau technique.

---

## Étape 4. Priorisation (MoSCoW)

1. Propose une priorité pour chaque exigence — `must`, `should`, `could`, `wont` — avec une justification d'une phrase (`rationale`), fondée sur : les objectifs servis, le nombre de sources convergentes, les contraintes et l'échéance.
2. Fais arbitrer par le décideur du domaine `priorites` dans `decision_rights` ; c'est l'utilisateur qui te rapporte sa décision. Si deux parties prenantes revendiquent des priorités incompatibles, ouvre une contradiction `interets` et suis la capacité 9 de Discover.
3. Signale si plus de 60 % des exigences sont `must` : la priorisation n'aide alors plus à décider. Propose de revoir les cas limites.
4. Une exigence `wont` reste dans le BRD : elle documente ce qui est explicitement écarté pour cette fois.

---

## Étape 5. Processus cible

1. Pars de `current_process` (reconstitué en Discover). S'il est vide, propose de le reconstituer avec l'utilisateur avant d'aller plus loin.
2. Propose le processus cible comme une suite d'événements métier au passé, chacun marqué `nouveau`, `modifié`, `inchangé` ou `supprimé`, avec son acteur.
3. Vérifie que chaque exigence `must` se retrouve dans au moins un événement du processus cible ; signale sinon.
4. Liste les impacts organisationnels : rôles qui changent, compétences ou formations nécessaires, charge de travail déplacée.

---

## Étape 6. Consolidation

1. **Hypothèses** : passe en revue les `H-xxx` ; demande lesquelles sont confirmées, infirmées ou restent à vérifier.
2. **Risques (`R-xx`)** : propose un risque pour chaque zone d'ombre `assumée` et chaque hypothèse importante encore `à vérifier`. Pour chacun : probabilité, impact et une piste de réponse **côté métier** (pas de solution technique).
3. **Périmètre** : fais confirmer `scope.in` et `scope.out` à la lumière des exigences. Les besoins `hors_périmètre` y sont repris automatiquement.
4. **Contraintes et dépendances** : fais confirmer la liste.
5. **Glossaire** : propose les termes métier employés dans les exigences, les règles et les objectifs, avec une définition validée par le responsable du domaine concerné. Les règles métier ne sont pas plus précises que le vocabulaire sur lequel elles reposent.
6. **Décisions** : passe en revue les `DD-xx`. Toute décision `proposé` est soit rendue par son décideur, soit reportée avec sa zone d'ombre.

---

## Générer le BRD

Après chaque section validée (et à la demande), régénère le document :

```
node <chemin-du-skill>/scripts/render-brd.mjs brd/<slug>/state.yaml
```

- Sans option, seuls les éléments `validé` apparaissent ; le document indique combien d'éléments attendent une validation.
- Avec `--include-proposed`, les éléments `proposé` apparaissent marqués *(proposé)* : utile pour relire un brouillon.
- Au premier lancement, installe la dépendance : `npm install` dans le dossier `scripts/` du skill.
- Si le script est indisponible, dis-le à l'utilisateur. Ne génère pas `brd.md` toi-même : il divergerait de l'état.

Mets à jour `brd_sections` (`à rédiger` → `proposé` → `validé`) au fil des validations.

Si l'utilisateur modifie `brd.md` à la main, explique que la modification sera écrasée et propose de la reporter dans l'état.

---

## Retour ponctuel en Discover

Si une zone d'ombre bloquante apparaît (contradiction, valeur actuelle inconnue, profil manquant…) :

1. Enregistre-la et explique pourquoi elle bloque.
2. Propose un retour **ciblé sur cette seule zone d'ombre** : préparer l'entretien ou la question qui la lèvera, puis revenir à l'étape en cours. La phase reste `define`.
3. Trace-le dans `define_returns`.

---

## Council en mode complétude (optionnel)

Après l'étape 2, **lance** un council en mode `completude` (protocole : `references/council.md`). Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. L'utilisateur n'est sollicité qu'au triage des questions. Les lentilles cherchent des exigences ou des objectifs manquants et les renvoient **sous forme de questions**. Une question retenue devient une zone d'ombre ; elle ne devient une exigence qu'après avoir été levée par une source.

---

## Fin de la phase

**Propose** le passage à Govern, sans le décider, quand :

- toutes les sections de `brd_sections` sont `validé` ;
- chaque objectif a au moins une exigence, et chaque exigence au moins un objectif ;
- chaque exigence validée a au moins un critère d'acceptation et une priorité ;
- chaque exigence de transition a un type, ses parties prenantes et un critère d'achèvement ;
- chaque règle métier validée a une source, un type et un responsable, et, si elle est de comportement, un niveau d'application ;
- aucune décision n'est restée `proposé` sans zone d'ombre ouverte qui l'explique ;
- `lint.mjs` a été lancé sur l'état complet ; chaque avertissement restant est corrigé ou couvert par une dérogation (`lint_waivers`) ;
- chaque besoin candidat `confirmé` est `intégré`, `abandonné` ou `hors_périmètre` ;
- aucune zone d'ombre bloquante n'est ouverte ;
- le BRD a été régénéré après la dernière validation.

Liste ce qui manque, s'il y a lieu. Si l'utilisateur accepte, passe `phase: govern` et note la date.
