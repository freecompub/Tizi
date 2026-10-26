# Phase Frame

**But** : cadrer le produit avant de le spécifier — vision, objectifs produit, personas, parcours, story map et découpage en releases avec un MVP.

---

## 1. Ingestion

**Mode chaîné**
1. Lance `node <chemin-du-skill>/scripts/verify-handoff.mjs <handoff.yaml>`. Si le handoff n'est pas intègre, ne l'ingère pas : il a été modifié après sa génération ; demande qu'il soit régénéré depuis la version figée du BRD. Sinon, reporte l'empreinte affichée dans `source_brd.sha256`. Vérifie aussi qu'il provient d'une baseline (`source.status: baseline`) ; sinon, signale-le et demande s'il faut continuer.
2. Renseigne `source_brd` (chemin, version) et copie dans `brd_ref` les objectifs et les exigences (ID, énoncé, priorité). Reprends le problème dans `problem` avec `confirmed: true`.
3. Copie aussi `business_rules` (avec `automation: à_décider`), `decision_rights`, `transition_requirements` et **`stakeholders`** depuis le handoff. Le registre arrive avec le `status` de chacun : qui a été entendu, qui reste `à interroger`. Ne le remets pas à zéro — c'est lui qui attribue les sources du PRD (`S81`), et une personne encore `à interroger` dans le BRD l'est toujours ici. Rattache chaque exigence de transition à une release (`release`) : la formation et la reprise de données accompagnent la release qui change la façon de travailler. Les contraintes d'environnement du BRD orientent les NFR de contexte d'usage (`references/nfr-taxonomy.md`). Les règles restent sous l'autorité du BRD : seul le champ `automation` se décide dans le PRD.
4. Présente ce qui conditionne le produit : exigences Must, contraintes, hypothèses à vérifier, risques, zones d'ombre assumées, réserves d'approbation. Chaque point non résolu qui pèse sur le produit devient une zone d'ombre `conflit_amont` ou `hypothese_non_verifiee`.

**Mode autonome** — mini-cadrage métier, par lots de 2 à 3 questions, et **un lot ne transporte pas de question ouverte** : un thème qui demande un récit part seul, suivi du silence (`references/questions.md`). **Commence par demander qui te répond et qui est avec lui — nom et fonction pour chacun** : une réponse par répondant, sauf s'ils sont d'accord, et c'est toi qui déduis la qualité de chacun (en son nom, pour un groupe, en relayant un absent) pour la faire corriger (section 1 bis de `references/elicitation-patterns.md`). La question est due même quand une seule personne répond. Chaque personne entre dans `stakeholders` — `name`, `role`, `represents` si elle parle pour quelqu'un, et `status: interrogée` dès qu'elle a répondu ; celle dont on rapporte les propos reste `à interroger`. Puis :
1. Le problème, pour qui, et pourquoi maintenant.
2. Ce qui prouve le problème : enregistre chaque élément comme source `SRC-xxx` (entretien, ticket, donnée, retour client, décision), avec dans `stakeholders` **celui qui a parlé** — jamais celui dont il rapporte les besoins. Une réunion à plusieurs répondants donne une source par voix entendue. `S81` refuse une source attribuée à quelqu'un que l'état déclare `à interroger` : un PRD peut tenir sur du rapporté, il ne peut pas le présenter comme recueilli.
3. Les résultats attendus (ils deviendront les objectifs produit).
4. Ce qui est clairement hors du sujet.
5. Qui tranche en cas de désaccord sur le périmètre, sur les priorités, et sur le comportement attendu du produit : renseigne `decision_rights` et fais-le confirmer par le sponsor ou le product owner.
6. Les règles métier connues (réglementation, procédures, pratiques) : enregistre-les comme `RG-xxx` avec leur source et leur responsable, comme dans le BRD.

Pour les entretiens et observations de ce mini-cadrage, applique `references/elicitation-patterns.md` (filtres de discours, besoins exprimés en négatif, retour à la source).
Si le problème reste flou ou non étayé après ce cadrage, dis-le : un BRD serait peut-être préférable. L'utilisateur décide.

---

## 2. Vision produit

Propose une vision en 2 à 4 phrases : pour qui, quel problème, ce qui change pour eux, ce qui distingue l'approche. Pas de technologie.

---

## 3. Objectifs produit (`GOAL-xx`)

1. Mode chaîné : dérive les objectifs produit des objectifs du BRD (`brd_objectives`). Un objectif produit précise la contribution du produit à un objectif métier ; il ne le duplique pas.
2. Chaque objectif est SMART : énoncé, KPI, valeur actuelle, cible, horizon. Une valeur inconnue devient une zone d'ombre `objectif_non_mesurable`, jamais une valeur inventée. **La valeur actuelle se mesure, la cible se décide** : elle vient du décideur désigné (`decision_rights`) et ne se déduit pas de la valeur actuelle. Avoir mesuré les métriques en entretien ne donne donc aucune cible — c'est là la question à poser, et `S01` la réclame (« objectif produit sans KPI ou sans cible »). Une
fois arrêtée, la cible décidée **remplace** la proposition : elle s'écrit dans `target`, avec
`decided_by` et `decided_on`, et aucun autre champ ne garde une valeur concurrente — deux chiffres pour
la même mesure en font un faux. La métrique correspondante reçoit la même cible (`S82`).
3. 2 à 5 objectifs.

---

## 4. Personas (`PER-xx`)

1. Propose des personas **fondés** : chacun cite ses preuves dans `evidence` (sources, parties prenantes ou exigences du BRD).
2. Pour chacun : rôle, jobs-to-be-done, irritants, résultat recherché.
3. Un persona sans preuve devient une zone d'ombre `persona_non_fonde` : propose comment le vérifier (entretien, données d'usage).
4. Distingue les utilisateurs directs des bénéficiaires indirects.

---

## 5. Parcours utilisateurs (`PJ-xx`)

Pour chaque persona principal, propose 1 à 3 parcours : le but, puis les étapes observables dans l'ordre, du déclencheur au résultat. Pour chaque parcours, demande ce qui se passe quand ça se passe mal (erreur, interruption, abandon) : les réponses manquantes deviennent des zones d'ombre `cas_limite` ou `etat_erreur`. Demande aussi ce que l'outil ou la procédure actuelle fait déjà « sans que personne n'y pense » à chaque étape : ce qui n'a pas de réponse sourcée devient une zone `attendu_implicite`. Les utilisateurs taisent les fonctions qu'ils jugent évidentes ; ce sont justement celles dont l'absence les rend mécontents.

---

## 6. Story map

1. Organise les étapes des parcours en **activités** (`ACT-xx`, colonnes) puis en **tâches** (`T-xx`), de gauche à droite dans l'ordre du parcours.
2. Vérifie la couverture : chaque exigence Must du BRD (mode chaîné) ou chaque objectif produit (mode autonome) doit se retrouver dans au moins une tâche. Signale les manques sous forme de questions.

---

## 7. Releases et MVP (`REL-n`)

1. Propose un découpage horizontal de la story map en releases, en suivant `references/mvp.md`.
2. Pour la première release (MVP), renseigne : hypothèse testée, valeur de bout en bout, signal, confinement. Si un critère du MVP échoue, propose de redécouper.
3. Affecte chaque tâche à une release. Une tâche sans release est une question ouverte.
4. Mets à jour `scope.in` et `scope.out` ; chaque exclusion a une raison.

---

## 7 ter. Comportements existants à préserver (produit existant)

Si le changement porte sur un produit déjà en service, renseigne `existing_product: true` et suis `references/existing-behaviors.md` : relève, avec leur preuve, les comportements actuels que le changement pourrait casser. Ils deviennent des exigences de non-régression, testées jusqu'à la release.

## 7 bis. Explorer des concepts (conditionnel)

Avant de figer la story map sur une solution, suis `references/concept-exploration.md` quand la demande initiale était figée, que le PRD est autonome, ou que plusieurs solutions sont défendues. Diverger, regrouper en deux à quatre concepts, évaluer sur les axes désirable, faisable (hypothèse seulement) et viable, tester, puis faire retenir un concept par le décideur désigné. La story map se construit sur le concept retenu ; les concepts écartés restent dans l'état avec leur raison.

## 8. Hypothèses risquées et tests

Suis `references/validated-learning.md`.

1. Fais le tri des hypothèses posées jusqu'ici (personas, parcours, MVP, objectifs) : type et risque.
2. Pour chaque hypothèse de valeur ou d'usage à risque fort, propose le plus petit test qui la confirmerait ou l'infirmerait, avec son public et son critère de réussite écrit à l'avance. Fais choisir à l'utilisateur ce qu'il teste et ce qu'il assume.
3. Quand l'utilisateur rapporte les résultats, enregistre-les comme sources et tire-en les conséquences : un persona, un parcours ou une release fondés sur une hypothèse infirmée sont revus avant de spécifier.

Cette étape est **conditionnelle** : sans hypothèse de valeur ou d'usage à risque fort, elle se réduit à les avoir classées.

---

## 9. Council

Après l'étape 5 ou 7, **lance** un council en mode `cadrage` (`references/council.md`) pour faire apparaître les personas oubliés, les parcours non couverts et les cas limites. Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. Ses questions deviennent des zones d'ombre et se posent **comme les autres**, classées par impact : l'utilisateur n'a jamais à trier une liste de questions sur la méthode, et ni le council, ni ses lentilles, ni son mode n'apparaissent dans ce que tu lui écris.

---

## Fin de la phase

**Propose** le passage à Specify quand :
- la vision et les objectifs produit sont validés, chacun mesurable ou sa zone d'ombre assumée ;
- chaque persona validé est fondé sur au moins une preuve ;
- les parcours principaux sont validés ;
- la story map couvre les exigences Must du BRD (chaîné) ou les objectifs (autonome) ;
- le MVP satisfait les critères de `references/mvp.md` ;
- `decision_rights` désigne au moins un décideur pour le périmètre et les priorités ;
- chaque hypothèse de valeur ou d'usage à risque fort est testée (avec un résultat) ou assumée avec une raison ;
- le council en mode cadrage a été passé, et ses questions enregistrées comme zones d'ombre ;
- aucune zone d'ombre bloquante n'est ouverte.

Si l'utilisateur accepte, passe `phase: specify`.
