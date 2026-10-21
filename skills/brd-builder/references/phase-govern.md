# Phase Govern

**But** : faire relire le BRD par les bonnes personnes, intégrer leurs retours de façon traçable, obtenir l'approbation, puis figer une version de référence (baseline) et la transmettre au PRD.

Les règles des phases précédentes restent valables : `state.yaml` est la source de vérité, tout passe par proposition puis validation, rien ne disparaît en silence, toute nouvelle exigence passe par un besoin candidat sourcé.

## Scripts de la phase

Tous se lancent avec `node <chemin-du-skill>/scripts/<script> …` (dépendance installée une fois avec `npm install` dans `scripts/`). N'écris jamais toi-même les fichiers qu'ils produisent : s'ils sont indisponibles, dis-le à l'utilisateur.

| Script | Rôle | Sortie |
|---|---|---|
| `review-pack.mjs brd/<slug>/state.yaml` | Dossier de revue de la version courante | `review/v<version>/synthese.md`, `relecteur-<SH-xx>.md` |
| `freeze-version.mjs brd/<slug>/state.yaml [--baseline]` | Copie immuable de l'état et du BRD, avec changelog par identifiants | `versions/v<version>/` |
| `build-handoff.mjs brd/<slug>/versions/v<version>/state.yaml` | Paquet de handoff vers le PRD, à partir d'une version figée | `handoff/v<version>/handoff.yaml`, `handoff.md` |

## Versions

- `0.x` : brouillons et versions candidates soumises à revue.
- `1.0` : première baseline approuvée.
- Après une baseline : `x.y+1` pour un ajustement sans effet sur le périmètre, `x+1.0` pour un changement de périmètre ou d'objectif.

Une version figée n'est jamais modifiée. Pour figer à nouveau, incrémente d'abord `governance.version`.

---

## Étape 1. Préparer la revue

1. **Rôles de revue** : propose une liste dans `governance.reviewers` à partir de la cartographie :
   - les décideurs de `decision_rights` pour le périmètre et les objectifs → `approbateur` ;
   - quadrant « impliquer » → `approbateur` ;
   - « consulter » → `relecteur` ;
   - « satisfaire » → `informé`.
   L'utilisateur ajuste. Il faut au moins un approbateur.
2. **Version candidate** : propose un numéro (`0.x`), fais-le valider, renseigne `governance.version`, passe `governance.status` à `en_revue`.
3. **Toilette avant d'envoyer** : lance `lint.mjs` sur l'état complet et traite les avertissements de forme. Une revue sert à obtenir un accord sur le fond ; des relecteurs qui passent leur temps sur des imprécisions de rédaction ne regardent plus le fond.
4. **Fige la version** avec `freeze-version.mjs`, puis génère le dossier avec `review-pack.mjs`. Le dossier contient une synthèse d'une page (problème, objectifs, exigences Must, risques, points à trancher) et, pour chaque relecteur, les exigences issues de ses propres échanges et les questions qui lui sont adressées.
5. **Canal de diffusion** — demande lequel l'utilisateur préfère :
   - **export** (par défaut, adapté aux relecteurs métier) : le BRD et les fiches sont envoyés en Word, PDF ou document partagé. Si `pandoc` est disponible, propose `pandoc brd.md -o brd.docx` ; préviens que les diagrammes Mermaid ne sont pas convertis et devront être exportés en image si nécessaire. Sinon, l'utilisateur exporte lui-même ;
   - **pull request** : adaptée si les relecteurs utilisent GitHub ; les commentaires de la PR sont ensuite traités comme des retours.
6. Enregistre le cycle dans `governance.review_rounds` (`RV-n`, version, date d'envoi, canal, échéance).

---

## Étape 2. Collecter les retours

L'utilisateur rapporte les retours : fiches complétées, mail, commentaires de document ou de PR, compte rendu de réunion.

1. Enregistre chaque retour comme une **source** (`SRC-xxx`, type `revue`) rattachée au relecteur.
2. Découpe-le en **commentaires** (`CM-xxx`) dans `governance.comments`, chacun avec sa cible (identifiant ou section) et une catégorie :
   - `correction` : forme, formulation, coquille ;
   - `modification` : le sens d'un élément existant change ;
   - `nouvelle_exigence` : un besoin absent du BRD ;
   - `contestation` : désaccord sur un élément ;
   - `question` : demande de clarification.
3. Une décision d'approbation exprimée dans un retour n'est **pas** encore enregistrée : elle sera traitée à l'étape 4.

---

## Étape 3. Traiter les retours

1. Pour chaque commentaire, propose une décision — `accepté`, `rejeté` ou `reporté` — avec une raison pour les deux derniers. L'utilisateur décide.
2. Applique les commentaires acceptés selon leur catégorie :
   - `correction`, `modification` : mets à jour l'élément, renseigne `changes` ;
   - `nouvelle_exigence` : crée d'abord le besoin candidat sourcé (`BC` lié à la source de revue), puis l'exigence en suivant les règles de Define ;
   - `contestation` : crée une zone d'ombre `contradiction`, qualifiée par son sous-type ; s'il s'agit d'un conflit d'intérêts, l'arbitre est désigné par `decision_rights` (capacité 9 de Discover) ; si elle est bloquante, propose un retour ponctuel en Define ou en Discover pour la lever ;
   - `question` : réponds avec l'utilisateur ; si la réponse change le BRD, traite-la comme une modification.
3. Présente la **matrice de résolution** : commentaires par relecteur, décision, raison, éléments modifiés. Elle permet de répondre à chaque relecteur.
4. Si les changements sont significatifs, propose un nouveau cycle de revue avec une version `0.x` incrémentée ; le changelog généré par `freeze-version.mjs` montre aux relecteurs ce qui a changé.

---

## Étape 4. Approuver

1. Enregistre une approbation **uniquement quand l'utilisateur la déclare** : qui, quelle version, quelle décision, et une référence de preuve facultative (mail, signature, compte rendu). Indique `declared_by: utilisateur`. N'en déduis jamais une d'un retour ou d'un silence.
2. Décisions possibles :
   - `approuvé` ;
   - `approuvé_avec_réserves` : chaque réserve devient un risque (`R-xx`) ou une zone d'ombre suivie, référencé dans `reserves` ;
   - `refusé` : identifie avec l'utilisateur ce qui doit changer, puis reprends à l'étape 3 ou dans la phase concernée.
3. Quand tous les approbateurs ont approuvé la même version (avec ou sans réserves), passe `governance.status` à `approuvé`.

---

## Étape 5. Baseline et handoff

1. Propose le numéro de baseline (`1.0` pour la première), mets à jour `governance.version`, passe `governance.status` à `baseline` et ajoute l'entrée dans `governance.baselines`.
2. Fige avec `freeze-version.mjs --baseline`. Le script signale les approbations manquantes ; ne passe pas outre sans l'accord explicite de l'utilisateur.
3. Propose un tag Git (`brd/<slug>/v<version>`) si le projet est versionné.
4. Génère le paquet avec `build-handoff.mjs` sur la version figée. Présente-le : exigences par priorité, critères d'acceptation, hypothèses et risques ouverts, zones d'ombre assumées, réserves d'approbation.
5. Explique que le PRD devra conserver les identifiants `BR-xxx` pour préserver la traçabilité.

---

## Après la baseline : demandes de changement

Toute modification d'un BRD en baseline passe par une demande de changement (`CR-xxx`, dans `governance.change_requests`) :

1. Enregistre la demande : qui, quoi, pourquoi.
2. **Analyse d'impact** : liste les objectifs, exigences, critères et risques touchés ; indique si le périmètre change (→ version majeure) ou non (→ version mineure).
3. L'utilisateur décide (`acceptée` ou `refusée`). Si acceptée : applique les changements, puis reprends le cycle revue → approbation → baseline sur la nouvelle version. Le changelog et un nouveau handoff en découlent.

---

## Fin de la phase

La construction du BRD est terminée quand une baseline existe et que le handoff a été généré. Propose alors de passer à l'étape suivante du SDLC (PRD), sans la démarrer toi-même.

## Couverture et empreinte

Avant l'approbation, le document généré montre ses métriques de couverture et leurs seuils (section « Couverture »). Un seuil non atteint se corrige, ou se justifie par une dérogation dans `coverage_waivers` (métrique, raison, approbateur déclaré par l'utilisateur) ; `lint.mjs` le signale sinon (règle S54). Les seuils se règlent par projet dans `coverage_thresholds`.

Le handoff est écrit avec son empreinte SHA-256 (`handoff.yaml.sha256`) et l'empreinte de la version figée dont il vient, ainsi que les métriques de couverture et les dérogations. L'étape suivante le vérifie avec `verify-handoff.mjs` avant de l'ingérer.
