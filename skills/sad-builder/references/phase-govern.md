# Phase Govern

**But** : faire relire la conception, intégrer les retours de façon traçable, obtenir l'approbation, figer une baseline et produire le handoff vers la planification (étape 4) et l'implémentation (étape 5).

Le déroulé est celui du BRD et du PRD ; seules les différences sont détaillées ici.

## Scripts

| Script | Rôle | Sortie |
|---|---|---|
| `lint.mjs sad/<slug>/state.yaml` | Vérification de forme, non bloquante | console |
| `review-pack.mjs sad/<slug>/state.yaml` | Synthèse d'une page et fiche par relecteur | `review/v<version>/` |
| `freeze-version.mjs sad/<slug>/state.yaml [--baseline]` | Copie immuable avec changelog par identifiants | `versions/v<version>/` |
| `build-handoff.mjs sad/<slug>/versions/v<version>/state.yaml` | Paquet de handoff, depuis une version figée | `handoff/v<version>/` |

Versions : `0.x` brouillons et candidates, `1.0` première baseline ; ensuite mineure pour un ajustement, majeure pour un nouvel ADR structurant ou un changement de découpage en conteneurs.

## Étape 1. Préparer la revue d'architecture

1. Propose les rôles dans `governance.reviewers` :
   - le décideur `architecture` approuve ;
   - le décideur `acceptation_risque_securite` approuve s'il y a des menaces acceptées ;
   - le product owner relit les réponses aux NFR et les demandes de changement vers le PRD ;
   - un représentant de chaque équipe qui possède un conteneur relit (faisabilité) ;
   - l'exploitation relit le déploiement, l'observabilité et les vérifications prévues en exploitation.
2. Lance `lint.mjs` sur l'état complet et traite les avertissements de forme avant l'envoi.
3. Fais valider le numéro de version candidate, passe `governance.status` à `en_revue`, fige avec `freeze-version.mjs`, puis génère le dossier avec `review-pack.mjs`.
4. Une revue d'architecture porte sur les **décisions et leurs compromis**, pas sur la mise en forme : la synthèse présente les moteurs principaux, les ADR qui les servent et ce qu'ils sacrifient, les menaces acceptées, les hypothèses encore à prouver, et une **grille par pilier** (`references/architecture-review.md`) avec les preuves déjà présentes dans l'état. Le résultat par pilier est enregistré dans `architecture_review` sur déclaration de l'utilisateur ; un pilier `risque` devient un risque ou une zone d'ombre suivie.
5. Enregistre le cycle dans `governance.review_rounds`.

## Étape 2. Collecter et traiter les retours

Comme pour le BRD : chaque retour est une source, découpée en commentaires `CM-xxx`, chacun avec une décision motivée.

Spécificités de la conception :
- un commentaire qui remet en cause une FR, une NFR ou une règle n'est pas traité ici : propose une demande de changement `target: prd` (ou `brd`) ;
- un désaccord sur une option d'un ADR accepté ne se règle pas en réécrivant l'ADR : si le décideur revient sur son choix, un nouvel ADR remplace l'ancien ;
- une contestation entre parties prenantes devient une zone `conflit_interets`, tranchée par l'arbitre désigné.

## Étape 3. Approuver

Une approbation n'est enregistrée que si l'utilisateur la déclare (qui, version, décision, preuve facultative). Les réserves deviennent des risques ou des zones d'ombre suivies. Quand tous les approbateurs ont approuvé la même version, passe `governance.status` à `approuvé`.

## Étape 4. Baseline et handoff

1. Mets à jour `governance.version`, passe le statut à `baseline`, ajoute l'entrée dans `governance.baselines`.
2. Fige avec `freeze-version.mjs --baseline` ; ne passe pas outre une approbation manquante sans accord explicite.
3. Génère le paquet avec `build-handoff.mjs`. Il contient, pour la planification :
   - les éléments à construire ou à modifier, avec leurs FR, leur release et leur équipe ;
   - les contrats et leurs opérations ;
   - les vérifications de NFR, rangées par étape du SDLC ;
   - les mesures de sécurité à réaliser ;
   - les spikes à mener avant les tickets qui en dépendent ;
   - en brownfield, les éléments modifiés, remplacés ou retirés et la dette touchée.
4. Explique que la planification doit conserver les identifiants (`CT`, `CP`, `API`, `OP`, `NR`, `TH`, `ADR`) pour préserver la traçabilité jusqu'au code.

## Après la baseline : demandes de changement

Toute modification passe par une demande de changement (`CR-xxx`) avec analyse d'impact : éléments, ADR, contrats, menaces et vérifications touchés. Un changement de décision structurante produit un nouvel ADR et une version majeure.

## Couverture et empreinte

Avant l'approbation, le document généré montre ses métriques de couverture et leurs seuils (section « Couverture »). Les seuils se règlent par projet dans `thresholds`, au niveau de l'état — **un seul nom pour les cinq documents** ; `coverage_thresholds` et `settings.thresholds` restent lus, et `S107` dit de les renommer.

Un seuil non atteint se corrige, ou s'assume par une **dérogation nommée** dans `waivers` : `{ metric, reason, approved_by }`. Elle ne compte que si elle dit **pourquoi** et **qui l'a approuvée** — sans l'un des deux, elle n'éteint rien, l'avertissement reste (`S54`) et `S106` nomme ce qui manque. « Une dérogation nommée porte sa raison, sinon c'est un silence » : la règle valait pour les avertissements de forme, et pas pour les seuils, là où ce qui est en jeu est une approbation.

Et un **seuil à 0 ne compare rien** : `pct >= 0` est toujours vrai. C'est une mise hors périmètre, et elle passe par la même dérogation (`S105`). Sans elle, la mesure se dit « non mesurée » au lieu de s'afficher atteinte — la table de couverture du plan de l'exemple rendait « Stories prêtes | 2/5 | 40 % | 0 % | atteint », trois stories sur cinq non prêtes lues comme une ligne verte.

Le handoff est écrit avec son empreinte SHA-256 (`handoff.yaml.sha256`) et l'empreinte de la version figée dont il vient, ainsi que les métriques de couverture et les dérogations. L'étape suivante le vérifie avec `verify-handoff.mjs` avant de l'ingérer.

## Instructions du dépôt

Après chaque version figée de la conception, lance `node <chemin-du-skill>/scripts/sync-agent-instructions.mjs .` : le bloc Tizi de `AGENTS.md` (importé par `CLAUDE.md`) reprend les règles des ADR acceptés, les dossiers de chaque composant, les contrats et les données sensibles. C'est ce que lisent les agents qui ne passent pas par un skill (complétion dans l'éditeur, question rapide). Le bloc reste court : il est chargé à chaque session. Idée reprise de BMAD-METHOD.

## Avant la gouvernance : relecture par domaine et analyse croisée

- **Listes de contrôle de relecture** : `scripts/review-checklist.mjs <état> --domaines securite,accessibilite,ergonomie,donnees-sante,performance` génère, pour les domaines retenus avec l'utilisateur, des questions sur la qualité des exigences. **Un relecteur nommé les coche ; tu ne les coches jamais.** Un point écarté porte son nom et sa raison. Les points non traités bloquent la gouvernance (S80) ; `--etat` en fait le compte.
- **Analyse croisée du sens** : `scripts/cross-context.mjs <état>` rassemble tout ce que le document affirme ; lance le sous-agent `cross-analyzer` en contexte neuf sur ce dossier, écris sa réponse dans `analyse/findings.yaml`, puis `scripts/cross-merge.mjs <état>`. Les constats retenus deviennent des zones d'ombre **proposées** (`analyse/proposals.yaml`), à valider avec l'utilisateur : une contradiction est une question, jamais une correction que tu fais seul.

Idées reprises de spec-kit (commandes checklist et analyze).

**Et le passage lui-même s'écrit.** Dès que l'utilisateur a tranché, ajoute l'entrée à `phase_log` : la phase qui se clôt, celle qui s'ouvre, la date, qui a décidé, la source qui le porte, l'état de la porte tel que `status.mjs` l'a dit, et chaque condition franchie par dérogation avec sa raison. Sans cette entrée, `status.mjs` affiche « passage sans trace » et le document rendu ne peut pas dire au relecteur quand la phase a été close ni par qui (S100, S101). L'état de la porte se recopie **tel quel** — « X condition(s) tenue(s) sur Y mesurée(s) » —, parce que le compte se relit : Y moins X donne le nombre de conditions non tenues, et `waived` doit en nommer exactement autant. Une de plus et une condition a été franchie sans que rien ne dise laquelle ni pourquoi ; une de moins et l'un des deux comptes est faux (S124).
