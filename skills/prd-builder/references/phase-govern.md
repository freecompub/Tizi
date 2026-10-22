# Phase Govern

**But** : faire relire le PRD, intégrer les retours de façon traçable, obtenir l'approbation, figer une baseline et produire le handoff vers la conception (étape 3) et la planification (étape 4).

Le déroulé est le même que pour le BRD ; seules les différences sont détaillées ici.

## Scripts

| Script | Rôle | Sortie |
|---|---|---|
| `review-pack.mjs prd/<slug>/state.yaml` | Synthèse d'une page et fiche par relecteur | `review/v<version>/` |
| `freeze-version.mjs prd/<slug>/state.yaml [--baseline]` | Copie immuable avec changelog par identifiants | `versions/v<version>/` |
| `build-handoff.mjs prd/<slug>/versions/v<version>/state.yaml` | Paquet de handoff, depuis une version figée | `handoff/v<version>/` |

Versions : `0.x` brouillons et candidates, `1.0` première baseline ; ensuite mineure pour un ajustement, majeure pour un changement de périmètre ou de MVP.

## Étape 1. Préparer la revue

1. Propose les rôles de revue dans `governance.reviewers` : le product owner approuve ; en mode chaîné, le porteur métier du BRD relit (il vérifie que le produit sert ses exigences) ; un représentant de la conception et un de la qualité relisent (faisabilité, testabilité).
2. Lance `lint.mjs` sur l'état complet et traite les avertissements de forme avant d'envoyer : les relecteurs doivent pouvoir se concentrer sur le fond.
3. Fais valider le numéro de version candidate, passe `governance.status` à `en_revue`, fige avec `freeze-version.mjs`, puis génère le dossier avec `review-pack.mjs`.
4. Canal : export (par défaut) ou pull request, comme pour le BRD.
5. Enregistre le cycle dans `governance.review_rounds`.

## Étape 2. Collecter et traiter les retours

Comme pour le BRD : chaque retour est une source, découpée en commentaires `CM-xxx` (`correction`, `modification`, `nouvelle_exigence`, `contestation`, `question`), chacun avec une décision motivée.

Spécificités du PRD :
- un commentaire qui remet en cause une **exigence du BRD** n'est pas traité dans le PRD : propose une demande de changement `target: brd` ;
- un commentaire de faisabilité technique devient une zone d'ombre ou une contrainte, jamais une exigence d'implémentation ;
- une nouvelle exigence suit les règles de Specify (origine, EARS, AC) ;
- une contestation entre parties prenantes devient une zone `conflit_interets`, tranchée par l'arbitre désigné dans `decision_rights`.

## Étape 3. Approuver

Une approbation n'est enregistrée que si l'utilisateur la déclare (qui, version, décision, preuve facultative). Les réserves deviennent des risques ou des zones d'ombre suivies. Quand tous les approbateurs ont approuvé la même version, passe `governance.status` à `approuvé`.

## Étape 4. Baseline et handoff

1. Mets à jour `governance.version` (`1.0` pour la première), passe le statut à `baseline`, ajoute l'entrée dans `governance.baselines`.
2. Fige avec `freeze-version.mjs --baseline` ; ne passe pas outre une approbation manquante sans accord explicite.
3. Propose un tag Git `prd/<slug>/v<version>`.
4. Génère le handoff avec `build-handoff.mjs`. Il contient, release par release : les FR avec leurs AC, les NFR, les contraintes, les décisions produit, les métriques et l'instrumentation, les hypothèses, risques et zones d'ombre assumées, et la traçabilité vers le BRD.
5. Rappelle que la conception et la planification doivent conserver les identifiants `FR`, `NFR` et `AC`.

## Après la baseline

Toute modification passe par une demande de changement `CR-xxx` avec analyse d'impact (FR, AC, NFR, releases touchées). Si le changement vient d'une nouvelle baseline du BRD, compare les `BR` de `brd_ref` avec le nouveau handoff et liste les FR impactées.

## Fin de la phase

La construction du PRD est terminée quand une baseline existe et que le handoff a été généré. Propose de passer à la conception, sans la démarrer.

## Couverture et empreinte

Avant l'approbation, le document généré montre ses métriques de couverture et leurs seuils (section « Couverture »). Un seuil non atteint se corrige, ou se justifie par une dérogation dans `coverage_waivers` (métrique, raison, approbateur déclaré par l'utilisateur) ; `lint.mjs` le signale sinon (règle S54). Les seuils se règlent par projet dans `coverage_thresholds`.

Le handoff est écrit avec son empreinte SHA-256 (`handoff.yaml.sha256`) et l'empreinte de la version figée dont il vient, ainsi que les métriques de couverture et les dérogations. L'étape suivante le vérifie avec `verify-handoff.mjs` avant de l'ingérer.

## Avant la gouvernance : relecture par domaine et analyse croisée

- **Listes de contrôle de relecture** : `scripts/review-checklist.mjs <état> --domaines securite,accessibilite,ergonomie,donnees-sante,performance` génère, pour les domaines retenus avec l'utilisateur, des questions sur la qualité des exigences. **Un relecteur nommé les coche ; tu ne les coches jamais.** Un point écarté porte son nom et sa raison. Les points non traités bloquent la gouvernance (S80) ; `--etat` en fait le compte.
- **Analyse croisée du sens** : `scripts/cross-context.mjs <état>` rassemble tout ce que le document affirme ; lance le sous-agent `cross-analyzer` en contexte neuf sur ce dossier, écris sa réponse dans `analyse/findings.yaml`, puis `scripts/cross-merge.mjs <état>`. Les constats retenus deviennent des zones d'ombre **proposées** (`analyse/proposals.yaml`), à valider avec l'utilisateur : une contradiction est une question, jamais une correction que tu fais seul.

Idées reprises de spec-kit (commandes checklist et analyze).
