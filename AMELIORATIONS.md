# Améliorations — registre des pistes

Ce fichier tient ce qui est **évoqué mais pas encore tranché**, et l'état de ce qui l'a été. Les
constats d'audit, eux, vivent dans `evals/audit/` avec leur preuve : un constat est une chose
observée, une piste est une intention. Les deux ne se rangent pas au même endroit.

Chaque ligne dit son état : **faite** (avec sa date et sa branche), **ouverte** (vérifiée, avec sa
preuve), **écartée** (décidée contre, avec sa raison), **à trancher** (la question n'a pas de réponse
décidée). Une piste ne devient une issue qu'une fois décidée — sinon l'issue ne dit pas ce qu'il faut
faire. Et une piste écartée reste écrite : sans ça elle revient dans six mois comme une intention neuve.

Dernière vérification de ce registre : **25 octobre 2026**, en exécutant les scripts — depuis le
24 octobre, sur un dossier réel autant que sur les exemples.

Le troisième dossier réel est
[`freecompub/TestTizi`, branche `brd/inscriptions-soutien`](https://github.com/freecompub/TestTizi/tree/brd%2Finscriptions-soutien) :
BRD de la dématérialisation des inscriptions de la même association, phase Discover, 40 sources
**toutes porteuses de leur verbatim**, 57 zones d'ombre dont 29 levées, 4 risques, 8 besoins candidats
tous sourcés et portant leur `concerns`, un council de 37 questions proposées et 29 arbitrées sans
qu'aucune soit écartée sans raison. C'est le dossier le plus sain des trois — 5 avertissements, contre
16 puis 11 — et c'est pour cela qu'il est utile : ce qui reste n'est plus du bâclage, c'est ce que le
catalogue ne regardait pas. Les pistes marquées « troisième dossier réel » en viennent.

Le deuxième dossier réel est
[`freecompub/TestTizi`, branche `prd/soutien-scolaire-langues`](https://github.com/freecompub/TestTizi/tree/prd%2Fsoutien-scolaire-langues) :
PRD **autonome** de la même association, phase Frame, 13 sources dont neuf d'un entretien du directeur
relayé en direct, 32 zones d'ombre, 5 objectifs validés avec leurs cibles décidées par le bureau,
4 concepts explorés, 2 releases. Les pistes marquées « deuxième dossier réel » en viennent. C'est lui
qui donne la deuxième mesure du drapeau `blocking` : 18 zones bloquantes sur 25 au premier dossier,
0 sur 21 ici — même agent, même critère.

Le premier dossier passé dans Tizi par quelqu'un d'autre que ses auteurs est
[`freecompub/TestTizi`, branche `brd/cadrage-association`](https://github.com/freecompub/TestTizi/tree/brd%2Fcadrage-association) :
cadrage d'une association de soutien scolaire, Assess clos et Discover à mi-chemin sur deux
initiatives, 20,1 M jetons. Les pistes marquées « premier dossier réel » ci-dessous en viennent, et
chacune a été rejouée sur ce dépôt avant d'être écrite ici.

Ce qui est affirmé sans avoir été observé ne vit pas ici mais dans `INCERTITUDES.md` : une piste est
une intention, une incertitude est un fait qu'on croit sans l'avoir vu.

## Faites

| Piste | Date | Où |
|---|---|---|
| Un relecteur a été entendu (S98) : le quadrant déduit le rôle de revue du pouvoir et de l'impact, jamais de ce que la personne a dit — deux relecteurs sur cinq n'avaient jamais parlé | 28 octobre 2026 | `livrable-sans-trou` |
| Un cycle de revue a une échéance, et on n'approuve pas par-dessus un retour non tranché (S99) : `review_rounds` n'était lue par personne | 28 octobre 2026 | `livrable-sans-trou` |
| Un guide devient une source, ou il s'en va (S96 recentrée) : un outil consommé par la conversation ne porte rien que les zones d'ombre n'aient | 28 octobre 2026 | `livrable-sans-trou` |
| La copie de travail se dit copie de travail, et la version figée se dit figée : les deux fichiers étaient identiques à l'octet près, en-tête comprise | 28 octobre 2026 | `livrable-sans-trou` |
| Un livrable sans trou : dix `[object Object]` et un processus actuel invisible dans un BRD figé et parti en revue — formes documentées, rendu corrigé, et une fixture qui les éprouve toutes | 28 octobre 2026 | `livrable-sans-trou` |
| Où on en est : le point d'étape dit les phases passées et les conditions qui restent avant la suivante, et un changement de phase se demande — l'interdiction de demander l'autorisation de travailler l'avait avalé | 28 octobre 2026 | `ou-on-en-est` |
| Un identifiant ne voyage jamais seul : les scripts qui parlent nomment les personnes, `label()` donne la formulation de n'importe quel identifiant, et une question n'en porte pas | 28 octobre 2026 | `un-identifiant-ne-parle-pas` |
| Une question dit à qui elle est posée : 52 questions en texte libre sur un dossier réel, UNE qui nommait quelqu'un. L'extrait de session compte désormais celles qui n'adressent personne | 28 octobre 2026 | `questions-adressees` |
| Une dérogation nommée couvre aussi une règle de structure : `lint.mjs` la proposait sous chaque avertissement, et seules les règles de forme étaient dérogeables — une dérogation du dossier réel était ignorée depuis sa rédaction | 28 octobre 2026 | `questions-adressees` |
| La représentation s'écrit des deux côtés (S94, `represented_by`) : « chaque fonction a un représentant » était vrai, dit deux fois, et le dossier écrivait « non représentée » | 28 octobre 2026 | `questions-adressees` |
| Un besoin dit de qui il est (S95, `concerns`) : S83 ne voit que l'absence totale d'utilisateur direct entendu — un sur quatre, et elle est verte pour toujours | 28 octobre 2026 | `questions-adressees` |
| La carte des parties prenantes a un lecteur (S92, S93) : le quadrant se recalcule au lieu de s'affirmer, `inconnu` devient une valeur d'impact et de pouvoir, et l'influence inconnue à fort pouvoir est due | 28 octobre 2026 | `questions-adressees` |
| Un locuteur est dans la salle qu'il a fait parler (S91) : `present` se lisait dans les deux sens au sein d'un même dossier | 28 octobre 2026 | `questions-adressees` |
| Un guide d'entretien se périme quand son absent arrive (S96), et une hypothèse à vérifier dit comment (S97, `verification`) | 28 octobre 2026 | `questions-adressees` |
| La doc de méthode remise à jour : trois affirmations fausses, la famille « qui a parlé » décrite, et un garde qui relit les issues d'une opportunité contre le gabarit | 27 octobre 2026 | `doc-a-jour` |
| Une décision rendue au nom de quelqu'un que l'état déclare `à interroger` est rapportée, pas rendue (S90) — le raisonnement de S81 sur les sources, transposé aux décisions | 27 octobre 2026 | `decision-au-nom-dun-absent` |
| Une question à la fois, partout : les lots de 2 à 3 questions sont retirés, et une question se compte sur ce qu'elle demande — trois nombres dans une puce font trois questions | 27 octobre 2026 | `une-question-a-la-fois` |
| Un droit de décision a un décideur, et ce n'est pas lui qui le confirme (S89) : la fin de Discover l'exigeait par écrit, rien ne le vérifiait | 27 octobre 2026 | `les-cinq-autre` |
| Les cinq énumérations qui finissaient par `autre` sont lues (S88, libellé exigé), et `décision` devient une valeur des sources du BRD : `autre` y éteignait S83 | 27 octobre 2026 | `les-cinq-autre` |
| L'entretien se fait en direct avec qui est présent : pas de guide pour quelqu'un dans l'échange, `present` distingue qui était là de qui a parlé, et S87 voit les silencieux | 27 octobre 2026 | `entretien-en-direct` |
| « interrogée » disait deux choses : S83 exige une voix recueillie et pas seulement présente au cadrage, et la zone se ferme sur les zones ouvertes, pas sur le statut | 27 octobre 2026 | `entendue-ou-presente` |
| Un décompte présenté à l'utilisateur sort d'un script : `status.mjs` compte sources, parties prenantes et hypothèses, et la pause présente son point d'étape | 27 octobre 2026 | `chiffres-du-point-detape` |
| Une initiative née d'une autre déclare sa provenance (`derived_from`), le besoin poussé ailleurs dit où (`moved_to`), et le portefeuille recoupe les deux sens | 27 octobre 2026 | `origine-des-initiatives` |
| Une question d'attribution se pose seule, l'identité ne se déduit pas d'un vocabulaire, et la salle préfixe ses réponses du prénom de qui parle | 27 octobre 2026 | `tour-de-table-seul` |
| Le tour de table est la seule question de son échange : « à côté du sujet » se lisait « à côté d'une autre question », et la première question de fond d'Assess est toujours un récit | 27 octobre 2026 | `tour-de-table-seul` |
| Plusieurs répondants dans la même pièce : qualité demandée au cadrage, une réponse par répondant sauf accord, le silence n'en est pas un | 26 octobre 2026 | `entretien-en-reunion` |
| Tour de table remonté au premier contact (Assess, pas le cadrage de Discover), et un lot de questions ne transporte pas de question ouverte | 26 octobre 2026 | `tour-de-table-en-assess` |
| Registre de parties prenantes du PRD : le handoff transmet le statut, le tour de table le remplit, et S81 vaut pour les deux documents | 26 octobre 2026 | `parties-prenantes-du-prd` |
| Un décideur du PRD se nomme : `decided_by` et `decision_rights` vérifiés contre le registre, au lieu du seul champ non vide | 26 octobre 2026 | `parties-prenantes-du-prd` |
| S15 et S16 au PRD : un conflit d'intérêts nomme ses parties et son arbitre, qui n'est pas partie au conflit | 26 octobre 2026 | `parties-prenantes-du-prd` |
| Garde-fou de la cause commune : un champ qu'une référence ordonne de remplir est lu par un script (22 champs gardés), plus `S83` et `S84` qu'il a trouvés | 26 octobre 2026 | `parties-prenantes-du-prd` |
| `S85` : le motif EARS déclaré se retrouve dans l'énoncé, et un invariant n'a pas de condition | 26 octobre 2026 | `parties-prenantes-du-prd` |
| `environments` a un lecteur : `record-nfr.mjs` refuse une mesure de NFR qui ne dit pas sur quel environnement elle a été prise | 26 octobre 2026 | `parties-prenantes-du-prd` |
| Garde-fou TDD : mode hors tâche tracé (`derogation.mjs`), borné dans le temps | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Tâche fusionnée libérée à la fusion, message qui dit quoi faire | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Index des sessions : un fichier par session, aucun écrivain partagé | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| `defect.mjs` commun à `plan-builder` et `test-builder` | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Signature Ed25519 de la surface exécutable de la constitution, ancre de confiance hors du dépôt | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Garde-fou : « état d'implémentation introuvable » au lieu de « compréhension non validée » | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| `next-step.mjs` signale les signalements à trier et propose `tizi-bug` | 23 octobre 2026 | `audit/correctifs-2026-10-23` |
| Export de backlog périmé par la sprint review : nommé dans `review/<IT-n>/sprint-review.md`, pas seulement sur la console | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| `--generer-cle` écrit la clé publique en `<chemin>.pub` au lieu de l'afficher seulement | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| Rapport d'audit de la CI (`.tizi/ci-audit.md`) ignoré par Git : lancer l'audit ne salit plus l'arbre | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| Règle des questions : trois formes (choix fermé, arbitrage, élicitation), outil de questions de l'hôte, limites et repli, dans les sept skills et dans les trois points d'entrée à choix fermés | 24 octobre 2026 | `audit/correctifs-2026-10-24` |
| S81 : source attribuée à une partie prenante jamais entendue, ou à personne — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| S56 : décideur d'opportunité absent des parties prenantes ; le nom se demande, l'environnement n'est pas une réponse — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| `council_runs` garde les questions du council (retenues, écartées avec leur raison, réservées), pas seulement leur nombre — premier dossier réel | 25 octobre 2026 | `correctifs-premier-test` |
| Extrait de session : réponse rattachée à sa question, écritures au shell visibles, enveloppes de l'hôte écartées, troncature annoncée, questions en texte libre nettoyées et datées de leur tour | 25 octobre 2026 | `correctifs-premier-test` |
| Condensé cherché sur le disque et non dans le champ d'index, que le hook écrit après le commit du tour | 25 octobre 2026 | `correctifs-premier-test` |
| Type de source `cadrage` : l'échange qui ouvre l'initiative, au nom de qui a parlé | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| Plafond des lentilles dit en plafond et non en cible ; chaque question du council désigne l'élément visé (`target`), et l'arbitrage s'en sert pour fusionner | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| 23 copies de scripts sans appelant retirées, listes de relecture prescrites dans le BRD, et un test qui refuse désormais un script livré sans phase qui l'appelle | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| Décision `decoupee` + `split_into` : une initiative découpée n'est plus enregistrée comme jetée, et les deux outils de portefeuille disent où est passé le travail | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| Porte de synthèse affichée dès Discover par `status.mjs`, avec les deux dimensions qui se comptent (parties prenantes entendues, besoins à source unique) | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| Council de la capacité 7 de Discover : il était encore « proposé […] avec l'accord de l'utilisateur », et le test ne cherchait que « propose un council » — vérification par section désormais | 25 octobre 2026 | `consignes-et-scripts-orphelins` |
| Un tour, une attente : le dialogue est le seul signal d'une demande, jamais pour informer ; une validation porte sur une affirmation à la fois ; une question sans réponse se repose seule | 25 octobre 2026 | `consignes-de-conduite` |
| « Ce qui ne se demande pas » : une étape prescrite et non engageante se fait (council, principe candidat), et on ne demande pas l'autorisation de proposer | 25 octobre 2026 | `consignes-de-conduite` |
| Le council de préparation passe avant les guides d'entretien, puisqu'il existe pour les remplir | 25 octobre 2026 | `consignes-de-conduite` |
| Le council est l'outil de l'agent : il ne s'annonce pas, ne se nomme pas à l'utilisateur, et ses questions s'enregistrent au lieu d'être triées avec lui — exception faite d'une contradiction avec ce qu'il a validé | 25 octobre 2026 | `consignes-de-conduite` |
| La suite de tests et les deux bancs de mesure ne laissent plus de dossier temporaire derrière eux (29 créations pour 8 suppressions ; le quota disque a fini par bloquer la suite) | 25 octobre 2026 | `consignes-de-conduite` |
| `next-step.mjs` et `list-opportunities.mjs` refusent un chemin d'état au lieu de répondre « aucune initiative » avec un code 0 (`rootArg` dans `lib/common.mjs`) | 25 octobre 2026 | `adoption-et-racine` |
| `adopt.mjs` : la commande proposée crée son dossier de rapport et garde le chemin des tests déclaré ; un `paths.production` vide est dit au lieu d'être caché ; `reports/` entre dans les lignes de gitignore générées | 25 octobre 2026 | `adoption-et-racine` |
| Le garde-fou TDD refuse d'écrire quand `paths.production` est vide, au lieu de laisser tout passer en silence | 25 octobre 2026 | `adoption-et-racine` |
| Un passage de council partagé entre initiatives nomme sa portée (`initiatives`) : les compteurs portent sur le passage, les questions sur l'initiative qu'elles visent | 25 octobre 2026 | `council-multi-initiatives` |
| Le point d'étape n'attend rien : sa prochaine action n'est plus « recommandée », elle se fait — et « il confirme avant que tu reprennes » est borné à la reprise après pause, pas à un jalon de milieu de session | 25 octobre 2026 | `permission-de-travailler` |
| « Ce qui ne se demande pas » : ni l'autorisation de travailler (« dites-moi si vous voulez que j'enchaîne »), ni une pause que l'agent propose lui-même ; la consignation et le commit ne sont la branche d'aucune question | 25 octobre 2026 | `permission-de-travailler` |
| La valeur actuelle d'un objectif produit se mesure, sa cible se **décide** (`decision_rights`) : avoir mesuré les métriques en entretien ne donne aucune cible, et c'est là la question à poser | 25 octobre 2026 | `permission-de-travailler` |
| `S82` : une métrique et son objectif portent la même cible, ou rien — et un KPI qui cite une métrique absente est une référence morte. Aucune règle ne lisait `metrics` : le PRD livré annonçait « → 0 demande perdue » au § 2 et « → — » au § 8 pour la même MET-01 | 25 octobre 2026 | `dossier-prd-reel` |
| « L'utilisateur n'est sollicité qu'au triage des questions » retirée des six fichiers de phase où elle survivait, et le test réécrit sur le motif plutôt que sur la tournure | 25 octobre 2026 | `dossier-prd-reel` |
| Une réserve de périmètre est une zone d'ombre `perimetre_non_tranche` adressée au décideur du périmètre, pas une note dans un champ libre de la release | 25 octobre 2026 | `dossier-prd-reel` |
| Un objectif dit qui a arrêté sa cible et quand (`decided_by`, `decided_on`), et aucun champ ne garde de valeur concurrente ; une release a sa fenêtre (`window`) | 25 octobre 2026 | `dossier-prd-reel` |
| Le point d'étape lit la checklist telle qu'elle est écrite — par groupes — et cherche les sessions à la racine de l'état, non dans le répertoire courant ; sept questions ouvertes n'étaient affichées nulle part, et « Sessions conservées : 0 » était faux | 25 octobre 2026 | `dossier-prd-reel` |
| État `partielle` dans la checklist de questions, et un seul nombre de questions par tour (deux ou trois) au lieu de deux consignes contradictoires | 25 octobre 2026 | `dossier-prd-reel` |
| Les guides d'entretien ont un chemin dans le PRD comme dans le BRD : `<initiative>/interviews/guide-<qui>.md`, un par voix à entendre | 25 octobre 2026 | `dossier-prd-reel` |
| `blocking` sort du score d'`ask-five.mjs` (terme constant : 18 bloquantes sur 25 au premier dossier, 0 sur 21 au second) et reste la porte de sortie de phase, avec un critère resserré — « empêche l'étape suivante de commencer », l'étape nommée — écrit dans chaque document qui s'en sert, non plus dans le seul BRD | 25 octobre 2026 | `dossier-prd-reel` |
| La table des poids d'`ask-five.mjs` couvre les types des quatre documents : quatorze types du PRD sur seize tombaient sur le défaut `?? 1`, si bien qu'un conflit d'intérêts pesait autant qu'un attendu implicite et qu'un persona sans preuve arrivait dernier. Sur le dossier réel, le classement passe de « 26 · 22 · 15 · 15 » à « 55 · 52 · 41 · 35 », conflits d'intérêts en tête | 25 octobre 2026 | `dossier-prd-reel` |
| `ask-five.mjs` : le préambule de ligne de commande passe derrière la garde de `choose-path.mjs` — importer `rank`, qui est exporté pour ça, tuait le processus sur le message d'usage | 25 octobre 2026 | `dossier-prd-reel` |
| `0 / 0` ne vaut plus 100 % : une métrique de couverture sans élément à compter se dit **non mesurée** (`mesure: false`, `pct: null`, `met: null`), troisième état distinct de « atteinte » et de « manquée ». Un BRD à l'ouverture affichait ses trois métriques « atteint » dans le document rendu comme dans le handoff | 2 novembre 2026 | `porte-sans-mesure` |
| La table de couverture s'écrit une seule fois (`coverageRows`) pour les quatre documents, côté rendu comme côté passation : l'expression était recopiée huit fois, et huit fois elle disait « atteint » sur une métrique vide. Le handoff transporte `mesure`, pour que l'aval le sache | 2 novembre 2026 | `porte-sans-mesure` |
| La porte de release compte trois verdicts par condition — satisfaite, en échec, **non mesurée** — et « incomplète » n'est pas « ouverte ». `[].every()` rend `true` : sur le dépôt d'exemple sans rapports, « ✓ R1 Toutes les suites collectées passent — aucun rapport ». Quatre conditions récupérées (R1, R5, R6, R7) sur le même état | 2 novembre 2026 | `porte-sans-mesure` |
| `R6` et `R7` restent dans la table sans leur rapport, en disant le réglage qui les alimenterait, au lieu d'en disparaître : une condition qu'on ne voit pas ne se discute pas. Un seuil de mutation à 0 est une mise hors périmètre **écrite** | 2 novembre 2026 | `porte-sans-mesure` |
| `S00` : un document hors de `brd`, `prd`, `sad`, `plan` se refuse au lieu de recevoir les règles du BRD. Le dernier terme de la chaîne de ternaires de `checkState` était `checkBrd`, et `coverage()` repliait de même — un état de tests recevait trois métriques inexistantes à « 100 % atteint » | 2 novembre 2026 | `porte-sans-mesure` |
| `phase_log` : une porte franchie s'écrit — la phase close, celle qui s'ouvre, la date, qui a décidé, la source, l'état de la porte et les conditions franchies par dérogation. `questions.md` exigeait depuis le 28 octobre qu'« il s'écrive dans l'état avec sa date » et le champ n'existait pas : l'agent a écrit le passage en **commentaire YAML**, que rien ne lit, que le document rendu ne peut pas reprendre, et qui disparaît à la première réécriture du champ. `S100` réclame la trace, `S101` son décideur et sa date | 2 novembre 2026 | `champs-manquants` |
| La ligne de phases du point d'étape dit la date et le nom de qui a décidé chaque passage, ou « passage sans trace » ; le document rendu porte le même parcours en table, dérogations comprises — un relecteur ne lit pas le YAML | 2 novembre 2026 | `champs-manquants` |
| `quote` et `understood` sur une source : ce qui a été dit mot pour mot, et ce qu'on en a tiré, séparés parce qu'ils se corrigent séparément. Le modèle n'avait **aucun** champ pour le contenu d'une source : au deuxième dossier réel, 92 sources sur 93 dont 65 entretiens ne portaient que leurs métadonnées, et `feedback` comme `S84` portaient donc sur du vide. `S102` le dit sur la collection, pas 92 fois | 2 novembre 2026 | `champs-manquants` |
| `confirms` sur une source : ce qu'elle confirme quand elle EST une relecture, et `S103` exige qu'elle rejoigne les `sources` de l'élément. Mesuré : Samir confirme BC-003 (SRC-086), BC-002 et BC-007 (SRC-087), aucun des trois ne cite ces sources — BC-007 paraissait reposer sur une voix unique alors que deux parties prenantes le portaient, et le relevé de relecture montrait trois besoins quand son corps en disait cinq | 2 novembre 2026 | `champs-manquants` |
| `S84` accepte une confirmation de l'élément lui-même, pas seulement la relecture de la source dont il est tiré : c'est l'énoncé qui a été relu, et c'est mieux | 2 novembre 2026 | `champs-manquants` |
| La table des phases vit dans `lib/common.mjs`, lue par `status.mjs` comme par `lib/rules.mjs` : elle ne pouvait appartenir à aucun des deux | 2 novembre 2026 | `champs-manquants` |
| `projectRoot()` : la racine du projet définie une seule fois — le dépôt Git, à défaut le plus proche ancêtre portant `.tizi/`. Les quatre scripts de session la déduisaient chacun à leur façon (le `cwd` du hook pour deux, `'.'` pour un, le chemin de l'état pour `status.mjs`, le seul correct) : un `cd` dans un dossier d'initiative y créait un **second magasin**, et chaque capture n'en mettait à jour qu'un. Sur le deuxième dossier réel, la même session existait deux fois, 15:14 / 107 messages contre 15:35 / 108, en alternance — aucune des deux n'était fiable | 2 novembre 2026 | `racine-unique` |
| Ce qui décide de la forme d'un identifiant est **la distance du lecteur à l'index**, pas sa place dans la phrase. J'avais écrit « l'utilisateur est le seul de la chaîne qui n'a pas l'index sous les yeux » : faux, une partie prenante ne l'a jamais vu. Trois lecteurs, trois formes, et pour celui qui n'a jamais vu le dossier : glosé sur place à chaque fois, ou absent | 2 novembre 2026 | `doctrine-du-lecteur` |
| `documentation/regles-de-controle.md` : **toutes les règles de contrôle, étape par étape** — règles de structure et de rédaction avec leur énoncé, conditions calculées de chaque porte de phase, métriques de couverture et seuils, portes de PR et de release, garde-fous d'export, index. Le document **se génère** (`doc-regles.mjs`) : une liste de 117 règles écrite à la main dérive au premier chantier, et une liste qui dérive est pire qu'une absence de liste — on la croit. C'est la doctrine du dossier appliquée au dossier | 2 novembre 2026 | `regles-documentees` |
| Rien n'y est recopié : les énoncés viennent du catalogue, les conditions de porte d'un **appel réel** à `gateConditions`, les seuils de `COVERAGE_DEFAULTS`, les étapes du **graphe d'appel** du catalogue. Un parsing du source présentait « problems » et « perimetre » — les premières chaînes des tableaux d'aide — comme des conditions de porte : appeler la fonction documente ce qu'elle fait, pas ce qu'elle a l'air de faire | 2 novembre 2026 | `regles-documentees` |
| Un test vérifie que le document n'a pas dérivé (`doc-regles.mjs --verifier`), que **chaque** règle du catalogue y figure, et que les conditions d'une porte au hasard s'y retrouvent mot pour mot. Un document de référence qui peut mentir sans qu'on le sache n'est pas une référence | 2 novembre 2026 | `regles-documentees` |
| Ce que l'écriture du document a trouvé : la porte de l'étape 6 portait **quatre conditions de zones d'ombre**, et l'étape 6 n'a ni `shadow_zones`, ni `risks`, ni `hypotheses` — ni dans son gabarit, ni dans sa doctrine. Quatre ✓ gratuits sur des collections vides, qui gonflaient le « n tenues sur m » et n'apprenaient rien. Une condition qui ne peut pas échouer n'est pas une condition | 2 novembre 2026 | `regles-documentees` |
| Et que les six garde-fous d'export n'étaient que cinq à se lire : `G5` (contenu non validé) n'a pas de détecteur — il est tenu par construction — donc le seul qui ne se détecte pas était celui qui disparaissait de toute table dressée depuis les détecteurs. La liste vient maintenant de l'énumération, le libellé du détecteur quand il existe | 2 novembre 2026 | `regles-documentees` |
| L'extrait de session annonçait un fichier modifié nommé **« 40 »** : un `> 40` écrit dans le TEXTE d'un rapport passé en heredoc, lu comme une redirection de shell. Le corps d'un heredoc est une donnée, pas de la syntaxe : il s'enlève avant qu'on y cherche des écritures. La ligne d'en-tête reste, elle porte souvent la vraie cible (`cat > rapport.md <<'EOF'`). Et une cible faite de chiffres seuls est un descripteur ou une comparaison, jamais un fichier | 2 novembre 2026 | `les-trois-petits` |
| Un fragment cité DANS une phrase se coupe autrement qu'un bloc. `borne` ajoute sa marque de troncature après deux retours à la ligne — juste pour un bloc, destructeur dans « … » : le bloc de citation du markdown se fermait et le guillemet fermant restait seul sur une ligne de corps de texte. `bribe()` coupe en ligne, sans jamais couper en plein mot, et le dit — le même geste que `label()` | 2 novembre 2026 | `les-trois-petits` |
| **Les trois noms de l'étape 6** : le dossier `qa/<slug>/`, le document `test`, le skill `test-builder`. Les trois cohabitent depuis l'origine et chaque couche utilise le sien — c'est cohérent, et rien ne le disait : le point d'étape affichait « (test) » sur un chemin `qa/…`, et qui cherche `test/<slug>/state.yaml` ne trouve rien. Les trois sont nommés dans `test-builder/SKILL.md`, avec le fait qu'**il n'y a pas de quatrième nom à chercher** ; `status.mjs` dit « test, dans qa/ », et `lib/common.mjs` porte la table — d'une seule entrée | 2 novembre 2026 | `les-trois-petits` |
| **`S108`** : l'état du document amont, lu en aval. Chaque `build-handoff.mjs` écrivait `source.status` depuis le début, et un SEUL script le lisait — `plan-builder/ingest-handoffs.mjs`, en `console.warn`, que rien ne persiste et que personne ne relit. Les quatre autres étapes passaient par `verify-handoff.mjs`, lisaient « Handoff intègre », et ingéraient sans savoir si le document avait été approuvé. **Intègre veut dire « non altéré », pas « approuvé »** : un brouillon intact est intact, et c'est tout ce que ça dit | 2 novembre 2026 | `non-lu-non-teste` |
| `verify-handoff.mjs` refuse un handoff qui ne vient pas d'une baseline ; `--accepte-non-baseline` passe outre, et c'est l'utilisateur qui le décide. Un état **absent** ne se refuse pas — le champ n'existait pas dans les handoffs d'avant — mais il se dit, et `S108` le porte dans l'état aval jusqu'à sa gouvernance. Le `status` se reporte dans `source_brd` / `source_prd` / `source_plan`, à côté de l'empreinte | 2 novembre 2026 | `non-lu-non-teste` |
| Le handoff du **plan** n'écrivait pas `status` du tout — seul des quatre. Tout l'aval du plan, implémentation et tests, n'avait donc aucun moyen de savoir si le plan avait été figé, même en le cherchant | 2 novembre 2026 | `non-lu-non-teste` |
| **Vingt règles de structure n'étaient citées par aucun test ni aucun golden** : rien ne prouvait qu'elles se déclenchent, ni qu'elles se taisent quand il faut. Chacune est désormais prise deux fois — l'état qui la viole, et le même corrigé — et un test tient la propriété pour les 109 règles de structure et les 8 de rédaction. Une règle que personne n'exerce est soit du code mort, soit un contrôle qui tire à côté, et on ne l'apprend qu'en production, sur le dossier de quelqu'un | 2 novembre 2026 | `non-lu-non-teste` |
| Ce que l'exercice a trouvé : `S35` réclamait un agrégat aux règles `à_décider` et `manuelle`, parce que le filtre de la porte écrit au chantier précédent inventait une valeur — « aucune » n'est pas dans l'énumération `à_décider \| automatisée \| manuelle`. Le contrôle du catalogue, lui, était juste : les deux lisent maintenant la même valeur | 2 novembre 2026 | `non-lu-non-teste` |
| `S70` (fiche de contexte trop longue) vivait dans `render-plan.mjs`, en `console.warn`, alors que l'en-tête de `lib/rules.mjs` dit « une règle n'est définie qu'ici, jamais ailleurs ». Invisible au lint, au point d'étape et à la porte, et surtout **non dérogeable** : `lint_waivers` ne pouvait pas l'atteindre. Même défaut que `S53`, qui était l'autre contrôle hors catalogue | 2 novembre 2026 | `non-lu-non-teste` |
| `S04` et `S05` sont dus **à la porte** de Define, pas pendant. Les critères d'acceptation s'écrivent à l'étape 3 et les priorités s'arbitrent à l'étape 4 : entre l'étape 2 et là, chaque exigence validée criait « sans critère » et « sans priorité ». Mesuré sur le dossier réel : **cinq avertissements sur seize**, près d'un tiers, étaient le chemin que la doctrine prescrit. Un contrôle qui crie pendant le travail qu'il prescrit s'apprend à s'ignorer, et il s'ignore ensuite quand il a raison. La porte les compte et nomme les exigences : l'information change de place, elle ne disparaît pas | 2 novembre 2026 | `non-lu-non-teste` |
| **Un** système de seuils et de dérogations. Ils étaient deux : `coverage_thresholds` / `coverage_waivers` au niveau de l'état pour les quatre documents, `settings.thresholds` / `waivers` pour la vérification de release. Noms différents, emplacements différents, clés différentes (`metric` contre `id`), défauts écrits à deux endroits. Un seul nom s'écrit — `thresholds` et `waivers`, au niveau de l'état, pour les cinq documents —, les anciens restent lus pour ne casser aucun dossier, et `S107` dit de les renommer | 2 novembre 2026 | `un-seul-seuil` |
| **Une dérogation ne compte que si elle dit pourquoi ET qui l'a approuvée** (`S106`). Aucun des deux systèmes ne le vérifiait, là où `lint_waivers` le fait depuis le 28 octobre : `{ metric: fr_ac }` seul éteignait un seuil de couverture, et `{ id: AC-004 }` seul retirait un critère de la porte de release (R2) sans qu'une ligne dise à quel titre. La table des dérogations de la matrice dit maintenant lesquelles comptent et ce qui manque aux autres | 2 novembre 2026 | `un-seul-seuil` |
| **Un seuil à 0 ne compare rien** : `pct >= 0` est toujours vrai. `stories_ready` avait 0 pour défaut, et la table du plan de l'exemple rendait « Stories prêtes \| 2/5 \| 40 % \| 0 % \| **atteint** » — trois stories sur cinq non prêtes, lues comme une ligne verte. Côté release, la doctrine disait « un projet qui n'en veut pas pose son seuil à 0 et le dit par écrit », et **rien ne lisait cet écrit** : R6 passait au vert sur un seuil à 0, sans rapport et sans raison. Un seuil à 0 est un renoncement, et il passe par une dérogation nommée (`S105`) | 2 novembre 2026 | `un-seul-seuil` |
| Une mesure **indicative** se lit et ne se juge pas : « stories prêtes » n'a pas de cible — on n'a jamais besoin que toutes le soient, seulement assez pour le prochain cycle. Le catalogue l'avait écrit avec un seuil de 0, qui compare. C'est désormais un état déclaré, avec sa raison, et **seul le catalogue peut le déclarer** : un projet qui écrit 0 dans `thresholds` assume, et l'assomption se nomme | 2 novembre 2026 | `un-seul-seuil` |
| La raison d'un verdict part dans le handoff (`note`) : `met: null` sans sa raison fait redescendre l'aval dans l'état amont pour comprendre | 2 novembre 2026 | `un-seul-seuil` |
| `S53` (handoff ingéré altéré) vit dans le catalogue, plus dans `lint.mjs`. Il en était le seul contrôle hors catalogue, donc `status.mjs` ne pouvait pas le faire : mesuré **27 avertissements à la porte contre 29 au lint** sur un plan dont les handoffs amont ont bougé. Avec la constitution, les `refs.yaml` et le texte des guides d'entretien, c'étaient quatre contextes manquants — et le commentaire du script interdisait depuis le début que les deux annoncent deux nombres différents | 2 novembre 2026 | `un-seul-seuil` |
| `lib/gates.mjs` : les portes de sortie se **calculent**, pour les cinq documents à phases. Les conditions étaient écrites dans les fichiers de phase (« Propose le passage quand… ») et comptées dans `status.mjs` **pour le BRD seul** : les quatre autres avaient la même doctrine et aucun compte, et l'agent jugeait leurs portes de mémoire. Chaque condition non tenue nomme désormais ses identifiants — un « ✗ » sans son nombre se recompte à la main | 2 novembre 2026 | `portes-calculables` |
| La porte de Define ne regardait qu'une collection pour le `proposé` — les décisions. Mesuré sur le dossier réel : « ✓ aucune décision restée proposé » avec **neuf règles métier à `proposé`** qu'aucune condition ne lisait, tranchées par personne, et parties telles quelles vers le PRD. La condition porte maintenant sur toutes les collections à cycle de vie, et le détail nomme chacune | 2 novembre 2026 | `portes-calculables` |
| Une zone d'ombre encore `ouverte` à la porte est une question que **plus personne ne posera** : le document part sans elle et rien ne la rattrape. Mesuré : **63 zones ouvertes pour 0 risque** au BRD, dont deux bloquantes sur la conservation de données de santé. Trois conditions : toute zone est levée ou assumée, toute assumée est emportée par un risque ou une hypothèse qui la nomme, et toute assumée dit pourquoi | 2 novembre 2026 | `portes-calculables` |
| Une condition de porte a **trois** états : tenue, en échec, et **non mesurée**. La couverture des exigences de la release se lit dans `refs.yaml`, que l'appelant n'a pas toujours : sans lui, la condition se déclare non mesurée au lieu de se cocher, et le compte dit « n tenues sur m mesurées, k non mesurées ». Même leçon que les trois couvertures à « 0/0 = 100 % ATTEINT » | 2 novembre 2026 | `portes-calculables` |
| Ce qui ne se calcule pas n'est **pas** dans la porte : « le MVP satisfait les critères de mvp.md », « assez de stories sont prêtes », « les participants se reconnaîtraient dans la synthèse ». Le compte dit « conditions mesurées », jamais « la porte est franchie », et le point d'étape le rappelle sous la liste | 2 novembre 2026 | `portes-calculables` |
| La ligne des phases lisait le **rang** de la phase courante : sur le plan de l'exemple, dont les phases se répètent à chaque cycle, elle annonçait « Govern à venir · Review à venir » pour une version 1.0 figée et une revue d'itération enregistrée. Elle se lit maintenant dans `phase_log`, avec le rang pour seul repli, et dit « Refine en cours (passage n°2) » | 2 novembre 2026 | `portes-calculables` |
| Un **retour en arrière** s'écrit dans le même journal que les portes, avec `kind: retour`, et porte en plus la zone d'ombre qui l'a provoqué et sa raison. `define_returns` ne valait que pour le BRD : les trois autres documents reculaient sans rien écrire. Un retour ne tient pas lieu de porte — sans ce filtre, un retour écrit depuis Discover suffisait à faire croire que la porte de Discover avait laissé sa trace (`S100`) | 2 novembre 2026 | `portes-calculables` |
| `close` ne faisait pas que manquer à la table : elle faisait disparaître **toute** la ligne des phases. Sur le dossier réel découpé en deux, le point d'étape ne disait plus rien du parcours — et c'était tout l'intérêt. Close est maintenant nommée comme un terme, et ce qui n'a pas de trace sur une initiative close est « sans trace », pas « à venir » | 2 novembre 2026 | `portes-calculables` |
| L'étape « tests » a un champ `phase` (`prepare`, `execute`, `prove`) et un `phase_log`. Elle livrait trois fichiers de phase, et son état n'en portait aucune trace : la doctrine décrivait un parcours que rien ne situait, et aucune de ses trois portes ne se comptait. `impl` n'en aura pas : un lot de tâches n'a pas de phase commune, chaque tâche a son statut | 2 novembre 2026 | `portes-calculables` |
| `review-sources.mjs` : le relevé à relire se **génère**, par personne interrogée — le `quote` mot pour mot, le `understood`, et ce qui en a été construit avec son énoncé. L'instrument manquait : la méthode avait le contrôle (`feedback`, `S84`) et aucun moyen de le satisfaire — ni script, ni gabarit, ni doctrine. L'agent avait inventé la forme, bonne, et son texte est repris presque mot pour mot ; mais il tapait les identifiants de mémoire, et les trois relevés envoyés portaient 30 adresses non glosées. **Zéro constat `S104` sur le relevé généré** | 2 novembre 2026 | `relecture-generee` |
| Une source sans `quote` apparaît en creux dans le relevé, avec le fait qu'elle ne peut pas être relue : c'est le seul endroit où la personne peut s'apercevoir qu'on a perdu ce qu'elle a dit | 2 novembre 2026 | `relecture-generee` |
| Le relevé montre aussi ce que la personne a **déjà confirmé de vive voix** (`confirms`), même si l'élément ne repose pas sur ses sources. Sans cette section, le relevé contredisait son propre corps : il disait que Samir avait répondu sur cinq besoins et son récapitulatif en montrait trois | 2 novembre 2026 | `relecture-generee` |
| `review-sources.mjs --etat` donne la charge par personne avant d'envoyer : 71 sources pour le président, 13 et 9 pour les deux autres. Un fichier déjà écrit n'est jamais remplacé, et les sources ne passent à `feedback: envoyé` que quand la personne a reçu le document — publier n'est pas transmettre | 2 novembre 2026 | `relecture-generee` |
| L'unité n'est plus « le message ». Un relevé de 362 lignes est un message : la règle s'y trouvait satisfaite par une glose n'importe où, et un lecteur ne relit pas en arrière | 2 novembre 2026 | `doctrine-du-lecteur` |
| Le **renvoi** ne sort pas du dossier : « il dit où c'est rangé » suppose qu'on puisse y aller. `(SRC-068)`, `(ZO-118)`, `(DD-10)` dans un document destiné à qui n'a pas le dossier, c'est du bruit. L'étiquette, elle, traverse | 2 novembre 2026 | `doctrine-du-lecteur` |
| L'exception du guide d'entretien **s'inverse** quand le destinataire est la personne elle-même : on lui demande de vérifier ce qu'on a écrit de lui, et une adresse au lieu de la chose lui demande de valider ce qu'il ne peut pas lire — il répond « oui », comme c'est arrivé | 2 novembre 2026 | `doctrine-du-lecteur` |
| `S104` : un document qui quitte le dossier et porte un identifiant dont l'énoncé n'est nulle part dedans. Mesuré sur les trois relevés réels : **30 constats**, dont `BC-002` et `BC-007`, les deux besoins qu'on demandait à Samir de confirmer sans les lui dire. Le contrôle ne juge pas la FORME de la glose — étiquette, parenthèse, prose se valent — il cherche l'énoncé que l'état porte : un contrôle de forme produirait des faux constats qu'on apprendrait à déroger | 2 novembre 2026 | `doctrine-du-lecteur` |
| Les guides d'entretien sont hors de `S104` : leur lecteur est l'intervieweur, qui a le dossier — c'est l'exception que la doctrine nomme | 2 novembre 2026 | `doctrine-du-lecteur` |
| Le dépôt Git passe avant `.tizi/` dans la recherche de la racine : sur un dépôt déjà abîmé, chercher le plus proche `.tizi/` y retournerait et perpétuerait le défaut. Remonter au dépôt le répare | 2 novembre 2026 | `racine-unique` |
| Les chemins de l'entrée d'index se résolvent contre la racine, pas contre le répertoire d'où l'on lit : `session-search.mjs` cherchait `existsSync(s.transcript)` et ne rendait rien, sans dire pourquoi | 2 novembre 2026 | `racine-unique` |
| Le champ `condensed` ne s'écrit plus : un cache que seul le moins informé écrivait, et qui ne pouvait que mentir — la capture cherchait le condensé dans son répertoire courant. Mesuré en deux captures sur le même fichier : renseigné depuis la racine, `''` depuis `brd/demo`. Un index ancien qui le porte encore reste lu | 2 novembre 2026 | `racine-unique` |
| Le commentaire de `condenseOf` donnait une cause fausse — « il tourne sur Stop, donc après tout ce que l'agent a fait dans le tour » : si c'était la cause, le champ serait rempli. J'avais affirmé une cause au lieu de la mesurer, puis écrit un repli qui a rendu la question sans objet, donc personne n'y est revenu. Un contournement qui masque un défaut masque aussi le fait que le diagnostic était faux | 2 novembre 2026 | `racine-unique` |
| Une initiative touchée est une initiative qui a un état sur le disque (`surLeDisque`) : `brd/demat-inscriptions-relecture` était un nom de BRANCHE dans un `git push`, et l'index annonçait quatre initiatives pour un seul dossier réel — au redémarrage, `session-start.mjs` réclamait un condensé pour trois dossiers inexistants. Les mentions restent ce qui décide si la session a affaire au SDLC : confondre les deux listes supprimait la capture entière | 2 novembre 2026 | `racine-unique` |
| Un test lance la capture **depuis un sous-répertoire** et vérifie qu'il n'y a qu'un magasin : tous partaient de la racine, et c'est exactement pour ça que rien n'avait été vu | 2 novembre 2026 | `racine-unique` |
| `S109` : un risque porte `likelihood`, `impact` et `response` depuis l'origine, et **aucune règle, dans aucun des quatre documents, ne les lisait** — `risks` n'avait qu'un lecteur, `S19`, qui vérifie qu'un opposant puissant en a un, pas ce qu'il dit. Au troisième dossier réel, quatre risques écrits avec soin, longs et justes, et les trois champs vides sur les quatre. Vide ne veut pas dire faible, ça veut dire non apprécié — et c'est le risque qui emporte une zone d'ombre assumée | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| `S94` : une question **sur** quelqu'un n'est pas une question **à** quelqu'un. `nommeeDansUneZone` fermait la règle sur une zone qui la nomme en `related` ; au troisième dossier réel, l'utilisatrice directe jamais entendue — celle qui fait la saisie — était nommée dans une seule zone ouverte, « combien de personnes font la saisie ? », posée au directeur. Le cas était écrit **dans le test** comme la bonne tenue | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| `S110` : une représentation se lit dans une source où la personne parle (`represents_source`). `represents` n'avait qu'un lecteur, `S94`, et seulement comme test de présence : une représentation **fausse** était invisible. Un représentant des parents d'élèves s'est trouvé enregistré représentant « des membres du bureau », déduit d'un tour de table où le « je » final revenait à lui — rattrapé par hasard, parce que la question est passée devant l'utilisateur | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| `S111` : `feedback: sans objet` porte sa raison sur une parole recueillie (`feedback_motif`). C'est la seule valeur qui éteint `S84` sans que personne n'ait rien relu. Dix l'avaient au troisième dossier réel : six décisions de l'utilisateur — légitimes, il ne se fait pas relire son propre choix — et quatre cadrages, dont le tour de table qui contenait la phrase mal attribuée **et** l'échange qui l'avait corrigée | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| `S112` : une source peut corriger une autre source, et le dossier peut le dire (`corrects`). `confirms` ne pointe que vers des éléments — BC, BR, RG : rien ne menait du tour de table à l'échange qui en avait corrigé la lecture, et une source corrigée déclarée « sans objet » se contredit | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| `S113` : l'inverse de `S95`. Un `end_user` qu'aucun besoin ne concerne, à la porte de Define : soit un besoin manque, soit l'usage direct n'en est pas un. Celle qui faisait la saisie — le geste même que le changement remplaçait — n'était dans les `concerns` d'aucun des huit besoins | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| Un signal de succès se relit comme un besoin : `solution_deguisee` ne visait que les besoins. « Plus de dossier papier », `measurable: true`, dans une demande classée `fluide` — classée ainsi précisément pour garder une solution hors du but. C'est une consigne de conduite, pas un contrôle : rien ne distingue lexicalement un moyen d'un résultat | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| Le nombre de règles annoncé dans l'en-tête du document généré était écrit en dur — 117 pendant que le catalogue en comptait 122. Une liste qui dérive est pire qu'une absence de liste, et c'est la phrase même qui le disait | 3 novembre 2026 | `defauts-que-personne-ne-lisait` |
| Une question en texte libre sort de l'extrait avec la réponse qui l'a suivie, et sur l'échelle que le document porte. Les questions de l'outil avaient leur `**Réponse**`, celles en texte libre n'en avaient aucune — alors que la réponse est le message suivant de l'utilisateur, et le seul endroit où elle se lit. Et le numéro affiché comptait les **réponses de l'agent** quand la section des messages les numérote, eux, de 1 à 29 : mesuré sur le troisième dossier réel, 5 questions citant les tours 13, 35, 45, 48 et 54 — quatre au-delà du dernier message existant. « (tour 13) » ne désignait rien, et le message n° 3, « C'est Dédé », était trois mots dont la question était perdue | 3 novembre 2026 | `questions-et-reponses-appariees` |
| Les questions de la dernière réponse de l'agent ne sont « en suspens » que si cette réponse n'a rien reçu : quand la transcription se termine sur un message de l'utilisateur, elles y figuraient quand même. L'appariement permet enfin de le savoir | 3 novembre 2026 | `questions-et-reponses-appariees` |
| `joignable_par` sur la partie prenante : par quoi on la joint — `vive voix | courriel | messagerie | téléphone | autre:<canal nommé>`. Rien ne disait comment atteindre quelqu'un, donc rien ne permettait de lui écrire plutôt que d'attendre la réunion suivante. Le champ ne réclame rien : ne pas savoir joindre quelqu'un est un fait, pas une faute, et la réunion reste le mode normal | 3 novembre 2026 | `une-coordonnee-ne-se-commite-pas` |
| `S114` : une coordonnée ne se commite pas. `state.yaml` part dans le dépôt, dans le handoff, et `freeze-version.mjs` en fige une copie en lecture seule sous `versions/` dont rien ne se reprend — une adresse écrite là y reste pour qui clonera. L'adresse va donc dans `contacts.yaml`, à côté de l'état, exclu par le `.gitignore` que pose `install.mjs` et non recopié par `freeze-version.mjs` : vérifié de bout en bout, `git check-ignore` sur `brd/<slug>/contacts.yaml` et `state.yaml` resté suivi | 3 novembre 2026 | `une-coordonnee-ne-se-commite-pas` |
| Un canal **annoncé** se vérifie, un canal absent ne se reproche pas : `S114` nomme la partie prenante déclarée joignable dont `contacts.yaml` ne porte aucune entrée — déclarée joignable et injoignable est pire que sans coordonnée connue —, et `S09` l'entrée qui ne désigne personne. Le fichier suit les trois états : non consulté, absent, présent. « On n'a pas regardé » n'est pas « il n'y a rien », et `lint.mjs` comme `status.mjs` le lisent tous les deux, sinon la porte et le lint annoncent deux nombres différents | 3 novembre 2026 | `une-coordonnee-ne-se-commite-pas` |

## Ouvert

- **`main` n'est pas protégée sur GitHub.** `ci-audit.mjs` le signale (« Branch not protected »,
  HTTP 404 avec un jeton sans droit d'administration), et personne ne l'a fait. Celui-là ne dépend pas
  de Tizi : quatre PR ont été fusionnées sur une branche que rien n'empêche de pousser en direct.
- **Les 21 règles jamais exercées.** Sur les 113 règles du catalogue (`scripts/lib/rules.mjs` : 105 `S` et 8 `L`), 21 ne
  sont déclenchées par aucun test ni aucune référence figée : `S01 S02 S03 S06 S10 S21 S25 S26 S33 S34
  S35 S37 S38 S39 S42 S46 S47 S49 S59 S62 S70`. Une règle jamais vue passer est une règle dont on ne
  sait pas si elle fonctionne.
- **Commiter un résultat d'eval**, même mauvais. `evals/results/` est ignoré par Git : les mesures
  n'existent que chez leur auteur. La dernière passe de déclenchement (24 octobre, 1 passe) donne un
  rappel de **0,00 pour `impl-builder`** — il ne s'est déclenché ni sur « Implémente la tâche TK-002 du
  plan en TDD », ni sur « Écris un test unitaire pour la fonction manquants() ». À rejouer sur
  plusieurs passes avant de corriger la description, puis à commiter.

### Premier dossier réel — ce qui reste

- **Les écritures au shell restent partiellement invisibles.** L'extrait lit maintenant la redirection
  et `tee`, et dit combien de commandes de shell ont été lancées. Un `sed -i`, un script qui écrit, un
  éditeur en ligne de commande : la cible n'est pas devinable sans interpréter le shell, et on ne
  l'interprète pas. Le compte dit où regarder, il ne dit pas quoi.

- **Un correctif de consigne a besoin d'un test qui cherche au bon endroit.** Le council de la capacité 7
  de Discover disait encore « proposé après le cadrage […] Ne le lance qu'avec l'accord de l'utilisateur »
  trois jours après le correctif « le council se lance, il ne se propose pas » — parce que le test ne
  cherchait que la suite de mots « propose un council », et que dans cette section le mot « council »
  n'était que dans le titre. Corrigé, et le test vérifie maintenant la section entière. La leçon vaut
  pour les prochains : une consigne corrigée dans une référence peut survivre ailleurs dans la même
  référence, et un test écrit sur la formulation du défaut ne trouve pas ses variantes.

### Les six questions du chemin ne s'appliquent pas à un dépôt d'outillage (25 octobre)

Première tentative de faire passer Tizi par Tizi, bloquée au choix du chemin. Deux des six questions
tournent à vide sur un outil de développement : « **le changement crée-t-il ou modifie-t-il une règle
métier ?** » — il n'y a ni client, ni processus d'entreprise, ni règle qu'un service contrôle — et
« touche-t-il une exigence réglementaire ou la sécurité des patients ou des utilisateurs ? », à laquelle
on répond mécaniquement non. Les six questions ont été écrites pour une application.

Conséquence tirée le même jour : **« Faire passer Tizi par Tizi » est écartée** (voir la section
Écartées). On n'a pas inventé une variante des questions pour un dépôt d'outillage : ce serait une
seconde méthode à maintenir, pour un seul dépôt, celui des auteurs.

### Trouvé en vérifiant, pas en lisant (25 octobre)

La suite de tests créait **29 dossiers temporaires pour 8 suppressions**, et les deux bancs de mesure
(`evals/run-triggers.mjs`, `evals/run-ablation.mjs`) n'en reprenaient aucun. Une centaine de mégaoctets
par passe, jamais rendus. En CI le conteneur est jeté et ça ne se voit pas ; en local ça s'accumule — au
bout d'une trentaine de passes, **2 665 dossiers abandonnés** et un quota disque épuisé qui empêchait la
suite de tourner. C'est le même défaut que `.tizi/ci-audit.md`, corrigé le 24 octobre : vérifier ne doit
salir ni le dépôt, ni la machine de qui vérifie. Fermé par un `tempDir()` unique dans
`tests/helpers.mjs`, une reprise à la sortie du processus, une échappatoire nommée
(`TIZI_GARDER_TMP=1`) et un test qui refuse tout `mkdtempSync` direct.

### Deuxième sortie de BRD (25 octobre)

Un second passage, sur les mêmes deux initiatives, a montré que les correctifs de conduite tenaient
(« qui se lance d'office », une seule prochaine action, les reformulations marquées non confirmées) et
a fait apparaître un défaut de forme en amont des précédents : **le message ne disait pas ce qu'il
attendait**. « Deux choses à valider » suivi de cinq validations, d'une recommandation, d'une
information et d'une offre — et le deuxième point sans verbe, sans question. Les cinq consignes
ci-dessus en viennent. Il restait aussi, non corrigé :

- **Une reformulation de problème en une phrase de 45 mots portant quatre affirmations.** La consigne
  demande « 2 à 3 phrases » ; ce n'est pas respecté, et c'est ce qui rend « est-ce juste ? » sans
  réponse possible. La règle « une affirmation à la fois » le couvre côté question, pas côté rédaction.
- **Un guide d'entretien annoncé pour deux initiatives à la fois**, alors que le chemin prescrit est
  `brd/<slug>/interviews/guide-<SH-xx>.md` : un guide unique n'a pas d'endroit où vivre.

- **Personne ne lit `council_runs`.** Vérifié : la seule mention de ce bloc dans tous les scripts est une
  liste d'exclusion (`rules.mjs`, détection d'espaces réservés). Les compteurs ont été écrits « pour
  mesurer si le council valait le coup », et aucun outil ne les agrège — ni par initiative, ni sur le
  portefeuille. Le double comptage, corrigé le 25 octobre, ne faussait donc aucun chiffre produit par une
  machine : il trompait un lecteur. Reste à décider si cette mesure doit exister pour de vrai (un script
  qui dit, sur un portefeuille, combien de questions un council rapporte par passage) ou si les
  compteurs doivent disparaître, puisque les questions sont désormais gardées une par une.

## Écartées

Décidées, et écartées. Elles restent écrites : sans ça, elles reviennent dans six mois comme une
intention neuve, et le travail de les instruire est à refaire.

- **Faire passer Tizi par Tizi** — écartée le **25 octobre 2026**, après une tentative. Le choix du
  chemin bloque : deux des six questions n'ont pas de réponse sur un dépôt d'outillage. « Le changement
  crée-t-il ou modifie-t-il une règle métier ? » suppose un client, un processus d'entreprise, une règle
  qu'un service contrôle ; « touche-t-il une exigence réglementaire ou la sécurité des patients ou des
  utilisateurs ? » se répond mécaniquement non. Les six questions ont été écrites pour une application,
  et Tizi n'en est pas une.

  Ce que ça entraîne, et qu'il faut lire tel quel : les **2 points bloquants** que `ci-audit.mjs` relève
  sur ce dépôt — porte de PR non rejouée sur `pull_request`, preuves de release non produites — ne sont
  pas « ouverts », ils sont **sans objet**. Les deux workflows cherchent une tâche (`TK-xxx`) dans le
  titre de la PR puis l'état d'implémentation qui la porte ; sans plan ni tâches, ils sortiraient
  immédiatement sur « porte non applicable ». `ci-audit.mjs` audite un dépôt qui **utilise** Tizi, et
  celui-ci ne l'utilise pas.

  Ce qui reste vrai malgré l'abandon : la moitié aval de la chaîne — conception, plan, implémentation,
  vérification de release — **n'a jamais tourné sur un cas réel**, et seul `exemple/`, qui est fabriqué,
  la couvre. Il faudra un autre dépôt pour l'exercer. L'adoption, elle, a tourné pour de vrai et a
  rapporté quatre défauts d'`adopt.mjs`, tous corrigés le jour même ; ses fichiers ont été supprimés,
  parce que les garder aurait activé le garde-fou TDD sur ce dépôt le jour où le plugin y serait activé.

## À trancher

- **Le plancher de Node.** `package.json` annonce `engines: >=18`, et `adopt.mjs` génère
  `node --test --test-reporter=junit` pour les projets Node, reporter qui n'existe pas sur toutes les
  versions couvertes par cette borne. Deux issues possibles, pas trois : remonter le plancher à la
  version qui porte le reporter, ou générer une commande compatible 18. Tant que ce n'est pas tranché,
  la configuration proposée peut être inexécutable sur la version minimale annoncée (constat nº 16).

- **Un quatrième statut de zone d'ombre : `sans_objet`.** Depuis que les questions du council
  s'enregistrent sans tri, une question hors sujet se ferme en `levée` avec la raison dans les mots de
  l'utilisateur. C'est un abus de langage : « on a trouvé la réponse » et « la question ne se posait
  pas » ne sont pas la même chose, et les confondre rend la mesure du council illisible — on ne peut
  plus compter combien de ses questions étaient hors sujet. Un quatrième statut serait plus honnête,
  mais il touche le gabarit des quatre skills et toutes les règles qui lisent ce champ.

## Pistes non tranchées

Chacune deviendra une issue à part une fois décidée.

- [ ] Commande `trace` : chaîne complète d'un identifiant, et mode « impact » pour une demande de
      changement ; lien règle métier → NFR
- [ ] Architecture de référence du produit, nourrie par chaque initiative livrée
- [ ] Référence du produit consolidée à chaque release ; notes de version générées ; documentation
      utilisateur dans la Definition of Done
- [ ] Grille de qualité ISO 29148 pour le BRD et le PRD (phase 2 du contrôle formel : le catalogue
      existant passe en mode bloquant, la grille s'y ajoute, et un autre modèle que le rédacteur
      l'applique)
- [ ] Parties prenantes : règle sur une partie prenante du quadrant « impliquer » jamais entendue. Le
      reste de l'item est fait — `S81` (source attribuée à qui n'a pas été entendu), `S83` (des besoins
      recueillis sans qu'aucun utilisateur direct ait parlé, `end_user`), `S84` (exigence validée sur
      des sources que personne n'a relues, `feedback`), `S94` (la représentation ne vaut pas une voix)
      et `S95` (un besoin porté par quelqu'un qu'on n'a pas entendu). La **dérogation nommée**, qui
      manquait, existe depuis le 28 octobre : toute règle se dérogé, avec sa raison écrite
- [ ] Hook qui protège les listes de contrôle de relecture contre l'écriture par un agent (S80 vérifie
      aujourd'hui après coup ; un hook refuserait avant)
- [x] Lancer l'audit indépendant (`evals/audit/tizi-auditor.md`) en contexte vierge et le comparer à
      l'audit mécanique — fait le 23 octobre, à refaire après chaque série de correctifs
