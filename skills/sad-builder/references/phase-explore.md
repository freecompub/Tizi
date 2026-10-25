# Phase Explore

**But** : comprendre ce qui pèse sur l'architecture avant de décider quoi que ce soit — le PRD ingéré, l'existant inventorié (brownfield), les moteurs architecturaux exprimés en scénarios de qualité, le domaine découpé en contextes, et le système posé dans son environnement.

Explore ne choisit aucune technologie. Une préférence technique exprimée par l'utilisateur est notée comme option pour un futur ADR, pas comme décision.

---

## 1. Ingestion du PRD

1. Lance `node <chemin-du-skill>/scripts/verify-handoff.mjs <handoff.yaml>`. Un handoff non intègre n'est pas ingéré : demande qu'il soit régénéré depuis la version figée du PRD. Sinon, reporte l'empreinte dans `source_prd.sha256`. Vérifie aussi qu'il vient d'une baseline (`source.status: baseline`) ; sinon, signale-le et demande s'il faut continuer.
2. Renseigne `source_prd` et copie dans `prd_ref` : problème, vision, FR (identifiant, énoncé, priorité, release, règles), NFR, contraintes, règles métier, personas. Ces copies sont en lecture seule.
3. Reprends `decision_rights` et fais compléter au moins deux domaines propres à l'étape :
   - `architecture` : qui tranche entre deux options de conception ;
   - `acceptation_risque_securite` : qui peut accepter une menace non atténuée. Ce décideur ne peut pas être celui qui porte la livraison seule : il répond du risque.
4. Présente ce qui conditionne la conception : NFR Must, contraintes, règles automatisées, hypothèses et risques ouverts, zones d'ombre assumées du PRD. Un point non résolu qui pèse sur la conception devient une zone d'ombre `conflit_amont` ou `hypothese_technique`.

---

## 2. Inventaire de l'existant (brownfield)

Suis `references/brownfield.md`. En résumé :

1. Fais préciser les dépôts concernés et la partie de l'existant que le changement touche (`existing.scope`). On n'inventorie pas tout le système, seulement ce qui borde le changement.
2. Lis le code, la configuration, les manifestes de déploiement et la documentation. Pour chaque élément trouvé, enregistre une source (`SRC-xxx`, avec dépôt, commit et chemin) et un élément C4 au cycle de vie `existant_conservé` par défaut.
3. Ne crée aucun élément ni aucune relation sans preuve. Ce que l'utilisateur affirme sans preuve est une hypothèse ; ce que tu soupçonnes sans preuve est une zone d'ombre `existant_non_prouve`.
4. Relève les **contraintes héritées** (contrat consommé par d'autres, schéma en production, plateforme imposée, version de langage) et la **dette** (`DT-xx`) qui pèse sur le changement.
5. Présente l'inventaire comme une vue C4 actuelle générée (`render-sad.mjs`) et fais-la valider.

---

## 3. Moteurs architecturaux (`AD-xx`)

Toutes les exigences ne pèsent pas autant sur l'architecture. Un moteur architectural est une exigence, une contrainte ou une règle dont la satisfaction **change la structure** du système : si on l'ignorait, on construirait autre chose.

1. Parcours les NFR, les contraintes, les règles automatisées et les FR structurantes (temps réel, hors ligne, volumétrie, intégration externe). Propose un moteur pour chacune qui change la structure ; les autres resteront traitées en conception détaillée.
2. Exprime chaque moteur comme un **scénario de qualité** (`references/quality-scenarios.md`) : source, stimulus, environnement, artefact, réponse, mesure. La mesure reprend la cible de la NFR ; si elle manque, crée une zone `driver_non_mesurable` et adresse-la au product owner : la cible appartient au PRD.
3. Fais coter chaque moteur sur deux axes : **importance** pour le métier, **difficulté** pour l'architecture. Les moteurs haute/haute orientent les premières décisions ; un moteur basse/basse n'en est probablement pas un.
4. Vise 5 à 12 moteurs. Au-delà, regroupe ; en deçà de 3, demande si le produit est vraiment trivial ou si des NFR manquent (zone `conflit_amont`).

---

## 4. Modèle du domaine (`CTX-xx`)

Suis `references/domain-modelling.md`.

1. Propose un atelier **Event Storming de niveau conception** à partir du processus cible du BRD et des parcours du PRD : événements, commandes, acteurs, politiques, modèles de lecture, puis agrégats. Prépare un brief comme pour l'atelier du BRD ; traite le compte rendu comme une source.
2. Sans atelier, propose les contextes à partir du vocabulaire : là où un même mot change de sens, il y a une frontière.
3. Pour chaque contexte : responsabilité en une phrase, termes propres, agrégats. Chaque **règle métier automatisée** du PRD est rattachée à l'agrégat qui la garantit (`invariants`). Une règle sans agrégat est une zone `frontiere_floue`.
4. Propose la carte des contextes (`context_map`) : qui dépend de qui, et selon quelle relation.

---

## 5. Contexte du système (C4 niveau 1)

Suis `references/c4-modelling.md`.

1. Crée l'élément `system` interne (le produit) et les personnes (`PS-xx`, rattachées aux personas du PRD).
2. Crée les systèmes externes avec lesquels il échange, et les relations au niveau système. Un système externe dont le comportement n'est pas confirmé (disponibilité, contrat, quotas) est une zone `dependance_inconnue`.
3. En brownfield, la vue cible part de la vue actuelle : chaque élément porte son cycle de vie.

---

## 6. Council

Après les moteurs et le domaine, **lance** un council en mode `exploration` (`references/council.md`) : moteurs oubliés, scénarios non mesurables, dépendances externes fragiles, frontières de contexte douteuses. Le council ne se demande pas : son moment est prescrit, et la vérification qui cherche ce que tu as manqué ne peut pas dépendre de ton accord. Ses questions deviennent des zones d'ombre et se posent **comme les autres**, classées par impact : l'utilisateur n'a jamais à trier une liste de questions sur la méthode, et ni le council, ni ses lentilles, ni son mode n'apparaissent dans ce que tu lui écris.

---

## Fin de la phase

**Propose** le passage à Design quand :

- `prd_ref` est complet et `decision_rights` désigne un décideur pour `architecture` et `acceptation_risque_securite` ;
- en brownfield, l'inventaire est validé et chaque élément existant a une preuve ;
- chaque moteur validé a un scénario dont la mesure est chiffrée, ou sa zone d'ombre est assumée ;
- chaque règle métier automatisée est rattachée à un agrégat ;
- la vue de contexte est validée ;
- le council en mode exploration a été passé, et ses questions enregistrées comme zones d'ombre ;
- aucune zone d'ombre bloquante n'est ouverte ;
- `lint.mjs` a été lancé ; ses avertissements sont listés sans bloquer.

Si l'utilisateur accepte, passe `phase: design`.
