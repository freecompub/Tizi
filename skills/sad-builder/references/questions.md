# Poser une question

Une question mal posée ne se rattrape pas : la réponse obtenue ressemble à une décision, et elle est
enregistrée comme telle. Trois formes, selon ce qu'on cherche. Elles ne s'échangent pas.

| Situation | Forme de la question |
|---|---|
| **Choix fermés** : chemin, tri d'un défaut, sévérité, domaines de relecture, confirmation | Réponses proposées **et** réponse libre, avec une recommandation |
| **Arbitrages** : options d'un ADR, concepts, priorités concurrentes | Réponses proposées avec leurs conséquences, **sans** recommandation : elle préempterait le décideur désigné |
| **Élicitation** : le problème, le besoin, la façon de travailler | Question **ouverte**, sans réponse proposée : en proposer orienterait la personne interrogée |

## L'outil de l'hôte

Quand l'outil de questions de l'hôte est disponible — `askQuestions` dans VS Code, son équivalent dans
Claude Code — sers-t'en pour les deux premières formes : il rend les choix lisibles et la réponse
exploitable. Trois règles s'appliquent quel que soit l'outil.

- **Toujours un champ de réponse libre.** Une liste fermée force une réponse qui n'est peut-être pas la
  vraie. La réponse qui n'était pas dans la liste est souvent celle qui compte.
- **Le contexte avec la question.** Pourquoi elle se pose maintenant, et ce qui dépend de la réponse.
  Une question sans contexte se répond au hasard.
- **La conséquence de chaque choix**, en une ligne. « Chaîne complète » et « voie rapide » ne veulent
  rien dire pour qui n'a pas lu le SDLC ; « toutes les étapes, quelques jours » et « plan puis
  implémentation, dans la journée », si.

Pour l'élicitation, pas d'outil de choix : une question ouverte, puis le silence. `ask-five.mjs` dit
lesquelles poser maintenant ; là où le skill fournit `elicitation-patterns.md`, il dit comment faire
émerger le non-dit.

## Ce que la question ne fait jamais

- Elle ne recommande pas quand le décideur est désigné : tu prépares les options, il tranche.
- Elle ne vaut pas approbation. Une réponse à une question n'est pas une approbation enregistrée ;
  seule une approbation déclarée l'est.
- Elle ne se pose pas en rafale. Cinq au plus à la fois, les plus déterminantes d'abord.
