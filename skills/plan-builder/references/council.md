# Council de lentilles (planification)

Même protocole que pour les étapes précédentes : des lentilles indépendantes examinent le plan et renvoient des zones d'ombre candidates sous forme de questions, jamais des décisions.

Le council **se lance**, il ne se propose pas : son moment est prescrit par la phase (`references/phase-schedule.md`, avant l'engagement). Une vérification qui cherche ce que l'agent a manqué ne peut pas dépendre de l'accord de cet agent. Ce qui se décide, c'est le sort des questions trouvées, pas la tenue du council. Le council est l'outil de l'agent, pas une étape du plan : il ne s'annonce pas davantage qu'il ne se demande.

## Mode

| Mode | Moment | Ce qu'on cherche |
|---|---|---|
| `planification` | En Schedule, avant l'engagement | Stories trop grosses, dépendances oubliées, tâches mal affectées à des agents, mesures non planifiées, capacité irréaliste |

## Déroulé

1. Dossier construit depuis l'état et `refs.yaml` : stories (FR, préparation, règles, exemples), tâches (éléments, tailles, affectation, dépendances), itération ou file.
2. Invoque l'agent `plan-lens-critic` comme sous-agent (Claude Code ou GitHub Copilot) une fois par lentille (`references/lenses.md`), en parallèle ; sans subagents, une par une en repartant du dossier seul, en prévenant que l'indépendance est moindre.
3. Arbitrage : fusionne, écarte le déjà couvert, type les questions (`references/shadow-zones.md`), **5 au plus**. Les lentilles transmettent tout ; réduire est ton travail d'orchestrateur. Chaque lentille rend le `target` de ses questions — l'élément visé — : c'est par lui que deux formulations différentes du même trou se reconnaissent, et une question qui ne désigne rien est à renvoyer plutôt qu'à deviner.

   Ces cinq questions **ne se trient pas avec l'utilisateur** : elles s'enregistrent, puis se posent comme les autres zones d'ombre, deux ou trois à la fois, classées par impact par `ask-five.mjs`. Trier une liste de questions est un travail de méthode, et tu as le dossier pour le faire — lui a son métier. Une question qui n'a pas d'objet se ferme en y répondant : `levée`, avec la raison dans ses mots.
4. **Enregistrement** : les questions retenues à l'arbitrage deviennent des zones d'ombre `origin: council:<lentille>`, avec leur `target` dans `related`. `blocking_guess` est une **indication**, pas la valeur : une zone née du council n'est bloquante que si tu peux dire pourquoi. **Tu ne nommes jamais le council dans ce que tu écris à l'utilisateur** — ni « council », ni « lentille », ni le mode : c'est ton outil, il en voit les questions, pas la machine. Une exception : quand une question met en cause quelque chose qu'il a **déjà validé**, montre-lui la contradiction et laisse-le trancher.
5. **Trace** dans `council_runs` : date, mode, lentilles, le nombre de questions renvoyées par les lentilles, et **les questions elles-mêmes** — retenues, écartées avec leur raison, et celles mises en réserve pour un prochain council. Trois compteurs ne se relisent pas : « 40 proposées, 39 écartées » ne dit pas si c'étaient des doublons, des solutions déguisées, ou de bonnes questions mal arbitrées, et les écartées disparaissent avec la session.
