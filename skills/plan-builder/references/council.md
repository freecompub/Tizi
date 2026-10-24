# Council de lentilles (planification)

Même protocole que pour les étapes précédentes : des lentilles indépendantes examinent le plan et renvoient des zones d'ombre candidates sous forme de questions, jamais des décisions.

Le council **se lance**, il ne se propose pas : son moment est prescrit par la phase (`references/phase-schedule.md`, avant l'engagement). Une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council.

## Mode

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `planification` | En Schedule, avant l'engagement | Stories trop grosses, dépendances oubliées, tâches mal affectées à des agents, mesures non planifiées, capacité irréaliste |

## Déroulé

1. Dossier construit depuis l'état et `refs.yaml` : stories (FR, préparation, règles, exemples), tâches (éléments, tailles, affectation, dépendances), itération ou file.
2. Invoque l'agent `plan-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille (`references/lenses.md`), en parallèle ; sans subagents, une par une en repartant du dossier seul, en prévenant que l'indépendance est moindre.
3. Arbitrage : fusionne, écarte le déjà couvert, type les questions (`references/shadow-zones.md`), **5 au plus**. Les lentilles transmettent tout ; réduire est ton travail d'orchestrateur.

   Ces cinq questions se **trient** avant de se poser : l'utilisateur retient, reformule ou rejette, et ce qu'il retient devient une zone d'ombre. Les réponses viennent ensuite, deux ou trois à la fois. **Rien n'oblige à poser les cinq d'un coup**, ni même à les présenter en un bloc : cinq est un plafond de sélection, pas un lot à envoyer. Si l'une mérite une conversation à elle seule, prends-la seule et garde les autres pour la suite — elles sont enregistrées, elles ne se perdent pas. Cinq questions posées d'un coup, c'est un formulaire : on obtient des réponses courtes aux faciles, et rien aux autres.
4. Les questions retenues par l'utilisateur deviennent des zones d'ombre `origin: council:<lentille>` ; trace dans `council_runs`.
