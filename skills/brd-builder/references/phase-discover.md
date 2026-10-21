# Phase Discover

**But** : accompagner l'utilisateur d'une idée floue vers une compréhension partagée du problème, en faisant apparaître puis en levant les zones d'ombre, et en collectant des besoins candidats rattachés à leurs sources.

La phase n'est pas linéaire. L'utilisateur peut à tout moment demander l'une des capacités ci-dessous. Si sa demande n'est pas claire, propose la capacité la plus utile vu l'état de session, en commençant par les zones d'ombre bloquantes.

---

## 0. Zones d'ombre

Une zone d'ombre est ce qu'on ne sait pas encore et qui pourrait fausser le BRD. C'est le fil conducteur de la phase : chaque capacité en fait apparaître ou en lève.

### Typologie

| Type (`type`) | Signal typique | Action habituelle pour la lever |
|---|---|---|
| `probleme_flou` | Symptômes décrits, mais cause ou impact non établis | Entretien avec qui subit le problème, données existantes |
| `partie_prenante_non_entendue` | Profil identifié, statut `à interroger` | Entretien |
| `profil_manquant` | Rôle probable jamais cité (support, juridique, exploitation…) | Question à l'utilisateur, puis cartographie |
| `succes_non_mesurable` | Objectif sans indicateur ni signal observable | Question au sponsor |
| `contradiction` | Deux sources disent l'inverse | Entretien croisé ou atelier |
| `hypothese_non_verifiee` | Affirmation reposant sur une hypothèse `H-xxx` sans source | Document, donnée ou entretien |
| `solution_deguisee` | Un « besoin » qui décrit un moyen | Remontée au besoin avec l'auteur |
| `perimetre_flou` | On ne sait pas si un sujet est inclus ou exclu | Décision du sponsor |
| `attendu_implicite` | Aucune source ne couvre ce que l'existant fait « sans que personne n'y pense » | Question directe, analyse de l'existant, observation |
| `arbitre_inconnu` | Un conflit d'intérêts n'a pas de décideur identifié | Question au sponsor, complétée dans `decision_rights` |

### Contradictions : qualifier avant de chercher un arbitre

Une `contradiction` porte toujours un sous-type (`subtype`) et la liste des parties en désaccord (`parties`). Le sous-type décide du traitement :

| `subtype` | Exemple | Qui lève la zone |
|---|---|---|
| `factuelle` | « 50 dossiers par jour » contre « 200 » | Personne ne décide : on cherche une preuve (donnée, document, observation) |
| `vocabulaire` | Le même mot n'a pas le même sens pour deux services | Le glossaire ; la définition est validée par le responsable du domaine |
| `reglementaire` | Un besoin contredit une règle imposée | La règle s'impose ; le juridique ou le DPO l'interprète |
| `interets` | Deux parties prenantes veulent des choses incompatibles | Un **arbitre** (`arbiter`), voir capacité 9 |

Seul le sous-type `interets` appelle une décision. Les autres se lèvent par une preuve ou une interprétation.

### Enregistrement

Pour chaque zone d'ombre, renseigne dans `state.yaml` : le type, une formulation sous forme de question, son origine, **qui** peut la lever (une partie prenante réelle `SH-xx` ou un rôle), l'action proposée, et si elle est bloquante.

Une zone d'ombre est **bloquante** si on ne peut pas formuler correctement les objectifs ou les exigences sans la lever.

Une zone d'ombre se termine de deux façons :
- `levée` : une réponse sourcée existe (indique la source) ;
- `assumée` : l'utilisateur décide consciemment de vivre avec (note la raison). Elle deviendra une hypothèse ou un risque dans le BRD.

---

## 1. Cadrage

À faire en premier en Discover. Pars du canevas d'opportunité rempli en Assess : ne repose pas ce qui y est déjà répondu. Couvre ces thèmes, par lots de 2 à 3 questions, dans cet ordre :

1. **Initiative** : son nom ; pourquoi maintenant (quel déclencheur) ?
2. **Problème** : que se passe-t-il aujourd'hui ? Quels symptômes ? Quel impact (temps, coût, risque, qualité) ? Depuis quand ?
3. **Succès** : à quoi verra-t-on que le problème est résolu ? Un indicateur pressenti suffit.
4. **Parties prenantes** : qui subit le problème, qui décide, qui finance, qui utilisera la solution, qui sera touché indirectement ? Et qui pourrait s'opposer au changement, ou y perdre quelque chose ?
5. **Périmètre** : qu'est-ce qui est clairement inclus, clairement exclu ? Une échéance ? Des contraintes déjà connues (légales, contractuelles, organisationnelles, budgétaires) ?
6. **Matériaux** : existe-t-il des documents, procédures, tickets, données, études ?
7. **Décision** : en cas de désaccord, qui tranche sur le périmètre et les objectifs ? sur les priorités ? sur la façon de travailler dans chaque processus touché ? Le sponsor a-t-il assez de poids pour faire accepter le changement à tous les services concernés ?

Règles :
- Adapte les relances aux réponses ; ne déroule pas la liste mécaniquement.
- Si une réponse décrit une solution, applique la remontée au besoin.
- Si l'utilisateur ne sait pas, enregistre une zone d'ombre du type correspondant et passe au thème suivant.

**Sortie** : `problem`, `success_signals`, `scope`, `constraints`, une première liste de `stakeholders`, une première carte `decision_rights` et les premières zones d'ombre dans `state.yaml`. Fais confirmer la carte des droits de décision par le sponsor (`confirmed_by`) ; tant qu'elle ne l'est pas, elle reste une hypothèse. Termine par une reformulation du problème en 2 à 3 phrases et demande si elle est juste. Propose ensuite un council en mode **préparation** (capacité 7).

---

## 2. Cartographie des parties prenantes

Déclencheur : après le cadrage, ou à la demande.

1. Pour chaque partie prenante, propose trois appréciations, que l'utilisateur corrige :
   - **impact** (`fort` | `faible`) : à quel point le changement touche son travail ou son pouvoir ;
   - **pouvoir** (`fort` | `faible`) : sa capacité à peser sur la décision ou sur l'adoption ;
   - **influence** (`positive` | `négative` | `neutre` | `inconnue`) : le sens dans lequel elle pèsera.

   Le quadrant d'implication se déduit du pouvoir et de l'impact :
   - pouvoir fort, impact fort → **impliquer** (entretien prioritaire) ;
   - pouvoir fort, impact faible → **satisfaire** (consulter sur les points clés, entretenir son intérêt) ;
   - pouvoir faible, impact fort → **consulter** (entretien ou atelier ; ce sont souvent les futurs soutiens, mais aussi ceux qui s'inquiètent de perdre la main) ;
   - pouvoir faible, impact faible → **informer**.
2. Note l'**attitude** de chacun, si possible avec un verbatim : envers le changement, envers le sponsor, envers la démarche elle-même. Une influence inconnue sur une partie prenante à fort pouvoir est une zone d'ombre.
3. **Les opposants sont des sources, pas des obstacles.** Une partie prenante d'influence négative a souvent autant à apprendre que les plus motivées : prévois un entretien individuel, pas un atelier collectif où elle se taira ou bloquera. Si elle a un pouvoir fort, propose un risque (`R-xx`, `related: [SH-xx]`).
4. **Vrais utilisateurs et représentants.** Renseigne `end_user` et `represents`. Si un groupe d'utilisateurs n'est entendu qu'à travers un représentant (chef de service, référent), crée une zone `partie_prenante_non_entendue` pour entendre au moins un utilisateur réel : les besoins opérationnels se recueillent au plus près du terrain.
5. Signale les profils typiquement oubliés et demande s'ils existent : utilisateurs finaux indirects, support, exploitation, juridique ou conformité, sécurité, finance, partenaires externes. Chaque profil plausible non confirmé devient une zone d'ombre `profil_manquant`.
6. Chaque partie prenante `impliquer` ou `consulter` au statut `à interroger` devient une zone d'ombre `partie_prenante_non_entendue`.
7. Propose un ordre d'interrogation, en priorisant celles qui peuvent lever des zones d'ombre bloquantes.
8. Complète `decision_domains` à partir de `decision_rights`, et vérifie que chaque décideur figure bien dans la cartographie.

**Sortie** : `brd/<slug>/stakeholders.md` (tableau lisible) et `state.yaml` à jour.

---

## 3. Préparation d'un entretien

Déclencheur : « prépare l'entretien avec… » ou partie prenante au statut `à interroger`.

Produis `brd/<slug>/interviews/guide-<SH-xx>.md` avec :

1. **Objectif de l'entretien** : les zones d'ombre ouvertes dont cette partie prenante est le `ask_to`, en premier, puis ce qu'on doit apprendre de ce profil.
2. **Introduction** (à lire à l'interviewé) : le contexte, la durée (45 à 60 min par défaut), l'assurance qu'on cherche à comprendre son travail, pas à l'évaluer.
3. **Questions ouvertes**, 8 à 12, regroupées :
   - son rôle et une journée type ;
   - « racontez-moi la dernière fois que… » sur la situation problématique ;
   - ce qui lui fait perdre du temps, ce qui le frustre, ce qu'il contourne ;
   - comment il saurait que les choses vont mieux ;
   - les questions qui ciblent les zones d'ombre, formulées de façon ouverte et non orientée.
4. **Relances** utiles : « pouvez-vous me donner un exemple ? », « que se passe-t-il ensuite ? », « pourquoi est-ce important ? ». Ajoute quelques questions choisies dans `references/elicitation-patterns.md` (section 4) : besoins exprimés en négatif, exceptions, priorités, confrontation anonymisée. Rappelle à l'intervieweur la consigne du silence avant de relancer.
5. **Pièges à éviter** : proposer une solution, poser des questions fermées ou orientées, laisser l'interviewé parler à la place d'un autre profil.
6. **Clôture** : qu'aurions-nous oublié ? qui d'autre faudrait-il interroger ? Peut-on revenir vers lui ? Annonce le retour de synthèse qu'il recevra.

Indique en fin de guide, pour l'intervieweur seulement, la correspondance question → `ZO-xxx`. Ne suggère aucune solution.

---

## 4. Analyse d'une source (notes, transcription, document)

Déclencheur : l'utilisateur fournit un contenu ou un fichier.

1. Enregistre la source : attribue un `SRC-xxx`, son type, sa date, la partie prenante concernée. Demande les informations manquantes.
2. Extrais, en citant à chaque fois l'emplacement exact (ligne, horodatage ou paragraphe) :
   - les **irritants** (ce qui ne va pas aujourd'hui) ;
   - les **besoins candidats**, formulés côté métier (« pouvoir… », « éviter que… ») ;
   - les **verbatims** marquants, courts et fidèles ;
   - les **solutions évoquées**, notées à part ;
   - les **règles métier**, explicites (procédure, texte) ou tacites (« chez nous, on ne… jamais »), enregistrées comme `RG-xxx` au statut `proposé` avec leur source ; ce ne sont pas des besoins.
3. **Applique les trois filtres** de `references/elicitation-patterns.md` (section 2) : généralisations, omissions, distorsions. Chaque occurrence devient une relance pour la même personne ou une zone d'ombre. Signale aussi ce qui semble aller de soi pour l'interlocuteur et qu'il n'a pas décrit : candidat `attendu_implicite`.
4. **Zones d'ombre levées** : pour chaque zone ouverte à laquelle la source répond, propose de la passer à `levée` en citant l'emplacement.
5. **Nouvelles zones d'ombre** : contradictions avec les sources existantes, affirmations non étayées, profils cités mais inconnus, sujets dont l'appartenance au périmètre n'est pas claire.
6. Signale les **convergences** (un besoin confirmé par plusieurs sources).
7. Présente le résultat, laisse l'utilisateur corriger, puis enregistre. Passe le statut de la partie prenante à `interrogée`. Lance `node <chemin-du-skill>/scripts/lint.mjs brd/<slug>/state.yaml --id <BC créés>` et signale les quantificateurs absolus détectés.
8. **Retour à la source** : propose une synthèse courte à renvoyer à la personne interrogée (section 6 de `references/elicitation-patterns.md`) et passe `feedback` à `envoyé` quand l'utilisateur l'a envoyée.

Ne reformule jamais un verbatim au point d'en changer le sens. En cas de doute sur l'interprétation, crée une zone d'ombre plutôt qu'un besoin.

---

## 5. Atelier Event Storming

**Avant l'atelier** — produis `brd/<slug>/workshops/brief-<date>.md` :
- l'objectif de l'atelier et les zones d'ombre qu'il doit aider à lever (en priorité `contradiction` et `probleme_flou`) ;
- le périmètre du processus à explorer ;
- les invités proposés, en visant la diversité des points de vue ;
- le déroulé « Big Picture » : événements en vrac, mise en ordre chronologique, acteurs et systèmes, points de friction (hotspots), opportunités ;
- le matériel et la durée (2 à 3 h par défaut).

**Après l'atelier** — l'utilisateur fournit une photo décrite, un export ou des notes. Traite-le comme une source (capacité 4), plus :
- reconstitue le **processus actuel** comme une suite d'événements au passé (« commande reçue », « dossier validé »), enregistrée dans `current_process` ;
- transforme chaque **hotspot** en zone d'ombre ou en besoin candidat ;
- enregistre les **règles métier** apparues comme `RG-xxx` au statut `proposé`, avec l'atelier pour source.

---

## 6. Point d'étape

Déclencheur : à la demande, à la reprise d'une session, ou tous les 3 à 4 échanges significatifs.

Présente en quelques lignes :
- le problème tel que formulé actuellement ;
- les parties prenantes interrogées / restantes ;
- le nombre de besoins candidats et ceux confirmés par plusieurs sources ;
- les zones d'ombre ouvertes, regroupées par type, les bloquantes en premier ;
- **une** prochaine action recommandée, choisie pour lever le plus de zones d'ombre bloquantes.

---

## 7. Council de lentilles

Déclencheur : proposé après le cadrage (mode **préparation**) et avant la fin de la phase (mode **couverture**), ou à la demande. Ne le lance qu'avec l'accord de l'utilisateur.

Suis le protocole de `references/council.md`. Rappel essentiel : le council produit des **zones d'ombre candidates**, jamais des besoins, et ne remplace jamais un entretien.

---

## 7 bis. Contraintes d'environnement

Les conditions réelles d'usage expliquent souvent pourquoi une solution évidente ne marchera pas. Pour chaque groupe d'utilisateurs, cherche, de préférence par l'observation (capacité 8) :

- **physique** : bruit, lumière, mains occupées, gantées ou mouillées, position (debout, en mouvement), espace ;
- **matériel** : appareils réellement disponibles, partagés ou personnels, état du réseau, zones sans connexion ;
- **temporel** : temps disponible pour la tâche, interruptions, pics d'activité, horaires (nuit, week-end) ;
- **humain** : stress, urgence, fatigue, niveau de lecture et de langue, handicap ;
- **organisationnel** : qui d'autre intervient, ce qui se passe quand l'outil n'est pas disponible.

Enregistre chacune dans `constraints` avec `type: environnement`, sa source, et son **implication** (ce qu'elle interdit ou impose). Une contrainte d'environnement supposée sans observation est une hypothèse. Elles passent au PRD comme contraintes et nourrissent les exigences non fonctionnelles de contexte d'usage.

---

## 8. Observation

Déclencheur : zone d'ombre `attendu_implicite`, `probleme_flou` sur un processus opérationnel, ou contradiction `factuelle` sur la façon dont le travail est fait.

Prépare un plan d'observation, puis traite les notes comme une source de type `observation`, en suivant la section 5 de `references/elicitation-patterns.md`. Mets en avant les contournements, les outils parallèles et les écarts entre la procédure décrite et la pratique observée : chacun est un besoin candidat, une règle tacite ou une zone d'ombre.

---

## 9. Traiter un conflit d'intérêts

Déclencheur : une zone `contradiction` de sous-type `interets`.

1. **Trouve l'arbitre** dans `decision_rights` : le domaine du conflit (périmètre, priorités, un processus, une règle). Retiens le plus petit niveau qui a autorité sur toutes les parties en désaccord : deux personnes d'un même service relèvent de leur responsable ; deux services relèvent du sponsor. L'arbitre n'est **jamais** partie au conflit. Renseigne `arbiter`.
2. Si aucun décideur n'est identifié, crée une zone `arbitre_inconnu`, bloquante, adressée au sponsor.
3. **Prépare la note de décision**, enregistrée comme `DD-xx` au statut `proposé` : la question, au moins deux options, et pour chacune ses impacts — qui serait insatisfait, existe-t-il un autre moyen d'obtenir le même effet, quel risque prend-on en l'écartant. Tu présentes les options, tu ne recommandes pas : tu es facilitateur, ni décideur ni propriétaire du sujet.
4. Quand l'utilisateur déclare la décision rendue, renseigne `decision`, `rationale`, `decided_by` (l'arbitre, ou l'escalade s'il n'a pas tranché) et la date, passe `DD-xx` à `validé` et la zone à `levée` avec `resolution: DD-xx`. N'enregistre jamais une décision déduite d'un silence ou d'un retour indirect.
5. Si le décideur formel risque d'être contredit par une influence informelle (une personne que tout le monde consulte, un responsable d'un autre service), propose un risque : une décision contournée sera défaite plus tard.

---

## 10. Importer une synthèse de design thinking (hve-core)

Si l'équipe a mené une démarche de design thinking avec le DT Coach de hve-core, suis `references/hve-dt-bridge.md` : `scripts/ingest-dt-handoff.mjs` lit son résumé de passage et propose sources, hypothèses, contraintes et zones d'ombre, en reprenant ses marqueurs de confiance. Rien n'est accepté sans validation.

---

## Fin de la phase

Quand ces conditions te semblent réunies, **propose** le passage à Define, sans le décider :

- le problème est formulé et l'utilisateur l'a confirmé ;
- aucune zone d'ombre bloquante n'est `ouverte` (elles sont `levées` ou `assumées`) ;
- les parties prenantes des quadrants « impliquer » et « consulter » ont été entendues, ou leur absence est assumée ;
- au moins un signal de succès par objectif pressenti ;
- `decision_rights` désigne un décideur, confirmé par le sponsor, au moins pour le périmètre, les objectifs et les priorités ;
- aucune contradiction `interets` n'est ouverte sans arbitre ;
- pour chaque processus touché, la question des attendus implicites a été posée (zone `attendu_implicite` levée, assumée, ou sans objet) ;
- les besoins candidats sont sourcés ;
- un council en mode couverture a été proposé ;
- la **porte de synthèse** est passée : avec l'utilisateur, juge chacune des cinq dimensions (`synthesis_check`) — **fidélité** (la synthèse reflète les sources, pas des suppositions), **couverture** (toutes les parties prenantes concernées sont représentées, y compris les silencieuses), **robustesse** (chaque besoin retenu repose sur plusieurs sources ; `lint.mjs` signale les besoins à source unique), **actionnabilité** (le problème est assez net pour guider la suite), **alignement** (les participants se reconnaîtraient dans la synthèse). Une dimension faible se corrige (retour aux sources, entretien complémentaire) ou s'assume avec une raison. Idée reprise de la validation de synthèse en cinq dimensions du design thinking de hve-core ;
- `lint.mjs` a été lancé sur l'état ; les avertissements restants sont listés à l'utilisateur, sans bloquer.

Liste ce qui manque encore, s'il y a lieu. Rappelle que les zones d'ombre `assumées` deviendront des hypothèses ou des risques dans le BRD. Si l'utilisateur accepte, passe `phase: define` dans `state.yaml` et note la date.
