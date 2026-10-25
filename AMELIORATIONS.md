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

## Ouvert

- **`main` n'est pas protégée sur GitHub.** `ci-audit.mjs` le signale (« Branch not protected »,
  HTTP 404 avec un jeton sans droit d'administration), et personne ne l'a fait. Celui-là ne dépend pas
  de Tizi : quatre PR ont été fusionnées sur une branche que rien n'empêche de pousser en direct.
- **Les 23 règles jamais exercées.** Sur les 89 règles du catalogue (`scripts/lib/rules.mjs` : 81 `S` et 8 `L`), 23 ne
  sont déclenchées par aucun test ni aucune référence figée : `L04 S01 S02 S03 S06 S10 S15 S21 S25 S26
  S33 S34 S35 S37 S38 S39 S42 S46 S47 S49 S59 S62 S64`. Une règle jamais vue passer est une règle dont
  on ne sait pas si elle fonctionne.
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
- **Ce qui rend une zone d'ombre bloquante, en début de Discover.** Le critère existe
  (`phase-discover.md` : « on ne peut pas formuler correctement les objectifs ou les exigences sans la
  lever ») et il est vrai par construction au début de la phase, puisqu'aucun objectif n'est encore
  formulable : sur le dossier réel, **18 bloquantes sur 25** et **15 sur 19**. Conséquence mesurée dans
  `ask-five.mjs` : le terme `blocking ? 100 : 0` est constant sur 90 % de l'ensemble, donc il n'informe
  plus — c'est le poids du type qui ordonne encore (scores 153 · 134 · 134 · 133 · 133). Deux
  corrections possibles, pas trois : resserrer le critère (une zone ne bloque que si elle peut changer
  le périmètre ou empêcher le passage en Define), ou retirer `blocking` du score et le garder comme
  porte de sortie de phase. Il faudrait un second dossier réel pour trancher — sur un seul, on ne sait
  pas si 72 % de bloquantes est un défaut du critère ou l'état normal d'un cadrage sans aucune partie
  prenante entendue.

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
- [ ] Parties prenantes : dérogation nommée pour une partie prenante à impliquer jamais entendue ;
      exigence sans source confirmée signalée — la moitié basse est faite par `S81` (source attribuée à
      qui n'a pas été entendu) ; reste la dérogation nommée, qui est une décision, pas un contrôle
- [ ] Hook qui protège les listes de contrôle de relecture contre l'écriture par un agent (S80 vérifie
      aujourd'hui après coup ; un hook refuserait avant)
- [x] Lancer l'audit indépendant (`evals/audit/tizi-auditor.md`) en contexte vierge et le comparer à
      l'audit mécanique — fait le 23 octobre, à refaire après chaque série de correctifs
