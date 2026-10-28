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

Une zone d'ombre est **bloquante** si elle empêche l'étape suivante de **commencer** — pas si elle la rend moins sûre. Le test est concret : nomme l'étape, et dis ce qui s'y ferait de faux si on la menait sans l'avoir levée. Si tu ne peux pas le dire, elle n'est pas bloquante : elle est importante, et son type suffit à la faire remonter, puisque `ask-five.mjs` classe par ce que la zone coûte.

Le critère a été resserré après deux dossiers réels. « On ne peut pas formuler correctement les objectifs sans la lever » est vrai par construction au début d'une phase : **18 bloquantes sur 25**. Sur le dossier suivant, où aucune consigne ne définissait le mot, **0 sur 21**. Un drapeau qui vaut tout ou rien ne classe rien — il est donc sorti du score, et ne sert plus qu'à une chose, sérieuse : **une bloquante ouverte interdit la sortie de phase**.

Une zone d'ombre se termine de deux façons :
- `levée` : une réponse sourcée existe (indique la source) ;
- `assumée` : l'utilisateur décide consciemment de vivre avec (note la raison). Elle deviendra une hypothèse ou un risque dans le BRD.

---

## 1. Cadrage

À faire en premier en Discover. Pars du canevas d'opportunité rempli en Assess : ne repose pas ce qui y est déjà répondu.

**Qui te répond a été demandé en Assess** — nom et fonction de chaque personne présente (`references/phase-assess.md`). Chaque nom recueilli là entre ici dans la cartographie (capacité 2), où c'est toi qui déduis la qualité : en son nom, pour un groupe, en relayant un absent. Redemande-le seulement si le cadrage reprend après une pause, ou si rien dans l'état ne dit qui a répondu : la salle a pu changer sans que rien ne le dise. La règle d'enregistrement ne bouge pas — une réponse par répondant, sauf s'ils sont d'accord (section 1 bis de `references/elicitation-patterns.md`).

Couvre ensuite ces thèmes dans cet ordre, **une question à la fois** — un thème qui demande un récit n'en supporte aucune autre à côté, et le silence après lui fait venir la précision (`references/questions.md`). Et dès que la salle compte plus d'une personne, **chaque question nomme celle à qui elle est posée** : le destinataire est déjà écrit, c'est l'`ask_to` de la zone que la question sert à lever. Posée à « tu », la réponse revient sans voix et l'attribution se redemande après coup.

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

**Sortie** : `problem`, `success_signals`, `scope`, `constraints`, une première liste de `stakeholders`, une première carte `decision_rights` et les premières zones d'ombre dans `state.yaml`. Fais confirmer la carte des droits de décision par le sponsor (`confirmed_by`) ; tant qu'elle ne l'est pas, elle reste une hypothèse. Termine par une reformulation du problème en 2 à 3 phrases et demande si elle est juste. Quand la reformulation est confirmée, **le cadrage n'est pas fini** : lance un council en mode **préparation** (capacité 7) avant de préparer le moindre entretien. Le council est ton outil, pas une étape du dossier : il ne se demande pas, et il ne s'annonce pas non plus. Ses questions arrivent à l'utilisateur comme les autres zones d'ombre, sans que tu nommes ni le council, ni les lentilles, ni le mode.

---

## 2. Cartographie des parties prenantes

Déclencheur : après le cadrage, ou à la demande.

Les noms et fonctions recueillis au cadrage (section 1 bis de `references/elicitation-patterns.md`) entrent ici : ce sont des gens réels, d'une meilleure source que « qui subit le problème ? ». Qui était dans la pièce sans faire le travail dont on parle le dit aussi — et c'est le point 6 qui en tire la zone d'ombre.

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
4. **Vrais utilisateurs et représentants.** Renseigne `end_user` et `represents`. Si un groupe d'utilisateurs n'est entendu qu'à travers un représentant (chef de service, référent), crée une zone `partie_prenante_non_entendue` pour entendre au moins un utilisateur réel : les besoins opérationnels se recueillent au plus près du terrain. **Et la représentation s'écrit dans les deux sens** : `represents` nomme le groupe, en prose, du côté du représentant ; `represented_by` nomme qui répond pour elle, du côté de la personne représentée, par son identifiant. Sans le second, « chaque fonction a un représentant » — une phrase que l'utilisateur peut avoir dite deux fois — n'a aucun endroit où se poser, et le dossier finit par écrire le contraire. Ce que la représentation ne fait pas, c'est fermer : elle dit qui répond, pas que la voix a été entendue (S94, et S83). **À la naissance d'une partie prenante** — souvent au milieu d'une phrase, comme le comptable que personne n'avait cité —, propose `represented_by` depuis la salle au lieu de le demander : « parle pour elle » est une qualité, et les qualités se proposent pour être corrigées (section 1 bis). Puis formule dans sa zone `partie_prenante_non_entendue` **ce qu'on attend d'elle** : un fait, une règle ou une pratique se relaient ; un vécu et un geste ne se rapportent pas, et c'est cela qui dit si un représentant suffit.
5. Signale les profils typiquement oubliés et demande s'ils existent : utilisateurs finaux indirects, support, exploitation, juridique ou conformité, sécurité, finance, partenaires externes. Chaque profil plausible non confirmé devient une zone d'ombre `profil_manquant`.
6. Chaque partie prenante `impliquer` ou `consulter` au statut `à interroger` devient une zone d'ombre `partie_prenante_non_entendue`. Elle se ferme quand **aucune zone ouverte ne nomme plus cette personne en `ask_to`** — pas quand son statut passe à `interrogée`. `interrogée` dit qu'on l'a entendue une fois, pas qu'on lui a tout demandé : au premier dossier réel, le directeur avait répondu dans le fil du cadrage et sept zones le nommaient encore.
7. Propose un ordre d'interrogation, en priorisant celles qui peuvent lever des zones d'ombre bloquantes.
8. Complète `decision_domains` à partir de `decision_rights`, et vérifie que chaque décideur figure bien dans la cartographie.

**Sortie** : `brd/<slug>/stakeholders.md` (tableau lisible) et `state.yaml` à jour.

---

## 3. Préparation d'un entretien

Déclencheur : « prépare l'entretien avec… », ou partie prenante au statut `à interroger` **qui n'est pas dans l'échange**.

**Pas de guide pour quelqu'un qui est là.** Si la personne est présente — le tour de table du cadrage le dit, et `present` le consigne sur la source —, pose-lui ses questions dans le fil, une par une, selon la section 1 bis de `references/elicitation-patterns.md`. Ses réponses deviennent des sources immédiatement : il n'y a pas de notes à faire revenir, donc pas d'analyse de source (capacité 4). Le guide est pour l'absent, et c'est ce qui le rend utile : il part dans les mains d'un humain qui mènera l'entretien sans toi.

**Un guide se périme quand son absent arrive.** Le guide est un fichier ; l'état n'en sait rien. Au premier dossier réel, celui du directeur a été écrit un jour où il était absent — à raison — et le lendemain il a répondu en direct, les deux décisions que le guide annonçait ont été rendues, et la prochaine action disait encore « mener les entretiens préparés ». Dès que la personne est dans la salle, **retire son guide et réécris `session.next_action`** : `lint.mjs` le signale (S96) en comparant les guides du dossier à la salle du dernier échange.

**Le council en mode préparation passe avant.** Son objet est précisément de trouver les questions à mettre dans les guides : fait après, il arrive quand l'entretien est passé, et une partie prenante ne se reçoit pas trois fois. Si le council de préparation n'a pas tourné pour cette initiative (`council_runs`), lance-le d'abord.

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

1. Enregistre la source : attribue un `SRC-xxx`, son type, sa date, la partie prenante concernée. Demande les informations manquantes. La partie prenante d'une source est **celle qui a parlé**, pas celle dont on rapporte les besoins : quand le demandeur parle au nom du directeur, la source est à son nom, et le directeur reste `à interroger` (`lint.mjs`, S81). Si le demandeur n'est pas encore dans la cartographie, ajoute-le : c'est une partie prenante, et souvent la seule entendue au départ. Quand la source vient d'une réunion ou d'un atelier où plusieurs personnes ont répondu, ce n'est pas une source mais **une par voix entendue**, chacune avec son `who` (section 1 bis de `references/elicitation-patterns.md`).
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

**Après l'atelier** — l'utilisateur fournit une photo décrite, un export ou des notes. Traite-le comme une source (capacité 4) — donc une source par voix entendue, pas une seule pour l'atelier —, plus :
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
- **une** prochaine action, choisie pour lever le plus de zones d'ombre bloquantes.

Le point d'étape **n'attend rien** : il se lit. La prochaine action qu'il nomme, tu la **fais** —
ni « je recommande », ni « dites-moi si j'enchaîne ». Elle ne se demande que dans deux cas : elle
écrit hors du dossier de l'initiative, ou elle engage une décision qui revient à un décideur
désigné. Dans le second, c'est cette décision que tu poses, jamais la permission de travailler
(`references/questions.md`).

---

## 7. Council de lentilles

Déclencheur : **prescrit** après le cadrage (mode **préparation**) et avant la fin de la phase (mode **couverture**). Deux moments, deux lancements, sans rien à demander.

**C'est ton outil, pas une étape du dossier.** Le council sert à te faire voir ce que tu n'as pas envisagé : il ne se propose pas, et il ne s'annonce pas. L'utilisateur n'a pas à savoir quand tu y fais appel, ni combien de lentilles ont tourné, ni dans quel mode. Les mots « council », « lentille » et « mode » n'apparaissent pas dans ce que tu lui écris — ils vivent dans l'état (`council_runs`, `origin: council:<lentille>`).

Ses questions deviennent des zones d'ombre, et se posent **comme les autres**, mêlées à elles et classées par impact par `ask-five.mjs`. L'utilisateur répond à des questions sur son métier ; il n'a jamais à trier une liste de questions sur la méthode.

**Une exception, et une seule** : quand une question du council met en cause quelque chose que l'utilisateur a **déjà validé** — un signal de succès, une reformulation confirmée, une décision enregistrée —, dis-le explicitement. Tu ne retires pas sa validation sur la foi d'une lentille, et tu ne la laisses pas debout en silence : tu lui montres la contradiction et c'est lui qui tranche. Là, ce n'est plus le mécanisme qui remonte, c'est la conséquence.

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
- les besoins candidats sont sourcés, et chacun dit **de qui** il est le besoin (`concerns`) : un besoin formulé pour quelqu'un qu'on n'a pas entendu se signale au lieu de se fondre dans le lot (S95) ;
- un council en mode couverture a été passé, et ses questions enregistrées comme zones d'ombre ;
- la **porte de synthèse** est passée : avec l'utilisateur, juge chacune des cinq dimensions (`synthesis_check`) — **fidélité** (la synthèse reflète les sources, pas des suppositions), **couverture** (toutes les parties prenantes concernées sont représentées, y compris les silencieuses), **robustesse** (chaque besoin retenu repose sur plusieurs sources ; `lint.mjs` signale les besoins à source unique), **actionnabilité** (le problème est assez net pour guider la suite), **alignement** (les participants se reconnaîtraient dans la synthèse). Une dimension faible se corrige (retour aux sources, entretien complémentaire) ou s'assume avec une raison. Idée reprise de la validation de synthèse en cinq dimensions du design thinking de hve-core ;
- `lint.mjs` a été lancé sur l'état ; les avertissements restants sont listés à l'utilisateur, sans bloquer.

Lance `status.mjs` : il donne les phases passées, celle en cours, et le compte des conditions de cette porte. Présente-le, liste ce qui manque — puis **pose la question dans tous les cas**, avec l'outil : passer en Define, ou s'arrêter là. S'il manque des conditions, les deux options sont « s'arrêter là » et « continuer sur ce qui manque », jamais « passer la porte » (`references/questions.md`). Rappelle que les zones d'ombre `assumées` deviendront des hypothèses ou des risques dans le BRD. Si l'utilisateur accepte, passe `phase: define` dans `state.yaml` et note la date.

## 11. Constitution du produit

Si `.tizi/constitution.yaml` existe, lis ses principes actifs au cadrage et note ceux qui s'appliquent à l'initiative (`principles_applicable`) : on ne repose pas une question que le produit a déjà tranchée.

Quand une contrainte découverte dépasse l'initiative (« ça vaut pour tout le produit, pas seulement ici » : secret médical, hébergement des données de santé, validation clinique des textes), propose-la comme **principe candidat** : `node <chemin-du-skill>/scripts/constitution.mjs . --proposer --texte "… doit …" --type doit --raison "…" --controle automatique|test|revue --par "<nom>" --initiative <slug>`. Le BRD ne modifie jamais la constitution : seul son responsable accepte un principe. Une exigence qui contredit un principe actif demande une dérogation nommée ou un amendement (S79).
