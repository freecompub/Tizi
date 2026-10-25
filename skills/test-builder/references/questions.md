# Poser une question

Une question mal posée ne se rattrape pas : la réponse obtenue ressemble à une décision, et elle est
enregistrée comme telle. Quand l'outil de questions de l'hôte est disponible, sers-t'en plutôt que de
poser la question en texte libre : les choix deviennent lisibles et la réponse exploitable. La forme
dépend de ce que tu cherches. Trois formes, qui ne s'échangent pas.

| Situation | Forme |
|---|---|
| **Choix fermés** : les six questions du chemin (`choose-path.mjs`), le tri d'un défaut (défaut, changement, question, doublon, non reproductible), la sévérité, les domaines de relecture, le sort d'une tâche non finie en sprint review, une confirmation | Réponses proposées **et toujours une réponse libre**, avec le contexte, les conséquences de chaque choix, et une recommandation quand elle est fondée |
| **Arbitrages** : options d'un ADR, concepts du PRD, conflit entre parties prenantes | Réponses proposées avec leurs conséquences, **sans recommandation** quand la décision revient au décideur désigné (`decision_rights`, arbitre) : la recommandation le préempterait |
| **Élicitation** : comprendre un problème, un besoin, une façon de travailler, une règle métier | **Question ouverte, sans réponse proposée.** Proposer des réponses orienterait la personne interrogée, comme une question suggestive en entretien |

## Les outils

| Hôte | Outil | Ce qu'il impose |
|---|---|---|
| Claude Code | `AskUserQuestion` | 1 à 4 questions par appel, 2 à 4 réponses proposées par question. La réponse libre (« Other ») est ajoutée par l'outil : ne l'écris pas comme une option. Plusieurs réponses à la fois sont possibles quand les choix ne s'excluent pas |
| VS Code (Copilot) | `vscode/askQuestions` | Accordé à tous les points d'entrée sauf `tizi-backlog`, qui n'applique qu'un plan déjà approuvé. Respecte ce que l'outil déclare ; en cas de doute, un appel par question |

**Les limites se respectent, elles ne se contournent pas en tronquant.** Découpe en plusieurs appels :
les six questions du chemin en demandent deux (quatre, puis deux), dans l'ordre, et la réponse à
chacune est conservée. Une question qu'on supprime pour tenir dans un appel est une réponse qu'on
invente.

## Combien à la fois

Deux nombres, et on les confond facilement — c'est ainsi qu'un agent finit par tout demander d'un coup.

| Nombre | Ce qu'il compte |
|---|---|
| **cinq** | Ce que `ask-five.mjs` **retient** : les zones d'ombre ouvertes les plus déterminantes, classées par impact. Une sélection, pas un message |
| **deux ou trois** | Ce qu'on **pose** par tour, dans l'ordre de la sélection, avant d'attendre les réponses et de les réécrire dans l'état |

Le plafond n'est jamais un quota : rien n'oblige à poser les cinq, ni à les poser d'un coup. Une seule
question qui ouvre une vraie conversation vaut mieux que cinq qui tiennent dans un message.

**Présenter une liste n'est pas poser des questions.** L'analyse croisée produit une table de constats :
c'est une liste à **trier**, et le tri s'enregistre par son script (`cross-merge.mjs`). Elle n'attend pas
de réponse sur le fond. Les questions, elles, viennent après, par `ask-five.mjs`, deux ou trois à la
fois. Confondre les deux actes est la façon la plus courante de noyer quelqu'un sous un formulaire.

**Une question ouverte se pose seule.** Trois questions ouvertes dans le même message reviennent à n'en
poser qu'une : la personne répond à celle qu'elle a comprise, souvent la dernière, et les deux autres
disparaissent sans que personne le remarque. Après la question, le silence — c'est lui qui fait venir
la précision, pas la relance.

Le fait que l'outil de l'hôte accepte quatre questions par appel ne change rien à cette règle : c'est
une limite technique, pas une invitation. Quatre choix fermés dans un appel, oui ; quatre questions
ouvertes, jamais.

## Un tour, une attente

Un message peut porter un rapport, une information et une demande. Si rien ne les distingue, la
personne ne sait pas ce qu'on attend d'elle — et elle répond « ok », ce qui s'enregistre comme un
accord sur tout ce que le message contenait.

**Le dialogue est le seul signal d'une demande.** Ce qui attend une réponse quitte le texte et passe
par l'outil de questions. Ce qui reste en texte n'attend rien : un point d'étape se lit, il ne se
valide pas. Pas de dialogue, pas de décision à prendre. Et donc **jamais de dialogue pour informer** :
un bouton « continuer » apprend à cliquer sans lire, et le jour où une vraie approbation arrive dans la
même boîte, elle se fait cliquer pareil. La seule exception est celle qui précède : une question
ouverte reste en texte, seule, **en dernier**, avec rien après elle.

**Une attente par tour — et c'est une décision, pas une question.** Un appel peut porter quatre choix
fermés s'ils appartiennent à la même décision : les six questions du chemin en sont une, les critères
d'acceptation d'une même exigence aussi. Deux reformulations de deux problèmes différents sont deux
décisions, donc deux tours. Le coût est en nombre de tours, et il est bon marché comparé à un « ok »
qui valide cinq choses que personne n'a lues.

**Une validation porte sur une affirmation à la fois.** « L'association communique par des groupes qui
exposent les numéros, mêlent des publics différents et sont à recréer chaque année — est-ce juste ? »
n'a pas de réponse : deux affirmations peuvent être vraies et la troisième fausse, et un « oui »
enregistre les trois comme confirmées. Découpe, ou fais valider une phrase à la fois.

**Une question restée sans réponse se repose seule.** Elle ne se rajoute pas à la pile du tour suivant :
si elle n'a pas été vue la première fois, c'est qu'elle était accompagnée.

## Quand l'outil n'existe pas

En mode non interactif (`claude -p`, agent cloud) ou dans un éditeur qui ne l'expose pas, la règle ne
change pas, seule la forme change : options **numérotées** dans le texte, chacune avec sa conséquence,
suivies d'une ligne « Autre : … ». Et tu attends la réponse — tu ne choisis pas à la place de
l'utilisateur au motif que l'outil manque.

## Trois règles, quel que soit l'outil

- **Toujours un champ de réponse libre.** Une liste fermée force une réponse qui n'est peut-être pas la
  vraie. La réponse qui n'était pas dans la liste est souvent celle qui compte.
- **Le contexte avec la question.** Pourquoi elle se pose maintenant, et ce qui dépend de la réponse.
  Une question sans contexte se répond au hasard.
- **La conséquence de chaque choix**, en une ligne. « Chaîne complète » et « voie rapide » ne veulent
  rien dire pour qui n'a pas lu le SDLC ; « toutes les étapes, quelques jours » et « plan puis
  implémentation, dans la journée », si.

## Après la réponse

- **Réécris-la dans l'état**, tout de suite, sans attendre la fin de la session.
- **Un choix fermé s'enregistre par son script** : `choose-path.mjs` pour le chemin,
  `defect.mjs --trier` pour un tri, `constitution.mjs --decider` pour un principe. L'agent n'écrit pas
  la décision à la main.
- **Aux six questions du chemin, une réponse incertaine vaut « oui ».** Le chemin ne se rétrécit pas ;
  il s'élargit (`--elargir`) quand une étape découvre ce qu'il fallait.

## Ce qui ne se demande pas

Une étape **prescrite** qui **n'engage à rien** se fait. La proposer ajoute un aller-retour et une
occasion de la perdre — et c'est ce qui arrive : sur le premier dossier réel, le council a été proposé
au lieu d'être lancé, et le principe candidat « proposé une fois, non demandé ».

| Étape | Pourquoi elle n'engage à rien |
|---|---|
| Le **council** (`references/council.md`) | Il ne produit que des questions candidates. Ce qui se décide, c'est leur sort, jamais sa tenue |
| Un **principe candidat** (`constitution.mjs --proposer`) | Il entre en `PC-xx`, en attente. Seul le responsable de la constitution l'accepte ou le refuse (`--decider`) |

Ce qui se demande, en revanche : tout ce qui écrit dans le dépôt **hors du dossier de l'initiative**.
Synchroniser les instructions du dépôt (`sync-agent-instructions.mjs`) en est une — elle modifie
`AGENTS.md` et `CLAUDE.md`, et un refus est une réponse légitime.

Et ne demande jamais l'autorisation de proposer. « Dis-moi si tu veux que je te le propose » fait deux
tours là où il en faut un : propose, l'autre dispose.

## Ce que la question ne fait jamais

- Elle ne recommande pas quand le décideur est désigné : tu prépares les options, il tranche.
- Elle ne vaut pas approbation. Une réponse à une question n'est pas une approbation enregistrée ;
  seule une approbation déclarée l'est.
- Pour l'élicitation, elle ne propose rien et ne vient pas accompagnée : une seule question ouverte,
  puis le silence. `ask-five.mjs` dit lesquelles poser maintenant ; là où le skill fournit
  `elicitation-patterns.md`, il dit comment faire émerger le non-dit.
