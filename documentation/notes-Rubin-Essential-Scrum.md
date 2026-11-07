# Notes — Kenneth S. Rubin, *Essential Scrum: A Practical Guide to the Most Popular Agile Process* (Addison-Wesley, 2012), 498 p.

Lu en entier le 7 novembre 2026 : les 23 chapitres, le glossaire et la bibliographie. Les numéros de
page entre parenthèses sont ceux **du livre**, pas du fichier.

Ces notes suivent l'ordre des chapitres et gardent les **rapprochements relevés en chemin** : les
lignes `→ TIZI` disent ce que le passage change, confirme ou met en défaut dans le dépôt, et plusieurs
d'entre elles sont devenues des pistes d'`AMELIORATIONS.md`. Quand un chiffre du livre est repris, il
est repris tel quel — c'est à cela qu'elles servent : vérifier une correspondance du tableau des
sources sans rouvrir l'ouvrage.

Deux passages portent l'armature du skill d'audit à construire, et ce sont ceux à relire en premier :
le **chapitre 23** (une *pratique* Scrum est obligatoire, une *approche* est sa réalisation locale —
d'où : on n'audite jamais une approche contre une autre approche) et l'entrée **`assumption`** du
glossaire, qui est mot pour mot la distinction de Tizi entre un constat et un « non mesuré ».

## Ch1 Introduction (livre 1-10)
- Cynefin : simple / compliqué / complexe / chaotique / **désordre**. Scrum convient au complexe,
  passable en compliqué, inutile en simple, nuisible en chaotique. Travail interrompu en continu
  (support) → Kanban, pas Scrum. **Désordre = on ne sait pas dans quel domaine on est** ; on en
  sort en découpant la situation, pas en appliquant Scrum.
  → TIZI : aucune règle ne demande dans quel domaine on se trouve. Un audit devrait pouvoir dire
    « ce produit relève du compliqué, Scrum n'est pas l'outil » — et le dire sans le reprocher.

## Ch2 Cadre (livre 13-28)
- 3 rôles (PO, SM, équipe de dev), 5 activités (sprint planning, grooming, daily, review, retro),
  3 artefacts (product backlog, sprint backlog, increment potentiellement livrable) + **règles**.
- PO = **point unique d'autorité** sur le quoi et l'ordre ; dispo pour répondre « peu après » la question.
- Équipe 5-9 ; au-delà, plusieurs équipes, pas une grande.
- Taille avant priorité : « Size equates to cost, and product owners need to know an item's cost
  to properly determine its priority. » → **estimer est un préalable à ordonner**.
- forecast vs commitment : Rubin préfère *commitment* (confiance mutuelle, planif inter-équipes).
- « potentially shippable » = état de confiance : **pas de travail non fait matériellement important**.
- Daily : 3 questions, timebox 15 min, ni résolution de problème ni réunion de statut.
- Review = inspecter le **produit** (bidirectionnel) ; rétro = inspecter le **processus**, et elle se
  termine par un **nombre praticable d'actions d'amélioration engagées pour le sprint suivant**.

## Ch3 Principes agiles (livre 29-60)
22 principes en 6 familles. Ceux qui ont une traduction testable :
- Itératif ≠ incrémental. Itératif = stratégie de reprise planifiée ; incrémental = en construire une
  partie d'abord. **Anti-pattern nommé : WaterScrum / Scrummerfall** = un sprint par type de travail
  (sprint analyse, sprint design, sprint test).
  → TIZI : un sprint dont toutes les tâches sont du même type (analyse seule, test seul) est suspect.
- Incertitude **end (quoi) / means (comment) / customer (qui)** ; les réduire **simultanément**,
  pas l'une après l'autre.
  → TIZI : les trois incertitudes ne sont nommées nulle part. Candidat fort pour l'audit.
- Dernier moment responsable (LRM) : décider quand le coût de ne pas décider dépasse celui de décider.
- « On ne peut pas avoir raison d'emblée » : **beaucoup d'exigences écrites tôt = beaucoup d'exigences
  de mauvaise qualité** (fig 3.7 « danger zone »).
  → TIZI : un backlog massivement détaillé en entier est un défaut, pas une qualité. Inversion de
    l'intuition « plus c'est détaillé mieux c'est » → S-xxx sur la profondeur uniforme du backlog.
- Taille de lot économiquement sensée (tableau 3.2 : 7 bénéfices des petits lots).
- Inventaire / WIP : les exigences **sont** un stock ; trop de stock = gâchis au changement.
- « Focus on idle work, not idle workers » — surveiller le bâton, pas les coureurs.
- Cost of delay : 85 % des organisations ne le quantifient pas. Exemple chiffré documenteur : 75 K€
  de travailleur oisif contre 500 K€ de travail oisif.
- Progrès = **actifs validés en fonctionnement**, pas l'avancement dans les phases.
- Cérémonie minimalement suffisante. Scrum **n'est pas anti-document** : 4 raisons légitimes d'écrire
  (livrable produit, capturer une décision/accord, intégrer un arrivant, exigence réglementaire).
  → TIZI : c'est exactement la justification de l'existence de Tizi. À citer dans la doc.

## Ch4 Sprints (livre 61-78)
- Timebox : 6 bénéfices (limite de WIP, force la priorisation, montre le progrès, évite le
  perfectionnisme, motive la clôture, améliore la prévisibilité).
- **Durée constante** ; raisons valables de changer : essai 2 semaines, fêtes/fin d'exercice,
  release dans 1 semaine. **« Ne pas avoir fini n'est pas une raison valable »** ; rallonger d'un
  jour en fin de sprint est un symptôme de dysfonctionnement.
  → TIZI : règle « itération dont la durée diffère des précédentes sans motif déclaré ».
- **Sprint goal** : un but, un focus clair et unique (parfois double, « multifaceted »). Engagement
  **mutuel** : l'équipe s'engage à l'atteindre, le PO s'engage à ne pas le changer.
  → TIZI : une itération sans but énoncé ; un but à plus de deux focus ; un but changé en cours.
- **Changement vs clarification** — distinction opérationnelle : changement = altération du travail
  ou des ressources susceptible de générer du gâchis économique, de perturber le flux ou d'augmenter
  substantiellement la portée. Clarification = détail supplémentaire qui aide à atteindre le but.
  → TIZI : c'est **exactement** la distinction qu'il faut pour `S?` « portée modifiée en cours
    d'itération » : aujourd'hui Tizi ne distingue pas les deux.
- Investissement cumulé croissant : ready (grooming) → to do (planning) → doing → done.
  Le coût d'un changement croît avec l'état. → TIZI : graver cette échelle dans la règle.
- **Terminaison anormale** : le sprint s'arrête, on fait la rétro, on replanifie. 3 options de durée
  pour le sprint suivant (garder la durée, se resynchroniser court, se resynchroniser long).
  → TIZI : aucun chemin d'abandon d'itération n'existe. Trou.
- **Definition of Done** = checklist, dépend du produit/des technos/de l'organisation/**des obstacles
  actuels**. Minimum : une tranche complète conçue, construite, intégrée, testée, documentée.
  - « Si tu ne fais pas un type de test important chaque sprint, tu devras le faire un jour » →
    un sprint spécialisé (perf) = **pas** d'incrément potentiellement livrable.
  - La DoD **évolue** avec la lève des obstacles (exemples : labo clinique, « emulator done »).
  - Un défaut significatif le dernier jour → **l'élément n'est pas fait** ; il **retourne au product
    backlog au bon rang**, on ne rallonge pas le sprint.
  - **DoD ≠ critères d'acceptation** : la DoD s'applique à tous les PBI, les CA sont propres à
    l'élément. Fait = les deux. → TIZI : vérifie-t-on que les deux sont satisfaits ?
- « done-done » = béquille des équipes qui n'ont pas intériorisé « fait ».

## Ch5 Exigences et user stories (livre 79-98) — chapitre central pour Tizi
- Les exigences sont des **placeholders** (PBI), pas un contrat. Raffinement progressif : grandes et
  peu détaillées loin, petites et détaillées près. **Toutes au même niveau de détail = défaut**
  (4 inconvénients listés). → TIZI : règle sur la **granularité uniforme du backlog**.
- 3 C : **Card** (titre + essence, « As a <role> I want <goal> so that <benefit> », le « so that »
  est *optionnel mais à mettre sauf si l'intention est évidente pour tout le monde**),
  **Conversation** (la story est une *promesse de conversation*, pas un one-shot ; elle peut
  référencer un article, un croquis d'IHM, des règles métier),
  **Confirmation** (conditions de satisfaction = critères d'acceptation ; ATDD / specification by
  example ; les CA du PO ≠ les 10 à 100× plus de tests techniques de l'équipe).
- Niveaux : epic (mois, > une release) / feature (semaines, > un sprint) / story « sprintable »
  (jours) / **tâche (heures) = le comment, pas le quoi — ne pas mettre de détail de tâche dans une
  story** ; **theme** = collection de stories apparentées. Étiquettes de convenance, mais à employer
  **de façon cohérente**.
- **INVEST** :
  - I : minimiser les dépendances, pas les éliminer.
  - N : les détails se négocient ; **violation typique : le PO dicte le comment**. Exception légitime :
    obligation réglementaire ou contrainte technique → story « moins négociable », c'est permis.
  - V : **toutes** les stories doivent être valables (« Not all stories are independent, and not all
    stories are fully negotiable, but they all must be valuable »).
    **Stories techniques** : la plupart **ne doivent pas** être au product backlog — ce sont des
    tâches de la DoD (contre-exemple donné : « builds automatiques »). Une story technique n'y entre
    que si le PO comprend la valeur qu'il paye (exemple accepté : migration Oracle non supportée).
  - E : estimable ; si l'équipe n'y arrive pas → trop grosse/ambiguë, ou connaissance manquante →
    activité d'exploration.
  - S : **« sized appropriately »** — un epic à un an est correctement dimensionné ; le découper
    aujourd'hui serait du gâchis. **Grand ≠ mauvais**. Le critère dépend de **quand** on le fera.
  - T : testable en binaire. **Les epics n'ont pas besoin de tests.** Et il existe des exigences
    valables **non testables** (« 99,999 % de disponibilité ») : critères clairs, aucun test
    praticable, et l'exigence reste utile car elle guide la conception.
    → TIZI : « non mesurable » est **dans le livre**. Conforte les trois états de verdict.
- **Exigences non fonctionnelles** = contraintes de niveau système, affectent la conception et le test
  de **presque toutes** les stories. « Chaque NFR est une cible de premier choix pour la DoD » ;
  recommandation explicite : en mettre **le plus possible dans la DoD**.
  → TIZI : règle « NFR qui n'apparaît dans aucune DoD » — forte, mesurable, et absente aujourd'hui.
- **Stories d'acquisition de connaissance** (prototype, PoC, spike, étude) : coût **borné** (« aucun
  bon PO n'autorise une exploration non bornée »), **livrable** (mémo : expériences, résultats,
  recommandation), et **justification économique** : valeur de l'information > coût. Exemple chiffré :
  10 K$ pour une info d'espérance 250 K$ → oui ; espérance 7,5 K$ → non, mieux vaut tirer à pile ou face.
  → TIZI : règle « story d'exploration sans coût borné / sans livrable / sans justification ».
- Récolte : atelier d'écriture (quelques heures à quelques jours, **jamais** la spéc complète),
  **analyse des rôles utilisateurs** d'abord, **personas** nommés (« En tant que Lilly… »),
  top-down ou bottom-up indifféremment. **Story mapping** (Patton) : epics en haut, thèmes rangés
  **horizontalement dans l'ordre du workflow**, stories **verticalement par priorité**.
  « Les utilisateurs sont de meilleurs critiques que de meilleurs auteurs. »
  → TIZI : le story map donne un contrôle de **complétude d'un workflow** (trou dans une séquence).

## Ch6 Product backlog (livre 99-118)
- Types de PBI : feature, **change**, **defect**, **technical improvement**, **knowledge acquisition**.
  → TIZI : le backlog ne connaît-il que des stories ? Les 5 types sont une grille d'audit.
- **DEEP** (Pichler/Cohn) : **D**etailed appropriately, **E**mergent, **E**stimated, **P**rioritized.
  C'est l'INVEST du backlog, et **Tizi n'a aucune règle de niveau backlog équivalente**.
  - D : haut = petit et détaillé, bas = gros et peu détaillé. Raffiner trop tôt = gâchis ; trop tard =
    on bloque le flux.
  - E(mergent) : **jamais complet ni gelé** ; à chaque ajout, le PO rééquilibre et réordonne.
  - E(stimated) : taille sur chaque élément ; **un élément gros ET haut dans le backlog est un signal
    d'alerte** (il faut le raffiner avant de le prendre). Les très gros du bas peuvent n'avoir aucune
    estimation ou une taille T-shirt.
  - P : **il est improbable que tout le backlog soit priorisé** ; prioriser au-delà de la release 1 est
    probablement du temps perdu. → TIZI : « backlog entièrement priorisé » est un **défaut**, pas une
    qualité. Encore une inversion d'intuition.
- **Grooming** = créer/raffiner + estimer + prioriser. Décideur unique : le PO, mais collaboratif
  (parties prenantes internes/externes, SM, équipe). **Jusqu'à 10 % du temps de l'équipe par sprint.**
  Quand : initialement au release planning, puis atelier hebdo ou une fois par sprint, ou après le
  daily, ou pendant la review. « Quand importe moins que l'intégration au flux. »
- **Definition of Ready** — checklist (table 6.2), 7 points :
  1. valeur métier clairement énoncée ; 2. détails suffisamment compris par l'équipe pour décider ;
  3. **dépendances identifiées, aucune dépendance externe bloquante** ; 4. équipe staffée pour le faire ;
  5. **estimé et assez petit pour tenir confortablement dans un sprint** ; 6. **critères d'acceptation
  clairs et testables** ; 7. **critères de performance, s'il y en a, définis et testables** ;
  8. l'équipe sait **comment le démontrer** à la review.
  → TIZI : `storyReadiness` a 9 conditions ; comparer une à une avec cette liste. Le point 8
    (« savoir comment le démontrer ») et le point 4 (staffing) n'existent probablement pas.
- Vue release : **must have / nice to have / won't have** (deux lignes, trois zones).
  → TIZI : le MoSCoW tronqué existe-t-il ? « won't have » explicite est un contrôle de périmètre.
- Flux : le backlog est un **pipeline**. Trop lent → le pipeline s'assèche, l'équipe ne peut plus
  planifier ; trop rapide → stock d'exigences à refaire. Heuristique : **2 à 3 sprints de stock prêt**
  (5 PBI/sprint → 10-15 prêts).
  → TIZI : règle chiffrée et mesurable sur le stock de stories prêtes. Absente.
- **Un produit, un backlog.** Produit = ce qu'un client paierait et qu'on emballe pour vendre
  (« le PID d'IBM »). Grands produits → **backlogs hiérarchiques** (portefeuille/epics →
  programme/features → équipe/stories). Équipes non interchangeables → **vues** du backlog unique,
  pas des backlogs d'équipe. Une équipe/plusieurs produits → éviter, sinon fusionner les backlogs.

## Ch7 Estimation et vélocité (livre 119-138)
- Trois niveaux, trois unités : portefeuille → **tailles T-shirt** ; product backlog → **story points
  ou jours idéaux** ; sprint backlog → **heures d'effort**.
  → TIZI : règle de cohérence d'unité par niveau ; un PBI chiffré en heures est un mélange de niveaux.
- **Qui estime** : « les gens qui feront le travail ». Le PO décrit et clarifie (**sans ancrer**),
  le SM coache, **ni l'un ni l'autre n'estime**.
- **Estimation ≠ engagement** (démo des mains qui s'écartent quand le bonus en dépend).
- **Exactitude sans précision excessive** : rendements décroissants, puis zone « nuisible et gâchée ».
  Exemples d'absurdité : « 10 275 heures », « 132 865,87 $ ».
  → TIZI : une estimation à la décimale ou à l'heure près sur un gros élément est un défaut.
- **Taille relative** plutôt qu'absolue (démo du projecteur). Échelle Fibonacci modifiée
  1,2,3,5,8,13,20,40,100 ; **13 = souvent le plus gros qu'on mette dans un sprint** ; ∞ = trop gros
  pour un nombre ; ? = je ne comprends pas (**« il est acceptable de ne pas estimer, il est
  inacceptable de ne pas participer »**) ; π = pause.
  → TIZI : « taille hors échelle » (un 4, un 7) est mesurable ; « 0 » = déjà fait ou négligeable.
- Planning Poker : consensus, pas de moyenne, pas de nombre hors échelle, 2-3 tours. **La valeur
  principale est la discussion**, pas le nombre.
- **Vélocité** = somme des tailles des PBI **terminés** ; un PBI partiel compte zéro. Elle mesure
  l'**output** (taille livrée), **pas l'outcome** (valeur livrée).
  → TIZI : distinction output/outcome à inscrire quelque part ; une « vélocité » qui compte du partiel
    est un défaut dur.
- **Toujours une fourchette** (« 25 à 30 »), jamais un nombre unique, pour rester exact sans être
  précis. Nouvelle équipe → prévision par planification de deux sprints, puis **jeter la prévision dès
  la première mesure réelle**.
- Vélocité : plateaux, pas croissance perpétuelle ; outils/formation/composition font **baisser** avant
  de monter ; **les heures sup créent un creux plus grand que la bosse**.
- **Mésusages** : vélocité comme mesure de performance, comparaison inter-équipes (bases d'estimation
  différentes), **inflation des points**, et pire : rogner sur la qualité pour « faire » plus → dette.

## Ch8 Dette technique (livre 139-162)
- Définition d'origine (Cunningham 1992) : livrer du code la première fois, c'est emprunter ; **le
  danger est de ne pas rembourser**. Le terme a dérivé vers un fourre-tout : mauvaise conception
  devenue inadaptée, défauts connus non traités, couverture de test insuffisante, **test manuel
  excessif**, intégration/release pénibles, **manque d'expérience plateforme**.
- **Trois dettes, trois causes, trois traitements** :
  - **naïve** (imprudente, involontaire, « mess ») — immaturité d'équipe/organisation/processus.
    Se **supprime** par la formation et les bonnes pratiques. **Cunningham n'incluait pas celle-là.**
  - **inévitable** — imprévisible et impossible à prévenir (la bonne conception émerge ; un composant
    tiers évolue). On ne la gère pas en amont : on la **rend visible** et on la **sert** quand on la découvre.
  - **stratégique** (délibérée) — outil économique : être premier sur le marché, survivre jusqu'au revenu.
  → TIZI : c'est une **typologie de verdict**, pas un reproche unique. Un audit qui dit « dette » sans
    dire laquelle des trois ne dit rien d'actionnable.
- 9 conséquences, dont **point de bascule imprévisible et non linéaire** et **prévisibilité détruite**
  (« les estimations deviennent mauvaises même pour les plus expérimentés »).
- Cause mécanique (fig 8.3/8.4) : date désirée + périmètre figé + vélocité réelle < vélocité projetée
  → on exige la « vélocité accélérée » → **l'aire du triangle est la dette accumulée**.
  → TIZI : règle **mesurable** — un plan où date et périmètre sont tous deux figés et où la vélocité
    constatée est inférieure à la vélocité requise **produit de la dette**, nommément.
- **Mythe** : moins de test = plus vite. Réalité : plus de dette **et** plus lent.
- Trois gestes : **gérer l'accumulation** (bonnes pratiques + **DoD forte** — « opérer sans DoD forte,
  c'est délivrer une licence d'accumuler de la dette ») / **rendre visible** / **servir**.
- Économie : tableau 8.1 — le calcul honnête ajoute **X** (coût du délai causé par le remboursement),
  **Y** (intérêts à vie si on ne rembourse jamais), **Z**. « En cas de doute, pencher du côté de ne pas
  prendre la dette : les organisations sous-estiment son coût et ne remboursent pas autant qu'elles le croient. »
- Rendre visible : au **niveau métier** (bilan comptable ; ou **coût par point** : 20 K$/sprint à
  20 points = 1 K$/point, vélocité divisée par deux = 2 K$/point → 200 K$ devient 400 K$) et au
  **niveau technique** (dans le suivi de défauts **étiquetée**, dans le product backlog, ou dans un
  **backlog de dette** affiché à côté du sprint backlog).
- Trois statuts : **happened-upon** (rencontrée), **known** (connue et visible), **targeted** (visée
  pour ce sprint). Algorithme en 3 pas.
- Servir : **toute la dette ne doit pas être remboursée** (produit en fin de vie, prototype jetable,
  produit à vie courte — anecdote des 14 M$ en une heure et « trois mois de vie ») ; **règle du scout** ;
  **remboursement incrémental** — « je m'inquiète quand j'entends parler de *sprints de refactoring* :
  ce sont des remboursements ballon » ; **la dette à fort intérêt d'abord** (module très modifié et très
  dépendu, contre code jamais touché) ; et surtout **rembourser en faisant du travail de valeur client**
  (5 avantages listés), en tirant la carte de dette dans le sprint quand la story touche la même zone.
  → TIZI : « sprint dont le seul contenu est de la dette » = signal, pas une vertu. Et « dette dans une
    zone jamais modifiée » = ne pas la reprocher.

## Ch9 Product owner (livre 165-184)
- Regarde **dans deux directions** : parties prenantes (il est *product manager*) et équipe (il est
  *business analyst* et *acceptance tester*). Il n'écrit pas les tests de détail mais s'assure que les
  tests de haut niveau existent.
- 6 responsabilités : gérer l'**économie** (release / sprint / backlog), participer à la planification,
  piloter le grooming, **définir les critères d'acceptation et vérifier qu'ils sont satisfaits**,
  collaborer avec l'équipe, collaborer avec les parties prenantes.
  - Économie de release : à la **fin de chaque sprint**, décision de financer le suivant — y compris
    **arrêter tôt** (« après le sprint 7, le coût des éléments restants dépasse leur valeur »).
  - Économie de sprint : « signerais-je un chèque personnel du coût de ce sprint pour ces features ? »
  - **Les CA doivent exister avant que l'élément soit examiné en sprint planning** (d'où leur place
    dans la DoR), et le PO doit **vérifier pendant l'exécution, pas à la review** (sinon la review
    découvre les malentendus trop tard) ; **seules les features terminées sont démontrées**.
- Engagement : courbe en U (traditionnel) contre **engagement élevé constant** (Scrum).
- Caractéristiques : **habilité à décider** (« une personne non habilitée n'est pas un PO »), décisif,
  **ne revient pas sur ses décisions sans raison**, disponible, **temps plein** (« à temps partiel,
  c'est une recette pour l'échec »), **responsable des résultats métier**.
- Qui : interne → **une personne du métier bénéficiaire** ; commercial → product manager/marketing ;
  **externalisé → quelqu'un du client qui paye** (« bon/mauvais » explicite ; le contrat au forfait
  pousse le prestataire à prendre le rôle, ce qui est le mauvais schéma — mieux : louer l'équipe) ;
  équipe de composants → **un PO technique**.
- **PO et SM ne doivent jamais être la même personne** (conflit d'intérêts) ; PO + membre de l'équipe
  est possible ; un PO peut servir plusieurs équipes.
- **Équipe de PO** acceptable s'il reste **un décideur unique** et que ça ne dégénère pas en comité.
  « Un PO non habilité n'a pas besoin d'un comité, il a besoin d'un autre rôle. » Un PO débordé cache
  souvent un vrai problème : **trop de projets lancés en parallèle**, produit trop gros, mauvaise
  structure d'équipes ou de backlogs. **Proxy PO** possible, à condition de l'habiliter réellement.
  Très grands produits → **chief product owner** hiérarchique, décisions **restant au plus bas niveau**.

## Ch10 ScrumMaster (livre 185-193)
- 6 responsabilités : coach, **serviteur-leader** (« que puis-je faire pour vous aider ? »),
  **autorité de processus** (sans autorité managériale : ne recrute pas, ne dicte pas les tâches,
  **n'est pas responsable que le travail soit fait**), **bouclier**, **leveur d'obstacles**
  (quand l'équipe ne peut pas raisonnablement le faire elle-même), **agent du changement**.
- Caractéristiques : savante, **questionneuse** (« ne répond presque jamais directement »), patiente,
  collaborative, protectrice (chien de berger), **transparente** (« aucune place pour un agenda caché »).
- Pas forcément temps plein ; mieux vaut **un SM pour plusieurs équipes** que SM + membre d'équipe
  (conflit : les obstacles arrivent sans prévenir et mangent le temps de tâche).

## Ch11 Équipe de développement (livre 195-211)
- **Pas d'équipes par rôle** : l'équipe fait conception + dev + intégration + test dans le sprint.
  Une équipe de test séparée n'est justifiée que par une **obligation réglementaire**.
- 5 responsabilités : exécuter le sprint, **inspecter et adapter chaque jour** (si des membres ne
  participent pas au daily, l'équipe perd la vue d'ensemble), **groomer (jusqu'à 10 % de la capacité)**,
  planifier (2 semaines → ~une demi-journée ; 4 semaines → jusqu'à une journée), inspecter/adapter
  produit et processus.
- 10 caractéristiques : auto-organisée (métaphore des oies : règles locales + feedback, pas de plan
  descendant) ; **diverse et suffisante** (mélange senior/junior) ; **compétences en T** (profondeur +
  capacité à sortir de sa spécialité ; les spécialistes purs existent, on les répartit sans en faire un
  goulot) ; **attitude mousquetaire** (« je ne veux jamais entendre : j'ai fini ma part, tu n'as pas
  fini la tienne, donc on a échoué ») ; communication **à haut débit** (N(N−1)/2 canaux : 5 → 10,
  10 → 45) ; communication **transparente** (principe de moindre étonnement) ; **5 à 9, idéal 5 à 7**
  (6 raisons de Cohn, dont **social loafing** et « personne ne peut se fondre dans le décor ») ;
  **focalisée et engagée** (figure 11.8 : le travail à valeur ajoutée culmine à **2 projets** et
  s'écroule à partir de 3 ; **« impliqué » n'est pas « engagé »** — la personne multi-projets doit le
  dire clairement) ; **rythme soutenable** (intensité plate d'un sprint à l'autre, contre la montée
  finale du séquentiel) ; **durable dans le temps** (Katz, Staats ; forming-storming-norming-performing ;
  **« la monnaie de l'agilité, c'est l'équipe »** ; déplacer les équipes de produit en produit coûte
  moins que déplacer les personnes ; exceptions : équipe non soudée, ou **split-and-seed** assumé).

## Ch12 Structures d'équipes (livre 213-223)
- **Feature team** (traverse les composants, prend un élément du backlog et le finit) contre
  **component team** (ne produit qu'un morceau). **Scrum préfère les feature teams.**
  Raison invoquée pour les équipes de composants : « seuls les experts touchent ce code sans le casser ».
  Conséquence mesurée : **points de défaillance multipliés** — la feature n'est pas finie parce qu'une
  équipe sur trois ne l'a pas finie et avait 15 demandes concurrentes.
  → TIZI : règle « une story dont la réalisation est répartie entre plusieurs équipes sans équipe
    responsable du résultat complet » ; et le symptôme textuel « reste à intégrer par l'équipe X ».
- Modèle mixte (fig 12.3) : feature teams + équipes de composants gardiennes, avec des membres
  **pollinisateurs et moissonneurs**.
- **Scrum of scrums** : pas tous les jours, quelques fois par semaine ; 3 questions tournées vers les
  **autres** équipes (« ce que mon équipe a fait qui peut affecter les autres », etc.).
- **Release train** (Leffingwell) : **dates fixes, qualité fixe, périmètre variable** ; itérations de
  même longueur **alignées** ; jalons globaux objectifs ; intégration continue au niveau système ;
  PSI tous les 60-120 jours ; **sprints de durcissement** possibles *(et leur besoin doit diminuer
  avec la maturité)* ; les composants d'infrastructure **doivent avoir de l'avance**.
  Backlog d'entreprise à **3 niveaux** : portefeuille (epics) / programme (features) / équipe (stories).

## Ch13 Managers (livre 225-243)
- Enquête 2011 : **frein n° 1 à l'adoption = sentiment de perte de contrôle managérial** (33 %),
  puis manque de planification initiale (33 %), opposition du management (32 %), **manque de
  documentation (30 %)**, manque de prévisibilité (28 %).
  → TIZI : « manque de documentation » est le 4e frein cité. Argument direct pour l'existence de Tizi.
- 4 familles : **façonner** les équipes (définir les limites/bac à sable, **donner un but clair et
  élevé**, composer les équipes, changer la composition, **habiliter**), **nourrir** (énergiser,
  développer la compétence, **leadership de domaine**, **maintenir l'intégrité de l'équipe** — ne pas
  retirer quelqu'un en cours de sprint), **aligner l'environnement** (valeurs agiles, obstacles
  organisationnels, **aligner les groupes internes** — déploiement, ventes, RH — et **les partenaires**),
  **gérer le flux de création de valeur**.
- **7 niveaux d'autorité d'Appelo** (tell / sell / consult / agree / advise / inquire / delegate), avec
  exemples : **longueur de sprint = inquire**, **règles de codage = delegate**, choix d'architecture =
  advise, nouveaux membres = consult.
  → TIZI : excellente grille pour qualifier une décision dans un plan : qui a décidé, à quel niveau.
- Mesures : « mesurer **quand et combien de fois le flux est empêché**, pas combien on sait occuper les
  gens » → **cycle time**. Progrès = actifs validés. **Comptabilité d'innovation** (Ries) :
  MVP → métriques actionnables → améliorer → **persevere ou pivot**.
- **Chef de projet** : les 9 responsabilités du PMI sont **réparties** (tableau 13.3) — périmètre
  macro au PO / sprint à l'équipe, temps macro au PO, coût estimé par l'équipe, qualité partagée par
  les quatre, risque partagé par les quatre, approvisionnement PO + autre manager. Un rôle séparé ne se
  conserve qu'à **très grande échelle**, et alors **comme assistant** : « les équipes gardent la
  propriété de la coordination ».
  → TIZI : le tableau 13.3 est une **matrice de responsabilité vérifiable** — pour chacune des 9
    activités, le plan dit-il qui s'en occupe ?

## Ch14 Principes de planification (livre 247-255)
- « Les équipes passent souvent **plus** de temps à planifier avec Scrum qu'en traditionnel ; ça se
  sent juste différemment. »  → À citer : Tizi n'est pas « moins de plan », c'est « le plan au bon moment ».
- Métaphore du skieur extrême : il **ne planifie pas toute la descente**, il choisit un point plus bas
  et **deux ou trois virages**, mais il **étudie le terrain d'en haut** avant de partir.
- **« Quand la carte et le terrain ne concordent pas, croire le terrain. »** (SAS Survival Guide)
  Un plan initial « encode très exactement notre ignorance initiale ».
- Stock de planification : 3 gâchis d'un grand plan initial (le produire, le **mettre à jour**, et
  l'opportunité perdue). Test de George : son nom sur une tâche à 18 mois a une probabilité ~0.
  → TIZI : règle **mesurable** — une tâche nominativement affectée au-delà de l'horizon de la release
    est de la fausse précision.
- **Releases plus petites et plus fréquentes** : tableau 14.1/14.2 chiffré — 1 release/an → RSI 9,1 % ;
  semestrielle → 15,7 % ; trimestrielle → 19,5 %. Limite : il existe un **ensemble minimal
  commercialisable**. Vocabulaire : investissement / autofinancement / seuil / remboursement.
- **Pivot** (Ries) : « correction de cap structurée pour tester une nouvelle hypothèse fondamentale ».

## Ch15 Planification multi-niveaux (livre 257-265)
- Tableau 15.1, **5 niveaux** (horizon / qui / objet / livrables) :
  portefeuille (≥ un an ; parties prenantes + POs ; backlog de portefeuille) ·
  **produit/envisioning** (plusieurs mois ; PO + parties prenantes ; **vision, roadmap, features de
  haut niveau**) · **release** (**trois à neuf mois** ; toute l'équipe + parties prenantes ;
  équilibrer valeur et qualité contre périmètre/calendrier/budget ; plan de release) ·
  **sprint** (but du sprint + sprint backlog) · **daily** (inspection et réorganisation du jour).
  → TIZI : les 5 niveaux et leurs livrables forment une **grille de complétude d'audit**. Scrum ne
    définit formellement que sprint et daily ; les trois autres sont « bénéfiques ».
- **Vision** : forme donnée en exemple — « Pour <qui> intéressés par <quoi>, le nouveau X sera <la
  promesse> ». Exemple réel Scrum Alliance cité intégralement.
- **Product roadmap** (format Hohmann) : lignes = market map / feature-benefit map / architecture map /
  **market events** / release schedule ; colonnes = trimestres. Un roadmap peut mêler une release
  **à périmètre figé** (0.5) et une release **à date figée** (1.0).
  → TIZI : un roadmap sans **événements de marché** ni distinction date-figée/périmètre-figé est muet.
- « Deviner les features au-delà de deux sprints est presque toujours inutile et viole le juste-à-temps. »

## Ch16 Planification de portefeuille (livre 267-285) — 11 stratégies
- Entrées : produits nouvellement envisionnés + **produits en cours** (avec retours clients
  intermédiaires, estimations mises à jour, **niveau de dette technique**, données de marché).
- **Ordonnancement** : optimiser les **profits de cycle de vie** du *portefeuille* (quitte à
  sous-optimiser un produit) ; les deux variables qui comptent sont **coût du délai** et **durée** →
  tableau 16.1 : coûts de délai égaux → **plus court d'abord** ; durées égales → **coût de délai le
  plus élevé d'abord** ; les deux varient → **WSJF = coût du délai / durée**.
- **Coût du délai** : « haut profit d'abord » est le choix fréquent et **souvent faux** (exemple :
  RSI 20 % avec 5 K$/mois contre RSI 15 % avec 75 K$/mois). Modèle de Leffingwell en 3 attributs
  notés 1-10 : **valeur utilisateur**, **décroissance dans le temps**, **réduction de risque /
  ouverture d'opportunité**. Et **6 profils** de coût de délai (fig 16.3) : linéaire, **gros coût fixe**,
  **à faire maintenant**, **date fixe** (coût nul jusqu'à la date, puis tout d'un coup),
  logarithmique, **intangible** (« exemple : la dette technique »).
  → TIZI : le **profil** de coût de délai est une qualification bien plus juste qu'une priorité MoSCoW.
    Candidat majeur pour l'audit d'un backlog priorisé sans justification.
- **Exactitude, pas précision** : tailles T-shirt → fourchettes de coût (XS 10-25 K$ … XL > 350 K$).
  Anecdote : « M = 50-125 K$ » a été aussi utile que l'estimation de 72 381,27 $, pour un coût nul.
- **Flux entrant** : **filtre économique** — « approuver vite ce qui est écrasant, rejeter le reste ;
  **si on chipote sur un petit écart de valeur ou de coût, c'est un refus** » ; **équilibrer le taux
  d'arrivée et de départ** (l'autocar de retraités au restaurant ; le planning stratégique annuel qui
  déverse tout le portefeuille d'un coup **viole le dernier moment responsable et la taille de lot**) ;
  **saisir vite les opportunités émergentes** (leur valeur décroît très vite) ; **petites releases**
  pour éviter l'**effet de convoi** (le tracteur sur la route à une voie) — exemple de politique :
  **aucun effort produit de plus de neuf mois**, sinon rejet et redécoupage. Et le poison culturel :
  **« on ne peut jamais supposer qu'il y aura une deuxième release »** → on charge la première.
- **Flux sortant** : travail oisif plutôt que travailleurs oisifs ; **limite de WIP dont l'unité est
  l'équipe**, pas la personne (fig 16.8) ; **attendre une équipe complète** avant de démarrer un produit.
- **En cours : économie marginale** — le passé est un coût irrécupérable. Quatre options
  (fig 16.9) : **preserve / deliver / pivot / terminate**, avec l'arbre : prochain investissement
  justifié ? sinon a-t-on les **features minimales livrables** ? sinon un autre chemin à tenter ?
  Anecdote : le ratio coût/bénéfice divisé par 100 et la décision de continuer **pour des raisons
  comptables** (capitaliser au lieu de passer en charge).
- Si on ne devait en garder que quatre : **coût du délai, petites releases fréquentes, limite de WIP,
  économie marginale**.

## Ch17 Envisioning / planification produit (livre 287-306)
- Une **idée** passe d'abord le **filtre stratégique** (cohérence avec la direction stratégique), puis
  l'envisioning, puis le **filtre économique** du portefeuille. Deux filtres distincts.
- Entrées de l'envisioning (fig 17.2), à considérer **simultanément, pas linéairement** :
  idée (ou idée pivotée), **horizon de planification**, **date de fin attendue**, **ressources
  disponibles**, et **seuil de confiance** = « la *definition of done* de l'envisioning » = ce que les
  décideurs doivent savoir pour un go/no-go.
  → TIZI : **le seuil de confiance est un objet à déclarer**. Un BRD/PRD sans seuil de confiance
    déclaré ne dit pas quand il est fini. Candidat de règle très fort, et très « Tizi ».
- Participants : **le PO est le seul requis** ; idéalement le SM et l'équipe (souvent indisponibles car
  non financés — et Rubin le dit comme une **limite subie**, pas une norme).
- **Vision** : « si on a besoin de plusieurs centaines de pages, on ne la comprend probablement pas ».
  Référence : Kennedy, **31 mots**. **7 formats** (tableau 17.1) : *elevator statement*, *product
  datasheet*, **boîte produit**, 2-3 slides de conférence utilisateur, **communiqué de presse**,
  **critique de magazine fictive**. Et **16 aires de valeur** (fig 17.3) en 4 familles :
  **réducteur de coût** / **conditions d'entrée** (parité, features minimales requises, **conformité
  SOX/FDA/HIPAA**) / **différenciateur** / **spoiler** (supprimer le différenciateur du concurrent,
  relever la barre de parité, **changer les règles du jeu**).
  → TIZI : les 16 aires de valeur sont une **grille de qualification de la valeur d'un BRD**.
- Backlog initial = **epics** alignés sur la vision. Roadmap = séries de releases, chacune avec un
  **objectif de release clair** et un ensemble de **MRF (minimum releasable features)**
  (= MVP = MMF) : « le plus petit ensemble de must-have ».
  Facteurs du roadmap : **segments de clientèle** (ici « utilisateur typique » vs « sophistiqué »),
  **enjeux d'architecture/technologie**, **événements de marché**. Option : **releases périodiques
  fixes** (une par trimestre) — cadence prévisible, et si les MRF prennent moins, on ajoute du
  nice-to-have.
- **Sprint d'acquisition de connaissance** pendant l'envisioning : exemple complet du *storyboard* —
  page HTML bidon, filtrage **fait à la main par des experts**, utilisateurs non informés, comparaison
  des préférences. « Roger n'a aucune intention de développer la technologie à ce stade. »
  → TIZI : le **Wizard of Oz** comme forme légitime de validation. Rien dans Tizi n'en parle.
- **Envisioning économiquement sensé** (fig 17.7, 6 lignes directrices) :
  **seuil de confiance réaliste** (fig 17.8 : relever la barre coûte du temps, **crée du stock non
  validé**, **ne donne qu'une illusion de certitude** et **augmente le risque de mauvaise décision**) ·
  **horizon court** · **agir vite** (« le chrono du marché démarre à l'idée, pas au premier sprint » ;
  réduction de cycle « au rayon des soldes » selon Smith & Reinertsen) · **payer pour de
  l'apprentissage validé** (méfiance envers l'information prédictive non validée) ·
  **financement incrémental/provisoire** (fig 17.10 : overhead → envisioning → release 1 →
  **sprint par sprint**) · **apprendre vite et pivoter**.
- Fig 17.9, « décision sous l'illusion de certitude » : le dialogue est à citer tel quel —
  « Waouh, c'est très détaillé, vous devez vraiment maîtriser ! » / « Ah, le début oui, mais tout ce
  qui est loin, c'est de la pure devinette. »
  → TIZI : **le niveau de détail d'un document est pris pour une preuve de maîtrise.** C'est la
    justification la plus forte d'un audit qui distingue *constaté* de *non mesurable*.

## Ch18 Planification de release (livre 307-330)
- Cadences : après plusieurs sprints / à chaque sprint / **à chaque feature (déploiement continu)**.
  Synonymes acceptés de « release planning » : *longer-term planning*, *milestone-driven planning*.
- Activité **de chaque sprint**, pas un événement unique. Initiale : **un ou deux jours**.
- Entrées : vision, backlog de haut niveau, roadmap, **et la vélocité** (connue ou prévue).
  Activités : **revoir les contraintes**, groomer, **revoir les MRF**, **sprint mapping**.
  Sorties : **fourchette de features, fourchette de sprints, fourchette de coûts (ou coût fixe),
  MRF, sprint map**.
- **Tableau 18.1, les 4 combinaisons de contraintes** : *fixed everything* (**non recommandé**) ;
  *fixed scope + date* (**non recommandé** ; « le jeu du poulet » fig 18.4 — l'un des deux cède, sinon
  **la collision produit de la dette**) ; *fixed scope* (le budget **n'est pas vraiment fixe** : plus
  de temps = plus de salaires) ; *fixed date* (**le plus aligné avec Scrum**).
  « Si on sur-contraint les trois, **c'est la qualité qui devient la variable** » → dette.
  Brooks cité deux fois : « neuf femmes ne font pas un bébé en un mois », « ajouter des gens à un
  projet en retard le retarde davantage ». Et : « budget flexible » veut dire en pratique
  **les mêmes personnes qui travaillent plus d'heures** → viole le rythme soutenable.
  → TIZI : règle **S-xxx** : un plan dont **périmètre, date et budget sont tous déclarés figés** est
    structurellement faux ; nommer laquelle des trois (ou la qualité) cèdera.
- **MRF** : le PO en est responsable, en collaboration. Problème fréquent : **désaccord ou accord
  passif-agressif sur les MRF** → décision impossible quand il faut couper. Les MRF se définissent
  **en connaissant les coûts** (sinon on ne sait pas si elles sont viables → pivot).
- **Sprint mapping** : utile sur deux-trois sprints, surtout en multi-équipes (*rolling look-ahead*,
  Cohn) ; la décision finale reste au **dernier moment responsable** = le sprint planning.
- **Planification à date fixe, 5 étapes** (tableau 18.2) : nombre de sprints par calcul calendaire →
  groomer assez profond → **vélocité en fourchette** → ligne « **will have** » (vélocité basse ×
  sprints) → ligne « **might have** » (vélocité haute × sprints). Trois zones :
  **will have / might have / won't have**, croisées avec la **ligne must-have** → trois verdicts
  (fig 18.9) : *bonne nouvelle / peut-être / mauvaise nouvelle*.
  **Règle du pouce : les MRF doivent occuper 60-70 % de la release, pas 100 %** — deux raisons :
  sinon on n'a rien à couper, et sinon on ne peut pas absorber un must-have émergent.
  → TIZI : règle **chiffrée et mesurable** sur la proportion de must-have d'une release.
- **Planification à périmètre fixe, 5 étapes** (tableau 18.3) : somme des tailles ÷ vélocité haute
  (arrondi sup.) → nombre minimal de sprints ; ÷ vélocité basse → maximal. Exemple : 150 points,
  18-22 → **7 à 9 sprints**. « Si on réduit vraiment les MRF au minimum, un périmètre fixe se
  transforme presque toujours en une série de petites releases à date fixe. »
  Et la réplique sur les standards : « on ne peut pas livrer la moitié d'un standard » → si, les parties
  optionnelles existent, et on peut dire ce qu'on supporte.
- **Coût** (tableau 18.4) : composition × longueur de sprint → coût par sprint ; date fixe → coût fixe ;
  périmètre fixe → **fourchette, et on budgète le haut**. Variante : **coût par point historique**.
- **Communication** : burndown et burnup de release (**fourchette : lignes basse/haute/moyenne**) ;
  burnup **à périmètre variable** (on **relève la ligne de cible** au sprint où le périmètre augmente) ;
  et pour une **date fixe**, les burndown/burnup classiques **ne marchent pas** → **burnup à backlog
  inversé** (fig 18.14), la plus haute priorité **en bas**.
  → TIZI : si Tizi produit un suivi d'avancement, le graphique dépend du type de contrainte. Un seul
    format pour les deux est une erreur de méthode.

## Ch19 Sprint planning (livre 335-346)
- 4 à 8 heures pour un sprint de 2 semaines à un mois. Le SM **ne décide pas** de l'engagement mais
  **peut le contester** pour qu'il soit réaliste.
- **5 entrées** (tableau 19.1) : backlog dont le haut est **ready**, **vélocité historique**,
  **contraintes** business/techniques, **capacités de l'équipe** (qui, quelles compétences,
  **quelle disponibilité**), **but de sprint initial** du PO — à communiquer **sans pousser l'équipe
  à s'engager au-delà du réaliste**.
- Deux approches : **en deux parties** (quoi puis comment) ou **en une partie** (sélection et
  acquisition de confiance entrelacées — « celle que je vois le plus souvent »).
- **Capacité** (fig 19.5) : sprint total − autres activités Scrum (planning/review/retro ≈ **un jour**
  sur dix + **jusqu'à 10 % de grooming**) − **engagements hors sprint** (support, maintenance, autre
  produit) − **congés** − **tampon de sprint**. « Dans une journée de 8 h, on n'a pas 8 h. »
  Deux unités possibles : **story points** (= prédire la vélocité ; méthode « météo d'hier » ajustée —
  exemple des deux semaines de Noël : 40 → 20) ou **heures d'effort** (tableau 19.2 détaillé par
  personne, résultat **140-197 h**, et l'avertissement : s'engager à 197 ne laisse **aucun tampon**).
- **« On ne commence pas ce qu'on ne peut pas finir »** : sinon découper, sinon prendre un autre
  élément. Laisser des éléments incomplets passer d'un sprint à l'autre **ne produit pas d'incrément
  potentiellement livrable**.
- **Acquérir la confiance** : la vélocité seule ne suffit pas (21 points < 25 prédits et pourtant
  infaisable) ; d'où la décomposition en tâches, **aucune tâche au-delà de 8 heures**, somme comparée
  à la capacité. Et le piège nommé : **la capacité d'une compétence** — « 150 h tiennent dans
  140-197 h, mais si Simon est le seul à faire l'IHM et n'a que 14-21 h, l'engagement est mauvais ».
  → TIZI : règle « engagement globalement tenable mais goulot de compétence unique ». Très fort, et
    mesurable dès qu'on connaît les compétences.
- Les tâches ne sont **pas** nominativement affectées au planning (ça réduirait la propriété
  collective) ; la sélection se fait **au fil du sprint, de façon opportuniste**.

## Ch20 Exécution du sprint (livre 347-361)
- Pas de plan de tâches complet à l'avance (« un Gantt de sprint serait faux peu après le départ »),
  mais **un peu** de planification pour exposer les dépendances (exemple : un test de 2 jours doit
  démarrer 2 jours avant la fin). Principe : **planification de tâches opportuniste**.
- **Travail parallèle et swarming** : trop d'éléments en parallèle = multitâche (démo chiffrée :
  lignes = 35 s avec erreurs, colonnes = 16 s) ; trop peu = sous-utilisation. **Le swarming n'est pas
  une stratégie pour occuper tout le monde à 100 %.**
  **Anti-pattern nommé : mini-waterfall dans le sprint** (fig 20.4) — tout analyser, tout concevoir,
  tout coder, tout tester → « 90 % de chaque feature, aucune à 100 % ».
  → TIZI : une itération dont toutes les stories démarrent au même moment et dont les tests sont tous
    en fin est un mini-waterfall. Détectable si les tâches portent un type et un ordre.
- Qui fait quoi : **pas de pensée par rôle** (« que feront nos testeurs en début de sprint ? » → en
  test-first, **les testeurs travaillent les premiers**).
- **Le sprint backlog accepte de nouvelles tâches à tout moment** — « ce n'est pas une porte dérobée
  pour introduire du nouveau travail », c'est reconnaître qu'on ne savait pas tout au planning.
- Communication : **task board** (to do / in progress / completed) ; **burndown de sprint**
  (heures d'effort **restantes**, par jour ; **on ne capture pas les heures consommées** — « aucun
  besoin en Scrum, sauf raisons comptables ou fiscales ») ; lignes de tendance → **early / on time /
  late** ; **burnup de sprint** (plutôt en story points, car « seul compte le travail de valeur
  terminé »), avec la courbe **« bad flow »** reconnaissable : tout démarré en même temps, tout fini
  tard. → TIZI : la courbe « bad flow » est un **diagnostic lisible** à partir des seules dates.

## Ch21 Sprint review (livre 363-373)
- Inspecte le **produit**. « Un regard transparent sur l'état du produit, **y compris les vérités
  dérangeantes**. »
- **4 sources de participants** (tableau 21.1) : équipe Scrum au complet, parties prenantes internes,
  **autres équipes internes (ventes, marketing, support, juridique, conformité)**, parties prenantes
  **externes** (au moins périodiquement, et on réfléchit à qui inviter — « on n'invite pas les
  concurrents du client pour qui on a développé ce sprint »).
- **5 préparatifs** (fig 21.2) : qui inviter · **planifier** (la plus difficile des 4 activités à
  caler ; astuce : fixer la review d'abord — « vendredi 14 h » — et caler le reste autour ;
  **timebox : une heure par semaine de sprint, max 4 h**) · **confirmer que le travail est fait** ·
  préparer la démo (**30 min à 1 h de préparation par semaine de sprint**, pas plus ; « si on me
  présente un PowerPoint au lieu du logiciel, je me demande s'ils ont vraiment fini ») ·
  **décider qui fait quoi** (tout le monde démontre à tour de rôle, pas toujours la même personne).
- **Seul le travail terminé est présenté.** Le PO décide avant, **pendant l'exécution** — et Rubin
  répond à l'objection inverse : le risque de changement de but existe mais « les bénéfices du retour
  rapide l'emportent largement », et un PO qui découvre à la review **découvre trop tard** ; en plus
  un PO qui rejette en pleine review donne l'image du vieux « eux contre nous ».
- Déroulé : **summarize** (but, éléments, incrément réel ; si l'écart existe, on l'explique —
  **environnement sans blâme**) · **demonstrate** (« ce n'est pas *la démo* : la démo est le moyen
  d'alimenter la conversation ») · **discuss** (pas de résolution de problème en profondeur) ·
  **adapt** (5 questions : ça plaît ? ils veulent des changements ? est-ce toujours une bonne idée sur
  le marché ? **manque-t-il une feature importante ?** **sur-investit-on une feature ?**).
  Sorties : **backlog groomé + plan de release mis à jour**.
- « Rien à démontrer » : si c'est du *glue code*, l'excuse est **presque toujours fausse** — le PO
  a dû comprendre la valeur et savoir constater le fait, la DoR exige de savoir **comment démontrer**,
  donc au minimum **les tests passants servent de démonstration**.
- 3 pathologies : **signatures** (la review n'est pas un événement d'approbation ; si une partie
  prenante senior conteste, **le verdict du PO tient** et le désaccord devient un **nouvel élément de
  backlog** + le PO cherche pourquoi il s'est déconnecté) · **présence sporadique** (cause fréquente :
  trop de travail concurrent → **arrêter les produits de moindre priorité**, « et si ce jour n'arrive
  jamais, ces produits ne valaient jamais la peine ») · **grands efforts** → **review conjointe**,
  ce qui exige que **l'intégration soit dans la DoD** de toutes les équipes.

## Ch22 Rétrospective (livre 375-393)
- Épigraphe d'Edward Bear (Winnie l'ourson) : « descendre l'escalier sur la tête, faute de s'arrêter
  un instant pour y penser ». Tout est examinable : processus, pratiques, communication,
  **environnement**, artefacts, outils.
- Participants : **toute l'équipe Scrum**, PO inclus — l'objection (« le PO inhibe la parole ») est
  traitée : s'il n'y a pas assez de **sécurité**, le PO n'assiste pas **jusqu'à ce que le SM ait rendu
  l'environnement sûr** ; mais sans le PO on ne peut pas réparer le flux d'exigences, **ni décider de
  la capacité à consacrer aux améliorations**. Extérieurs : **seulement sur invitation de l'équipe**.
- **4 préparatifs** (fig 22.3) : **définir le focus** (par défaut le sprint écoulé ; exemple d'une
  équipe mûre de 3 ans pour qui la rétro « devenait du processus pour le processus » → rétros plus
  courtes, très ciblées, **analyse de cause racine**) · choisir les exercices · **recueillir les
  données objectives** (« des faits, pas des opinions » : événements et leur date, **nombre d'éléments
  commencés et non finis**, burnup) · **structurer** (lieu, durée — « difficile de faire une vraie
  rétro en moins de 60 min » ; **~1 h 30 pour un sprint de 2 semaines** ; **facilitateur** : le SM, un
  membre, un externe neutre, ou **le SM d'une autre équipe**).
- Déroulé (fig 22.4) : **set the atmosphere** (sécurité, règles du jeu, **environnement sans blâme**,
  « amorcer la pompe de la participation ») · **share context** (fig 22.5 : aligner les perspectives
  individuelles sur **des faits** ; **event timeline** avec cartes de couleur, **emotions
  seismograph** tracé sous la frise pour corréler) · **identify insights** (regard **système**, pas
  local ; 3 questions ; **insight backlog** des rétros passées) · **determine actions**
  (**dot voting** ; « important » n'est pas « on a l'énergie pour » — et **l'énergie gagne** ;
  **revoir ce qu'il est advenu des actions de la rétro précédente avant d'en créer de nouvelles** ;
  toute action n'est pas une tâche ; certaines sont des **obstacles portés par le SM** ; parfois
  l'action juste est **d'explorer** parce qu'on ne comprend pas encore) · **close** (récapituler,
  **remercier**, et **inspecter la rétrospective elle-même**).
- **Follow through** : mettre les tâches d'amélioration **dans le sprint backlog avant les features**
  et **baisser la capacité en conséquence**. « Un *plan d'amélioration* séparé du travail du sprint
  sera toujours subordonné au plan de features. **Ne séparez pas : intégrez.** »
- **10 pathologies** (fig 22.12) : rétro non faite ou peu suivie · **all fluff, no stuff** ·
  **l'éléphant dans la pièce** (c'est un **problème de sécurité**, à traiter d'abord) · mauvais
  facilitateur · déprimante et épuisante · **jeu du blâme** (à éteindre immédiatement) · séance de
  plaintes (**inviter ceux qui peuvent changer les choses**) · **remplace l'amélioration ad hoc** ·
  **trop ambitieuse** · **aucun suivi** (« la plus grave : si on ne suit pas, ne perdons pas notre
  temps en rétro »).
  → TIZI : les 10 sont des **verdicts d'audit de rétrospective**, observables dans un compte rendu.

## Ch23 Le chemin (livre 395-399)
- **« Il n'y a pas de definition of done pour une adoption de Scrum. »** Pas de modèle de maturité.
  Cohn : « Agile n'est pas quelque chose qu'on devient, c'est quelque chose dont on devient plus. »
- **practice (pratique Scrum, obligatoire) ≠ approach (sa réalisation locale, « best practice »)**.
  Anecdote de l'élan en peluche de Vancouver, intransposable à l'équipe en Chine.
  → TIZI : distinction **centrale** pour un skill d'audit. On n'audite **jamais** une approche contre
    une autre approche ; on audite une approche **contre la pratique** qu'elle est censée réaliser,
    **dans son contexte**. C'est l'armature morale du skill d'audit.
- **ETC / Enterprise Transition Community** : un backlog d'améliorations organisationnelles traité
  **en sprints** (exemple : « réviser le modèle de rémunération pour qu'il soit tourné vers l'équipe »).
- « Get going » : ceux qui disent qu'on ne peut pas figer les exigences d'avance **mais attendent
  d'avoir réglé tous les détails de leur Scrum avant de démarrer**. Attente : **chaque sprint meilleur
  que le précédent**, rien de plus. Et : « Scrum rend visibles les dysfonctionnements ; **il ne dit pas
  comment les résoudre** ».

## Glossaire (livre 401-422) — définitions utiles comme vocabulaire d'audit
- **accuracy vs precision** : « octobre 2015 » est *exact* si ça sort en octobre ; « 7 octobre 2015 »
  est plus *précis*. Deux mots, deux mesures. → Tizi devrait nommer laquelle il contrôle.
- **assumption** : « une croyance présumée vraie **alors qu'aucun apprentissage validé ne l'établit** ».
  Opposé : **validated learning**. → c'est mot pour mot la distinction de Tizi entre constat et
  non-mesuré. À citer.
- **confidence threshold** = « la definition of done de l'envisioning ».
- **DEEP**, **INVEST** : les deux grilles nommées, l'une pour le backlog, l'autre pour la story.
- **innovation waste** : « l'opportunité perdue de créer une solution innovante. **Survient souvent
  quand une solution prescrite est fournie avec un élément de backlog.** »
  → règle : un PBI qui prescrit la solution produit du *gâchis d'innovation*. Nommable, mesurable.
- **principle of least astonishment** appliqué à la communication d'équipe.
- **technical stories** : « une story qui **ne délivre aucune valeur perçue par l'utilisateur final**
  mais délivre l'architecture ou l'infrastructure nécessaire à de la valeur future ».
- **MMF ⊂ MRF = must-have**, et **MVP** : « juste les features qui permettent de déployer, pas plus ».
- **risk** ⊂ **uncertainty** : « l'incertitude est plus large, elle inclut les risques (issues
  négatives) **et les opportunités** (positives) ». → Tizi parle-t-il d'opportunités, ou seulement de
  risques ? Trou probable.
- **variability** : « en production c'est toujours du gâchis ; **en développement produit, il en faut** ».
- **velocity** : « mesure l'**output** (la taille livrée), **pas l'outcome** (la valeur livrée) ».
- **waste** : « toute activité qui consomme des ressources et n'ajoute aucune valeur **pour le client** ».
- **rule** : « une règle peut être enfreinte quand la pragmatique de la situation l'exige ».
  → À inscrire dans le skill d'audit : un écart à une règle **n'est pas un défaut**, c'est une
    **question à poser**, et la réponse peut être « c'était justifié ».
