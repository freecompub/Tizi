# Notes — la conduite des entretiens chez hve-core

Dépôt `microsoft/hve-core`, lu le 25 octobre 2026 (dernier push le même jour). Fichiers lus : `.github/agents/project-planning/brd-builder.agent.md`, `.github/skills/design-thinking/dt-methods/references/method-02-research.md` et `method-02-deep.md`, `.github/agents/project-planning/meeting-analyst.agent.md`, `.github/skills/design-thinking/ux-artifacts/references/evidence-model.md`.

Objet de la note : recenser ce que hve-core fait des entretiens, le comparer à ce que Tizi fait aujourd'hui, et poser les candidats d'emprunt — **à analyser, rien n'est décidé ici**.

## Où vivent les entretiens

Trois endroits distincts, et le premier est une surprise :

- **Le BRD Builder les prescrit sans les demander.** *Correction d'une première lecture de cette note, qui concluait « il n'en fait pas » depuis les 268 lignes de l'agent seul : c'est faux.* Les entretiens de parties prenantes sont bien prescrits, mais dans la référence partagée du skill `requirements-author` — `references/_shared/stakeholder-analysis.md` et `mendelow-matrix.md`, où la grille Pouvoir/Intérêt donne une cadence d'engagement par quadrant (`Manage Closely` → « Direct interview in Discover », `Keep Informed` → « Group interview or async input in Discover »). Ce que l'agent n'a pas, c'est l'**appelant** : son instruction Discover invoque la grille « **to classify** each identified party and **to detect ownership gaps** », et la seule action prescrite quand une voix manque est de demander son **nom** à l'utilisateur (« ask for it directly rather than proceeding »). Sa porte de sortie exige « stakeholder ownership is explicit » — des noms, pas des voix entendues. Son élicitation reste donc un questionnaire en chat (section `Questioning Strategy`), et sa seule ouverture vers l'extérieur est l'activation d'un segment de recherche RPI — documentaire — sur un manque de preuve nommé. La cadence d'entretien est écrite et rien ne la lit : par notre propre test (`aucun script livré sans appelant`), c'est une prescription morte.
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

## Le cas de la réunion métier (DSI)

Question posée le 26 octobre 2026 : en DSI, le recueil se fait généralement en réunion avec le métier ;
l'approche hve y est-elle mieux adaptée ? Réponse courte : non, mais elle désigne un manque réel et plus
petit.

**Ce que Tizi a déjà pour ce cas.** `phase-discover.md:150-160` — capacité 5, atelier : un brief avant
(`workshops/brief-<date>.md`, les zones d'ombre que l'atelier doit lever, les invités, le déroulé), et
après, les notes traitées comme une source (capacité 4) plus le processus actuel, les hotspots en zones
d'ombre et les règles métier en `RG-xxx`. Et `elicitation-patterns.md:§2` s'appelle littéralement
« Trois filtres pour lire des notes ou une transcription ». Le CR de réunion entre et produit de la
matière tracée.

**Où le scénario DSI casse hve plutôt que Tizi.** Le métier dans la salle est presque toujours un chef
de service ou un référent, pas l'agent qui saisit — la pathologie numéro un de ces réunions.
`phase-discover.md:92` ouvre alors une `partie_prenante_non_entendue` pour entendre au moins un
utilisateur réel, et elle ferme la phase. Chez hve le référent est classé dans la grille et Discover sort
sur « ownership is explicit » : un BRD peut sortir d'un seul CR avec le chef de service. Les deux autres
pathologies — le consensus de salle qui lisse les désaccords, la solution déjà choisie à l'entrée — ont
chez nous `contradiction` et `conflit_interets` au poids 5 et le type `solution_deguisee`. Les paliers
d'autorité du Meeting Analyst font quelque chose de voisin mais pas la même chose : ils **tranchent par
le rang** (le palier 1 vaut exigence telle quelle) là où nous enregistrons que deux parties veulent
l'inverse. Tranché par le rang, le désaccord disparaît du document ; en zone d'ombre, il remonte au
décideur désigné. Enfin, la question proprement DSI — qui arbitre le périmètre, métier, DSI ou sponsor —
a chez nous `decision_rights`, `arbitre_inconnu` au poids 4 et `decided_by`/`decided_on` ; chez eux les
patterns RACI sont dans une référence invoquée « to classify ».

**Ce qui est concédé.** L'attribution **par énoncé**. Notre capacité 5 suppose un atelier que l'agent a
aidé à préparer ; un CR qui arrive froid tombe sur la capacité 4, où le `who` est le document, pas chaque
phrase. Dans une réunion à huit, c'est la seule chose qui compte. Et leur séparation d'agents est plus
propre que la nôtre : un artefact pour « transcription → énoncés attribués », un autre pour « énoncés →
document » ; nous confondons les deux dans Discover.

**Et le fond du désaccord**, à garder en tête quand on comparera à nouveau : hve paraît mieux adapté
parce qu'il **demande moins**. Une réunion entre, un document sort. Tizi prend la même réunion et répond
que le métier présent ne parle pas pour les agents. Ce n'est pas une meilleure adaptation, c'est moins de
frottement — et les projets DSI qui échouent sont ceux où personne n'est allé au-delà du référent. Le
deuxième dossier réel est exactement ce scénario (neuf sources d'un entretien du directeur relayé en
direct par un membre du bureau) : `ZO-002` a consigné que personne du terrain n'avait parlé, et Frame est
sorti par « absence assumée ». C'est le bon comportement : la dette est nommée, visible, non bloquante.

## Candidats d'emprunt — à analyser

Priorité revue le 26 octobre 2026 après la question DSI : **le candidat 7 passe devant**, et il absorbe
la moitié utile du 5 (l'attribution ; la rétention du 5 reste autonome et urgente).

1. **Saturation et audit de biais.** Notre dimension `couverture` compte `interrogée / total` : un compte qui récompense le volume et ne dit rien de la diversité. Leurs deux questions — « qui manque ou est sous-représenté ? » et « les dernières séances découvrent-elles encore ? » — portent sur ce que le compte ne voit pas. C'est le trou que le premier dossier réel a montré. À analyser : deux dimensions de plus, ou deux questions posées dans la dimension existante.
2. **Un chemin pour les notes brutes.** Nous prescrivons `brd/<slug>/interviews/guide-<SH-xx>.md` mais **aucun chemin pour ce qui en revient** : seul `ingest-dt-handoff.mjs` écrit dans `brd/<slug>/sources/`, et `phase-discover.md` ne nomme ce répertoire nulle part. Leur convention — un fichier par séance, réflexions séparées du brut, thématisation interdite avant la synthèse — rendrait vérifiable la citation d'emplacement que notre capacité 4 exige déjà.
3. **L'ordre observation-puis-entretien.** Chez eux, séquence. Chez nous, l'observation est la capacité 8, déclenchée **après** par une zone d'ombre `attendu_implicite` ou une contradiction factuelle. Leur argument se défend : on ne sait quoi demander qu'après avoir vu. À analyser : est-ce un ordre à prescrire, ou le signe qu'une zone d'ombre devrait naître plus tôt ?
4. **Le chapeau Empathy Guide — coaching d'entretien en temps réel.** Ma réserve initiale : coacher en direct suppose que l'agent est dans la pièce pendant l'entretien, et ce n'est pas notre modèle — nous produisons un guide, puis plus rien jusqu'au retour des notes. Les arguments contre cette réserve, à peser :
   - l'entretien peut se tenir **avec l'agent ouvert** sur un deuxième écran, ou se dérouler en plusieurs séances — la deuxième séance se prépare alors avec ce que la première a donné, et c'est bien du coaching à chaud ;
   - le laddering et ses signaux d'arrêt, l'incident critique, les techniques projectives face à une réponse gardée **sont déjà des consignes utilisables sans présence** : elles pourraient entrer dans le guide lui-même, en section « si la réponse reste en surface » plutôt que dans la liste de relances générique ;
   - nous avons un angle mort entre le guide produit et les notes revenues : rien ne se passe, et si l'entretien tourne mal, on l'apprend à l'analyse de source, quand la personne ne se reçoit plus une troisième fois ;
   - leur point le plus transposable : les **dynamiques difficiles** (interviewé qui propose des solutions, qui parle à la place d'un autre profil, qui reste sur l'abstrait) ont chez eux des stratégies de récupération nommées. Nos « pièges à éviter » les listent sans dire quoi faire quand le piège s'est refermé.
   - À analyser : une capacité « reprendre un entretien en cours ou préparer la séance suivante » — ou une section de récupération dans le guide, ce qui serait moins ambitieux et ne demanderait aucune présence.
5. **Paliers d'autorité et confidentialité du Meeting Analyst.** Nos sources n'ont pas de palier ; `S81` traite l'attribution, pas l'autorité. Et nous n'avons aucune règle de rétention ni d'anonymisation sur les transcriptions, alors que le dossier d'une initiative vit **dans le dépôt**, donc dans l'historique git — chez eux les fichiers de travail sont hors suivi et supprimés après le passage. À analyser en priorité sur ce dernier point : un verbatim nominatif commité l'est pour toujours. **Et le tour de table du candidat 7 en fait un second endroit** : noms et fonctions des personnes présentes, dans `state.yaml`, donc dans l'historique git. Le BRD le faisait déjà par `stakeholders`, mais nous n'avons toujours aucune règle de rétention ni d'anonymisation.
6. **Le palier « Unresolved n'est pas une classe de preuve ».** Chez nous une question ouverte signale une exigence non résolue ; chez eux, un élément non résolu **ne compte jamais comme soutien** d'une conclusion. À vérifier : est-ce que `lint.mjs` l'applique vraiment, ou seulement le signale ?

7. **Déclarer la pièce, et faire l'entretien en direct.** — *écrit sur la branche `entretien-en-reunion` :
   section 1 bis de `elicitation-patterns.md` (commune BRD/PRD), appelée par le cadrage de
   `phase-discover.md` et le mini-cadrage de `phase-frame.md`, plus une source par voix entendue aux
   capacités 4 et 5 et un test de motif. Ne restent ouverts que les quatre points listés en fin de
   candidat.* Proposition de l'utilisateur, 26 octobre 2026 :
   en première phase (BRD Discover, PRD Frame mode autonome), demander qui est présent et **en quelle
   qualité**, puis poser les questions ciblées directement — l'entretien se fait là, au lieu de produire
   un guide et d'attendre le retour des notes. Mieux que le candidat 5 : le Meeting Analyst
   **reconstitue** l'autorité après coup depuis une transcription ; déclarer la pièce à l'entrée donne la
   même attribution gratuitement et rend `partie_prenante_non_entendue` détectable **avant la première
   réponse**.
   - **La forme de la question décide de tout.** Pas « êtes-vous en réunion ? » — en préambule, c'est un
     questionnaire avant le travail, ce qu'on vient de retirer. Mais « qui me parle, et pour qui
     parle-t-il » est le cœur de Discover (`end_user`, `represents`, les quadrants), et elle est **due
     même à une seule personne** : un chef de service seul déclenche `phase-discover.md:92` exactement
     comme une salle de huit. Aujourd'hui Tizi demande qui subit le problème, jamais en quelle qualité on
     lui répond — c'est le trou. Le deuxième dossier réel le montre : la qualité (« relayé en direct par
     un membre du bureau ») était consignée en texte libre dans `who`, après coup.
   - **Un tour de table, pas une question molle** — durci par l'utilisateur le 26 octobre 2026 : demander
     **nom et fonction** de chaque personne présente, et non « qui te répond et pour qui ». La différence
     est de nature : « je suis avec l'équipe » répond à la question molle, pas à celle-là. Une liste se
     compte, se compare à la cartographie, et rattache chaque réponse à un nom — la première produit de la
     prose, la seconde de la donnée. Deux conséquences :
     - **la détection se résout par construction.** Plus besoin de guetter « on pense que », « Marie dit
       que », l'acteur absent de la section 2 : la question a établi une liste, et « on » n'est plus une
       réponse recevable. Il ne reste utile qu'un signal, celui que le tour de table ne couvre pas — la
       réponse qui **contient déjà sa divergence** (« 100, enfin plutôt 150 selon Paul »).
     - **un nom et une fonction sont une partie prenante** : le tour de table est le début de la
       cartographie, plus tôt et mieux sourcé que « qui subit le problème ? », et il rend l'absence visible
       (quatre personnes, aucune qui fait le travail dont on parle).
     Trois contraintes : demander les **faits** (nom, fonction) et **déduire** la qualité pour la faire
     corriger, jamais faire classer ses collègues par l'utilisateur ; accepter une liste incomplète et ne
     rien bloquer dessus, parce qu'en réunion réelle elle arrive en morceaux ; et voir que les noms entrent
     dans git pour toujours (candidat 5, qui cesse d'être théorique).
   - **La configuration ne change pas pendant la session** — tranché par l'utilisateur le 26 octobre 2026 :
     elle ne se redemande qu'**à la reprise après une pause**, ou quand trop de temps a passé. Donc aucun
     signal à détecter en cours de route, et la question se raccroche à l'étape de reprise qui existe déjà
     (`references/sessions.md`, « À la reprise »). Elle vit au niveau de la **session** et non de la source
     — `sources[].who` garde l'attribution par énoncé. Reste à choisir *où* : dans `state.yaml`, un script
     peut la lire (voir le point suivant) ; dans le condensé de session, non.
   - **La cadence ne bifurque pas** — tranché le 26 octobre 2026, contre ce que je proposais. J'avançais
     qu'une salle de huit a besoin du bloc entier dans l'ordre pour ne pas s'arrêter au rythme de l'agent.
     L'argument inverse est plus fort : un bloc transforme la réunion en formulaire, et **ce qui se passe
     entre deux questions est la matière** — c'est là que les désaccords sortent. « Deux ou trois à la
     fois, une question ouverte se pose seule » est donc *plus* vrai dans une salle que dans un chat.
     `ask-five.mjs` garde sa phrase, et aucun script n'a besoin de connaître la pièce : elle peut vivre
     au niveau de la session, hors de `state.yaml`.
   - **Le lissage, et la règle qui le bloque.** Interroger une salle à travers l'utilisateur fait revenir
     les réponses agrégées (« environ 100 par semaine » quand le chef a dit 100, un agent 150 à la
     rentrée, et que le désaccord disparaît sans trace). Le direct est alors **pire** que des notes : avec
     un CR écrit, le 150 y serait encore. Règle tranchée le 26 octobre 2026, en deux cas selon la forme de
     la question :
     - **réponse libre** : l'agent prend en compte **toutes les réponses de chaque intervenant**, sauf
       s'ils sont d'accord ;
     - **choix multiples** : une réponse de plus — « les intervenants ne sont pas d'accord ».

     Ce que cette règle fait de mieux que « redemander qui a dit quoi » : elle **inverse le défaut**. Le
     pluriel devient l'état normal (n intervenants = n réponses) et fusionner devient un acte positif,
     sous condition. Elle tombe donc du bon côté quand on l'oublie — on garde trop de réponses, pas une
     seule lissée. Et elle n'a besoin d'aucun vocabulaire neuf : n réponses = n sources, chacune avec son
     `who` (`S81`), et les réponses divergentes donnent une `contradiction` dont le sous-type est déjà
     prévu (`factuelle` sur un fait, `interets` sur une envie, qui seule appelle un arbitre).

     **Les deux cas n'en font qu'un** — unifié le 26 octobre 2026 : cocher « ils ne sont pas d'accord »
     **déclenche le recueil de la réponse de chaque intervenant**, exactement comme la réponse libre. Le
     choix multiple n'a donc pas une n-ième option, il a une **sortie du formulaire** qui le ramène au cas
     général. Il n'y a plus qu'une règle à écrire dans les skills — *une réponse par intervenant, sauf
     s'ils sont d'accord* — là où deux règles parallèles auraient laissé l'agent prendre la plus commode.
     La réserve « ne doit pas être un terminus » tombe par construction : il n'existe plus d'état où la
     case reste cochée seule, puisque la cocher *est* le déclencheur. La bascule ouvre la `contradiction`
     avec ses `parties` et son `subtype`, que la typologie exige déjà.

     Ce qui reste à trancher :
     - **Le silence n'est pas un accord.** La condition de fusion est « sauf s'ils sont d'accord », et il
       reste à dire qui l'établit. Déclaré par l'utilisateur (« tout le monde était d'accord »), le lissage
       a seulement déménagé dans le mot *accord*. « Les trois ont répondu la même chose » et « personne n'a
       objecté » ne sont pas la même chose : le second est du silence, et dans une salle où le chef de
       service vient de parler, le silence de ses agents est prévisible — c'est le problème de départ, le
       référent qui parle pour le terrain. Parade minimale : la source dit **comment** l'accord a été
       établi (répondu / non contredit), le second se compte et peut rouvrir une
       `partie_prenante_non_entendue` quand la pièce déclarée contient une hiérarchie. Le DT Coach le dit
       en langage d'animation : « adresser les questions aux silencieux, confronter l'affirmation du
       dominant aux autres ».
     - **« Par intervenant » veut dire par répondant, pas par présent.** Au pied de la lettre, la règle
       donne 5 questions × 8 personnes = 40 sources pour une réunion. À écrire explicitement : les
       répondants d'une question donnée, deux ou trois en pratique.
     - **La portée du fermé doit rester bornée.** `references/questions.md` dit que la question
       d'élicitation « ne propose rien et ne vient pas accompagnée : une seule question ouverte, puis le
       silence » — une question fermée rend sa propre hypothèse. La règle s'applique là où le fermé existe
       déjà (la checklist, les décisions soumises à la salle), et ne sert pas d'invitation à fermer les
       questions d'élicitation.
     - Est-ce que « ils ne sont pas d'accord » mérite un frère **« personne ne sait »** ? Le premier est un
       constat sur les gens et ouvre une `contradiction` ; le second est un manque et ouvre une
       `hypothese_non_verifiee`. Les confondre perdrait la différence.
   - Portée : `brd/phase-discover.md` et `prd/phase-frame.md` ; la partie commune dans
     `elicitation-patterns.md`, hash-identique entre les deux.
