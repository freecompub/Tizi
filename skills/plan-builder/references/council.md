# Council de lentilles (planification)

Même protocole que pour les étapes précédentes : des lentilles indépendantes examinent le plan et renvoient des zones d'ombre candidates sous forme de questions, jamais des décisions.

## Mode

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `planification` | En Schedule, avant l'engagement | Stories trop grosses, dépendances oubliées, tâches mal affectées à des agents, mesures non planifiées, capacité irréaliste |

## Déroulé

1. Dossier construit depuis l'état et `refs.yaml` : stories (FR, préparation, règles, exemples), tâches (éléments, tailles, affectation, dépendances), itération ou file.
2. Invoque l'agent `plan-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille (`references/lenses.md`), en parallèle ; sans subagents, une par une en repartant du dossier seul, en prévenant que l'indépendance est moindre.
3. Arbitrage : fusionne, écarte le déjà couvert, type les questions (`references/shadow-zones.md`), 10 au plus.

   Cette liste se **trie**, elle ne se pose pas : l'utilisateur retient, reformule ou rejette, et les questions retenues deviennent des zones d'ombre. C'est ensuite `ask-five.mjs` qui dit lesquelles poser, deux ou trois à la fois. Dix questions posées d'un coup, c'est un formulaire : on obtient des réponses courtes aux faciles et rien aux autres.
4. Les questions retenues par l'utilisateur deviennent des zones d'ombre `origin: council:<lentille>` ; trace dans `council_runs`.
