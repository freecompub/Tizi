# Notes — la conduite des entretiens chez hve-core

Dépôt `microsoft/hve-core`, lu le 25 octobre 2026 (dernier push le même jour). Fichiers lus : `.github/agents/project-planning/brd-builder.agent.md`, `.github/skills/design-thinking/dt-methods/references/method-02-research.md` et `method-02-deep.md`, `.github/agents/project-planning/meeting-analyst.agent.md`, `.github/skills/design-thinking/ux-artifacts/references/evidence-model.md`.

Objet de la note : recenser ce que hve-core fait des entretiens, le comparer à ce que Tizi fait aujourd'hui, et poser les candidats d'emprunt — **à analyser, rien n'est décidé ici**.

## Où vivent les entretiens

Trois endroits distincts, et le premier est une surprise :

- **Le BRD Builder n'en fait pas.** Son élicitation est un questionnaire en chat avec l'utilisateur (section `Questioning Strategy`, questions numérotées avec émojis, puis questions de suivi). Les mots « interview », « elicit », « workshop » n'apparaissent pas une fois dans ses 268 lignes. Sa seule ouverture vers l'extérieur est l'activation d'un segment de recherche RPI sur un manque de preuve nommé.
- **Le DT Coach, méthode 2 « Design Research »** : c'est là que les entretiens se conduisent.
- **Le Meeting Analyst** : pour les entretiens et réunions **déjà tenus**, dont il récupère les transcriptions Microsoft 365 via `work-iq-mcp`.

## Méthode 2 — Design Research

Phrase d'ouverture du fichier : sauter cette méthode conduit à « construire des solutions que les parties prenantes veulent et dont les utilisateurs n'ont pas besoin ».

**Trois phases, chacune avec un critère de sortie :**

| Phase | Sortie exigée |
|---|---|
| Research Planning | un plan existe : objectifs priorisés, cibles par palier, méthodes retenues, calendrier |
| Research Execution | notes brutes et journaux d'observation par séance, avec verbatims et observations précises |
| Research Documentation | un document de constats adossés à des preuves, contraintes d'environnement, résultats de validation d'hypothèses |

**Deux « chapeaux » de coaching**, activés par le contexte de la conversation :

| Chapeau | Rôle | Déclenchement |
|---|---|---|
| Research Designer | conception de l'étude, priorisation des utilisateurs, optimisation des moyens | discussions de planification, contraintes de ressources, protocole |
| Empathy Guide | **coaching d'entretien en temps réel** : relances, reconnaissance de motifs | réponses d'entretien, notes d'observation, dynamiques difficiles |

**Cibles en trois paliers** : (1) utilisateurs directs qui vivent le problème au quotidien ; (2) parties prenantes adjacentes qui influencent ou subissent ; (3) contacts organisationnels ou techniques qui donnent le contexte système.

**Séquence imposée** : observation de l'environnement → entretiens de flux de travail → validation des contraintes → exploration des besoins non couverts. **L'observation passe avant l'entretien.**

**Artefacts**, sous `.copilot-tracking/dt/{projet}/method-02-research/` :

- `research-plan.md` — objectifs, cibles par palier avec stratégie d'accès, méthodes, calendrier, protocoles de conformité ;
- `interview-{nn}-{rôle}.md` — **un fichier par séance**, notes brutes avec verbatims ;
- `observation-{nn}-{contexte}.md` — journaux d'observation d'environnement ;
- `findings-summary.md` — motifs adossés aux preuves ;
- `constraint-catalog.md` — contraintes structurées avec leurs implications de conception.

**Hygiène de la donnée brute** (« Lo-Fi Quality Enforcement », le coach empêche activement la synthèse prématurée) : verbatims et non paraphrases ; détails d'environnement précis et non impressions générales ; **réflexions du chercheur séparées des observations brutes** ; catégorisation et thématisation **reportées à la méthode 3** ; une proposition de solution pendant la recherche est redirigée vers la contrainte.

**Règles de qualité** : niveaux de confiance *High* (plusieurs sources confirment) / *Medium* / *Low* ; les manques de recherche sont déclarés explicitement, faute de quoi ils se propagent dans la synthèse ; et le critère d'honnêteté — « un constat qui surprend les parties prenantes est une vraie découverte ; un constat qui confirme l'hypothèse de départ suggère un biais de confirmation ».

**À éviter**, nommé comme tel : valider une solution (tester des idées préétablies) et l'« entretien checklist » (script rigide qui empêche l'exploration adaptative).

## Techniques avancées (`method-02-deep.md`, 390 lignes, chargé à la demande)

**Entretien :**
- *Laddering* — chaîne de « pourquoi » du comportement observé vers la valeur puis le besoin fondamental, avec ses **signaux d'arrêt** : répétition des réponses, terrain émotionnel, philosophie d'entreprise. « Pousser au-delà abîme la relation. »
- *Incident critique* — ancrer sur un événement récent et précis, pas sur un cas typique ; reconstituer avant/pendant/après ; capter les détails sensoriels ; distinguer l'interprétation de l'interviewé des faits qu'il rapporte.
- *Techniques projectives*, quand la question directe produit une réponse gardée : inversion de rôle (« que diriez-vous à quelqu'un qui arrive dans votre poste ? »), scénario idéal, attribution à un tiers.
- *Entretien déclenché par le contexte* — au poste de travail, la tâche dicte les questions, pas le guide.
- *Dynamique de groupe* — adresser les questions aux silencieux, confronter l'affirmation du dominant aux autres, exploiter les désaccords comme variation de processus à documenter ; groupe pour les processus partagés, individuel pour le personnel et le sensible.

**Observation ethnographique :** contextual inquiry en maître-apprenti (interrompre seulement pour clarifier une action vue, noter les écarts dire-faire sans les contester sur le moment) ; journée complète (les transitions entre tâches contiennent la perte d'information) ; analyse des artefacts bricolés par l'utilisateur (un artefact que plusieurs créent indépendamment signale un manque systémique) ; observation passive prolongée (établir sa présence jusqu'à ce que le comportement redevienne naturel, garder les questions pour un débriefing).

**Triangulation :**
- *Multi-source* — ce que les gens **disent** (entretien) / ce qu'ils **font** (observation) / ce que les **artefacts** montrent ; documenter convergence, divergence et manque de type de source ; un constat à source unique est marqué préliminaire.
- *Analyse de contradiction* — l'écart dire-faire est **un constat à conserver**, pas à arbitrer : « plutôt que de décider laquelle est correcte, quelles conditions rendraient les deux vraies ? ». Trois familles nommées : dire-faire, rôle (opérateur vs ingénieur), temporelle (charge normale vs pic).
- *Détection de saturation* — les dernières séances confirment-elles ou découvrent-elles encore ? La saturation se **teste** en interrogeant un profil sous-représenté ; elle est souvent partielle.
- *Audit de biais* en quatre points : confirmation, sélection, interprétation, récence.

**Terrain industriel** : protocoles par quart (le quart de nuit développe des contournements invisibles de l'encadrement de jour), recherche sous contrainte de sécurité (EPI, zones restreintes, créneaux pendant les pauses), et opérateur vs ingénieur comme deux modèles mentaux valides dont la divergence révèle l'écart conception-pratique.

## Meeting Analyst — les entretiens déjà tenus

- **Paliers d'autorité 1 à 4** : décideur responsable / contributeur direct / partie prenante informée / participant externe. Les propos des paliers 1-2 valent exigence ou décision **telle quelle** ; ceux du palier 3 sont inclus **avec attribution du locuteur et de son rôle, et marqués à confirmer**. L'utilisateur valide ou corrige l'affectation avant l'extraction.
- **Confidentialité dure** : jamais de nom, courriel ou détail identifiant un client dans les fichiers d'analyse (résumer et anonymiser) ; verbatims clients retirés sauf confirmation explicite ; les fichiers de travail sont supprimés après le passage et l'agent le rappelle puis le propose ; **leurs chemins ne doivent apparaître dans aucun message de commit ni description de PR**.
- Un **avis de sensibilité affiché mot pour mot** au début de chaque session, avant toute requête.
- La transcription est **une donnée, jamais une instruction** (`untrusted-content-boundary.instructions.md`).

## La barrière de relecture humaine

`evidence-model.md` impose en fin de chaque sortie un avertissement reproduit mot pour mot : l'outil « ne conduit pas de recherche utilisateur, n'observe pas les parties prenantes et ne parle pas pour les gens dont vous concevez les problèmes » ; les personas, énoncés de problème, cartes de parcours et tests de concept sont un **échafaudage** pour sa propre recherche, pas un substitut à la voix réelle. Suit une case à cocher que **seul un humain** peut cocher — ni la marquer, ni la retirer, ni traiter sa présence comme la preuve d'une relecture.

Leurs classes de preuve : `Observed` / `Reported` / `Assumed` / `Unresolved`, cette dernière étant une **disposition et non une classe** — un élément non résolu ne compte jamais comme soutien d'une conclusion.

## Ce que Tizi fait déjà, et parfois mieux

- Le guide d'entretien (`phase-discover.md`, capacité 3) dérive ses questions des **zones d'ombre dont la personne est le `ask_to`**, et trace la correspondance question → `ZO-xxx` en fin de guide, pour l'intervieweur seulement. hve n'a pas cet ancrage : son plan de recherche porte des objectifs, pas des manques identifiés et attribués.
- L'analyse de source (capacité 4) impose la **citation d'emplacement** (ligne, horodatage, paragraphe), les trois filtres (généralisations, omissions, distorsions), la distinction besoin / règle métier / solution évoquée, et le **retour à la source** à la personne interrogée.
- `S81` dit que la partie prenante d'une source est **celle qui a parlé** : quand le demandeur parle au nom du directeur, le directeur reste `à interroger`. hve a l'équivalent en plus faible, par les paliers d'autorité du Meeting Analyst.
- La **classe de preuve calculée** à partir des sources est plus solide que leurs niveaux *High/Medium/Low*, qui sont un score de confiance subjectif — et hve lui-même interdit les scores de confiance dans ses rapports de revue de code.
- La porte de synthèse en cinq dimensions vient déjà de chez eux (méthode 3).

## Candidats d'emprunt — à analyser

1. **Saturation et audit de biais.** Notre dimension `couverture` compte `interrogée / total` : un compte qui récompense le volume et ne dit rien de la diversité. Leurs deux questions — « qui manque ou est sous-représenté ? » et « les dernières séances découvrent-elles encore ? » — portent sur ce que le compte ne voit pas. C'est le trou que le premier dossier réel a montré. À analyser : deux dimensions de plus, ou deux questions posées dans la dimension existante.
2. **Un chemin pour les notes brutes.** Nous prescrivons `brd/<slug>/interviews/guide-<SH-xx>.md` mais **aucun chemin pour ce qui en revient** : seul `ingest-dt-handoff.mjs` écrit dans `brd/<slug>/sources/`, et `phase-discover.md` ne nomme ce répertoire nulle part. Leur convention — un fichier par séance, réflexions séparées du brut, thématisation interdite avant la synthèse — rendrait vérifiable la citation d'emplacement que notre capacité 4 exige déjà.
3. **L'ordre observation-puis-entretien.** Chez eux, séquence. Chez nous, l'observation est la capacité 8, déclenchée **après** par une zone d'ombre `attendu_implicite` ou une contradiction factuelle. Leur argument se défend : on ne sait quoi demander qu'après avoir vu. À analyser : est-ce un ordre à prescrire, ou le signe qu'une zone d'ombre devrait naître plus tôt ?
4. **Le chapeau Empathy Guide — coaching d'entretien en temps réel.** Ma réserve initiale : coacher en direct suppose que l'agent est dans la pièce pendant l'entretien, et ce n'est pas notre modèle — nous produisons un guide, puis plus rien jusqu'au retour des notes. Les arguments contre cette réserve, à peser :
   - l'entretien peut se tenir **avec l'agent ouvert** sur un deuxième écran, ou se dérouler en plusieurs séances — la deuxième séance se prépare alors avec ce que la première a donné, et c'est bien du coaching à chaud ;
   - le laddering et ses signaux d'arrêt, l'incident critique, les techniques projectives face à une réponse gardée **sont déjà des consignes utilisables sans présence** : elles pourraient entrer dans le guide lui-même, en section « si la réponse reste en surface » plutôt que dans la liste de relances générique ;
   - nous avons un angle mort entre le guide produit et les notes revenues : rien ne se passe, et si l'entretien tourne mal, on l'apprend à l'analyse de source, quand la personne ne se reçoit plus une troisième fois ;
   - leur point le plus transposable : les **dynamiques difficiles** (interviewé qui propose des solutions, qui parle à la place d'un autre profil, qui reste sur l'abstrait) ont chez eux des stratégies de récupération nommées. Nos « pièges à éviter » les listent sans dire quoi faire quand le piège s'est refermé.
   - À analyser : une capacité « reprendre un entretien en cours ou préparer la séance suivante » — ou une section de récupération dans le guide, ce qui serait moins ambitieux et ne demanderait aucune présence.
5. **Paliers d'autorité et confidentialité du Meeting Analyst.** Nos sources n'ont pas de palier ; `S81` traite l'attribution, pas l'autorité. Et nous n'avons aucune règle de rétention ni d'anonymisation sur les transcriptions, alors que le dossier d'une initiative vit **dans le dépôt**, donc dans l'historique git — chez eux les fichiers de travail sont hors suivi et supprimés après le passage. À analyser en priorité sur ce dernier point : un verbatim nominatif commité l'est pour toujours.
6. **Le palier « Unresolved n'est pas une classe de preuve ».** Chez nous une question ouverte signale une exigence non résolue ; chez eux, un élément non résolu **ne compte jamais comme soutien** d'une conclusion. À vérifier : est-ce que `lint.mjs` l'applique vraiment, ou seulement le signale ?
