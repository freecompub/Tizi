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

**Cinq au plus à la fois**, limite de l'outil ou non : c'est la règle de `ask-five.mjs`, qui classe les
zones d'ombre ouvertes par impact et n'en garde que cinq. Vingt questions d'un coup noient celles qui
comptent.

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

## Ce que la question ne fait jamais

- Elle ne recommande pas quand le décideur est désigné : tu prépares les options, il tranche.
- Elle ne vaut pas approbation. Une réponse à une question n'est pas une approbation enregistrée ;
  seule une approbation déclarée l'est.
- Pour l'élicitation, elle ne propose rien : une question ouverte, puis le silence. `ask-five.mjs` dit
  lesquelles poser maintenant ; là où le skill fournit `elicitation-patterns.md`, il dit comment faire
  émerger le non-dit.
